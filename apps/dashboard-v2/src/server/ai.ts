import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
	createConvexToolsMcpServer,
	summarizeToolResult,
} from "./ai-tools";

type ChatMessage = { role: string; content: string };

type CurrentUserContext = {
	id: string;
	logtoId?: string;
	name: string;
	email: string;
	role: string;
	position?: string;
	team?: string;
	status: string;
	sponsorTier?: string;
	points: number;
	eventsAttended: number;
	joinDate: number;
	lastLogin?: number;
};

type SearchResultRow = {
	table: string;
	score: number;
	id: string;
	createdAt: number;
	snippet: string;
	record: unknown;
	sourceQuery?: string;
};

type ConvexSearchResult = {
	currentServerTimeMs: number;
	currentUser: CurrentUserContext;
	userRole: string;
	query: string;
	totalMatches: number;
	scannedTables: string[];
	scannedCountByTable: Record<string, number>;
	results: SearchResultRow[];
};

type TimeHint = {
	path: string;
	epochMs: number;
	local: string;
	short: string;
	timeZoneAbbr: string;
};

export type ChatMeta = {
	status: string;
	locale: string;
	timeZone: string;
	currentDateTime: string;
	currentUser: CurrentUserContext;
	totalMatches: number;
	scannedTables: number;
	toolCallCount?: number;
};

type BuiltContext = {
	config: ReturnType<typeof getAgentConfig>;
	steps: string[];
	conversationMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>;
	meta: ChatMeta;
};

type SearchBatch = {
	query: string;
	result: ConvexSearchResult;
};

export type AIStreamEvent =
	| { type: "status"; message: string }
	| { type: "reasoning"; content: string }
	| { type: "token"; content: string }
	| { type: "tool_start"; tools: Array<{ id: string; name: string; args: Record<string, unknown> }> }
	| { type: "tool_result"; id: string; name: string; summary: string; durationMs: number }
	| { type: "done"; reply: string; steps: string[]; meta: ChatMeta }
	| { type: "error"; error: string };

const MIN_EPOCH_MS = 946684800000; // 2000-01-01
const MAX_EPOCH_MS = 4102444800000; // 2100-01-01
const MAX_TIME_HINTS_PER_RECORD = 12;
const MAX_RESULTS_FOR_PROMPT = 40;
const MAX_AGENTIC_SEARCH_ROUNDS = 3;
const AGENTIC_MIN_UNIQUE_MATCHES = 12;
const AGENTIC_MIN_SCANNED_TABLES = 3;
const AGENTIC_MIN_QUERY_LENGTH = 4;
const DASHBOARD_TIME_ZONE = "America/Los_Angeles";
const FALLBACK_LOCALE = "en-US";
const TIMESTAMP_FIELD_REGEX =
	/(date|time|at|start|end|deadline|expire|created|updated|submitted|accepted|declined|verified|modified|purchase|login)/i;
const QUERY_STOP_WORDS = new Set([
	"about",
	"across",
	"after",
	"again",
	"also",
	"and",
	"any",
	"are",
	"been",
	"being",
	"between",
	"but",
	"can",
	"could",
	"did",
	"does",
	"for",
	"from",
	"have",
	"into",
	"just",
	"more",
	"most",
	"need",
	"our",
	"that",
	"the",
	"their",
	"them",
	"there",
	"these",
	"this",
	"those",
	"through",
	"what",
	"when",
	"where",
	"which",
	"with",
	"would",
	"you",
	"your",
]);

export class OfficerAccessError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OfficerAccessError";
	}
}

function addStep(
	steps: string[],
	message: string,
	onStep?: (message: string) => void,
) {
	steps.push(message);
	onStep?.(message);
}

function getConvexUrl() {
	const viteEnv = (
		import.meta as ImportMeta & { env?: Record<string, string | undefined> }
	).env;

	return (
		process.env.CONVEX_URL ||
		process.env.VITE_CONVEX_URL ||
		viteEnv?.VITE_CONVEX_URL
	);
}

export function resolveAgentConfig(env: NodeJS.ProcessEnv) {
	const openRouterApiKey = env.OPENROUTER_API_KEY;
	const anthropicAuthToken =
		env.ANTHROPIC_AUTH_TOKEN || openRouterApiKey;
	if (!anthropicAuthToken) {
		throw new Error("Missing ANTHROPIC_AUTH_TOKEN or OPENROUTER_API_KEY");
	}

	return {
		model: "x-ai/grok-4.1-fast",
		anthropicBaseUrl:
			env.ANTHROPIC_BASE_URL ||
			"https://openrouter.ai/api/anthropic",
		anthropicAuthToken,
		anthropicApiKey: env.ANTHROPIC_API_KEY || "openrouter",
	};
}

function getAgentConfig() {
	return resolveAgentConfig(process.env);
}

function getResolvedLocale(locale?: string) {
	if (!locale) return FALLBACK_LOCALE;
	try {
		new Intl.DateTimeFormat(locale).format(new Date());
		return locale;
	} catch {
		return FALLBACK_LOCALE;
	}
}

function getPacificTimeZone() {
	return DASHBOARD_TIME_ZONE;
}

function getTimeZoneAbbr(epochMs: number, locale: string, timeZone: string) {
	const parts = new Intl.DateTimeFormat(locale, {
		timeZone,
		timeZoneName: "short",
		hour: "numeric",
		minute: "2-digit",
	}).formatToParts(new Date(epochMs));

	return parts.find((part) => part.type === "timeZoneName")?.value || "PT";
}

function formatTimestamp(epochMs: number, locale: string, timeZone: string) {
	const date = new Date(epochMs);
	return {
		epochMs,
		local: new Intl.DateTimeFormat(locale, {
			dateStyle: "full",
			timeStyle: "long",
			timeZone,
		}).format(date),
		short: new Intl.DateTimeFormat(locale, {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone,
		}).format(date),
		timeZoneAbbr: getTimeZoneAbbr(epochMs, locale, timeZone),
	};
}

function isLikelyTimestampField(key: string, value: number) {
	if (!Number.isFinite(value) || value < MIN_EPOCH_MS || value > MAX_EPOCH_MS) {
		return false;
	}
	return TIMESTAMP_FIELD_REGEX.test(key);
}

function collectTimeHints(
	value: unknown,
	locale: string,
	timeZone: string,
	path = "",
	hints: TimeHint[] = [],
	depth = 0,
): TimeHint[] {
	if (
		hints.length >= MAX_TIME_HINTS_PER_RECORD ||
		value === null ||
		value === undefined
	) {
		return hints;
	}

	if (Array.isArray(value)) {
		if (depth >= 3) return hints;
		for (let i = 0; i < value.length; i += 1) {
			if (hints.length >= MAX_TIME_HINTS_PER_RECORD) break;
			const nextPath = path ? `${path}[${i}]` : `[${i}]`;
			collectTimeHints(value[i], locale, timeZone, nextPath, hints, depth + 1);
		}
		return hints;
	}

	if (typeof value === "object") {
		if (depth >= 3) return hints;
		for (const [key, item] of Object.entries(value)) {
			if (hints.length >= MAX_TIME_HINTS_PER_RECORD) break;
			const nextPath = path ? `${path}.${key}` : key;
			if (typeof item === "number" && isLikelyTimestampField(key, item)) {
				const formatted = formatTimestamp(item, locale, timeZone);
				hints.push({
					path: nextPath,
					epochMs: item,
					local: formatted.local,
					short: formatted.short,
					timeZoneAbbr: formatted.timeZoneAbbr,
				});
				continue;
			}
			collectTimeHints(item, locale, timeZone, nextPath, hints, depth + 1);
		}
	}

	return hints;
}

function normalizeQueryText(value: string) {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeQueryText(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(
			(token) =>
				token.length >= 3 &&
				!QUERY_STOP_WORDS.has(token) &&
				!/^\d+$/.test(token),
		);
}

function buildFollowupQueries(query: string, messages?: ChatMessage[]) {
	const candidates: string[] = [];
	const seen = new Set<string>([normalizeQueryText(query)]);

	const pushCandidate = (candidate: string) => {
		const normalized = normalizeQueryText(candidate);
		if (normalized.length < AGENTIC_MIN_QUERY_LENGTH || seen.has(normalized))
			return;
		seen.add(normalized);
		candidates.push(candidate.trim());
	};

	for (const part of query.split(/,|;|\band\b|\bor\b/gi)) {
		pushCandidate(part);
	}

	for (const match of query.matchAll(/"([^"]{3,120})"/g)) {
		pushCandidate(match[1]);
	}

	const tokens = tokenizeQueryText(query);
	if (tokens.length >= 2) {
		pushCandidate(tokens.slice(0, 2).join(" "));
	}
	for (const token of tokens.slice(0, 4)) {
		pushCandidate(token);
	}

	const recentUserMessages = (messages || [])
		.filter((message) => message.role === "user")
		.slice(-3)
		.map((message) => message.content);
	for (const previousUserMessage of recentUserMessages) {
		for (const part of previousUserMessage.split(/,|;|\band\b|\bor\b/gi)) {
			pushCandidate(part);
		}
	}

	return candidates.slice(0, 6);
}

function shouldExpandSearch(result: ConvexSearchResult, round: number) {
	if (round >= MAX_AGENTIC_SEARCH_ROUNDS) return false;
	if (result.totalMatches < AGENTIC_MIN_UNIQUE_MATCHES) return true;
	if (result.scannedTables.length < AGENTIC_MIN_SCANNED_TABLES) return true;
	return false;
}

function mergeSearchBatches(batches: SearchBatch[]): ConvexSearchResult {
	const first = batches[0]?.result;
	if (!first) {
		throw new Error("No search results available to merge");
	}

	const byRecordId = new Map<string, SearchResultRow>();
	const scannedTables = new Set<string>();
	const scannedCountByTable: Record<string, number> = {};
	let currentServerTimeMs = first.currentServerTimeMs;

	for (const batch of batches) {
		const { result, query } = batch;
		currentServerTimeMs = Math.max(
			currentServerTimeMs,
			result.currentServerTimeMs,
		);

		for (const table of result.scannedTables) {
			scannedTables.add(table);
		}

		for (const [table, count] of Object.entries(result.scannedCountByTable)) {
			const previous = scannedCountByTable[table] || 0;
			scannedCountByTable[table] = Math.max(previous, count);
		}

		for (const row of result.results) {
			const key = `${row.table}:${row.id}`;
			const enriched: SearchResultRow = { ...row, sourceQuery: query };
			const existing = byRecordId.get(key);
			if (!existing || enriched.score > existing.score) {
				byRecordId.set(key, enriched);
			}
		}
	}

	const mergedResults = Array.from(byRecordId.values()).sort(
		(a, b) => b.score - a.score,
	);
	const totalMatches = mergedResults.length;

	return {
		currentServerTimeMs,
		currentUser: first.currentUser,
		userRole: first.userRole,
		query: first.query,
		totalMatches,
		scannedTables: Array.from(scannedTables).sort(),
		scannedCountByTable,
		results: mergedResults.slice(0, MAX_RESULTS_FOR_PROMPT),
	};
}

async function gatherAgenticSearch(
	params: {
		logtoId: string;
		query: string;
		messages?: ChatMessage[];
	},
	onStep?: (message: string) => void,
) {
	const steps: string[] = [];
	const batches: SearchBatch[] = [];

	addStep(steps, "Loading Convex context for current officer...", onStep);
	const primary = await searchConvexData(params.logtoId, params.query);
	batches.push({ query: params.query, result: primary });

	let merged = mergeSearchBatches(batches);
	addStep(
		steps,
		`Primary lookup found ${merged.totalMatches} unique matches across ${merged.scannedTables.length} tables.`,
		onStep,
	);

	const followups = buildFollowupQueries(params.query, params.messages);
	for (const followup of followups) {
		if (!shouldExpandSearch(merged, batches.length)) {
			break;
		}

		addStep(steps, `Running follow-up lookup: "${followup}"...`, onStep);
		const result = await searchConvexData(params.logtoId, followup);
		batches.push({ query: followup, result });
		merged = mergeSearchBatches(batches);
		addStep(
			steps,
			`Expanded context to ${merged.totalMatches} unique matches across ${merged.scannedTables.length} tables.`,
			onStep,
		);
	}

	return {
		searchResult: merged,
		executedQueries: batches.map((batch) => batch.query),
		steps,
	};
}

function buildConversationPayload(params: {
	query: string;
	messages?: ChatMessage[];
	systemPrompt?: string;
	locale: string;
	timeZone: string;
	requestTime: ReturnType<typeof formatTimestamp>;
	searchResult: ConvexSearchResult;
	serverTime: ReturnType<typeof formatTimestamp>;
	executedQueries: string[];
}) {
	const resultsWithTimeHints = params.searchResult.results.map((result) => ({
		...result,
		timeHints: collectTimeHints(result.record, params.locale, params.timeZone),
	}));

	const systemPrompt =
		params.systemPrompt ||
		`You are the IEEE at UC San Diego dashboard assistant. You are fully autonomous like Kilo Code - you execute tool calls automatically and provide direct results.

BEHAVIOR:
- NEVER ask clarifying questions or follow-up questions. EVER.
- Execute tool calls immediately to get any information needed.
- Use multiple tools in parallel when helpful.
- Provide direct, actionable answers based on tool results.

TOOL USAGE STRATEGY:
- For general queries: start with search_data to find relevant records
- For specific entities: use get_record with IDs found in search
- For summaries: use get_statistics for counts and totals
- For financial questions: use get_budget_overview
- For people: use get_user_info
- Execute multiple tool calls in parallel when possible

RULES:
- Do not invent records or values.
- If data is missing, clearly state what you could and could not find.
- Do NOT reveal internal database IDs unless explicitly requested.
- Format dates and times clearly and include at least one absolute date.
- Always present times in Pacific time (${params.timeZone}, PST/PDT), never UTC.
- Prefer concise markdown (headings, bullets, short tables).
- Keep responses concise and actionable.

Current Date/Time (${params.timeZone}, ${params.requestTime.timeZoneAbbr}): ${params.requestTime.local}`;

	const contextPayload = {
		retrieval: {
			mode: "agentic-multi-pass",
			executedQueries: params.executedQueries,
			queryCount: params.executedQueries.length,
			usedFollowupSearches: params.executedQueries.length > 1,
		},
		currentDateTime: {
			locale: params.locale,
			timeZone: params.timeZone,
			requestTime: params.requestTime,
			convexServerTime: params.serverTime,
		},
		currentUser: params.searchResult.currentUser,
		userRole: params.searchResult.userRole,
		query: params.searchResult.query,
		totalMatches: params.searchResult.totalMatches,
		scannedTables: params.searchResult.scannedTables,
		scannedCountByTable: params.searchResult.scannedCountByTable,
		results: resultsWithTimeHints,
	};

	const conversationMessages = [
		{ role: "system", content: systemPrompt },
		{
			role: "system",
			content: `Convex context JSON:\n${JSON.stringify(contextPayload)}`,
		},
		...(params.messages || [])
			.map((m) => ({ role: m.role, content: m.content }))
			.slice(-8),
		{ role: "user", content: params.query },
	];

	const meta: ChatMeta = {
		status: "completed",
		locale: params.locale,
		timeZone: params.timeZone,
		currentDateTime: params.requestTime.local,
		currentUser: params.searchResult.currentUser,
		totalMatches: params.searchResult.totalMatches,
		scannedTables: params.searchResult.scannedTables.length,
	};

	return {
		conversationMessages,
		meta,
	};
}

async function searchConvexData(logtoId: string, query: string) {
	const convexUrl = getConvexUrl();
	if (!convexUrl) {
		throw new Error("Missing CONVEX_URL or VITE_CONVEX_URL");
	}

	const convex = new ConvexHttpClient(convexUrl);
	const aiSearchFunction =
		"ai:searchEverything" as unknown as FunctionReference<"query">;

	try {
		const result = await convex.query(aiSearchFunction, {
			logtoId,
			query,
			limit: 25,
		});
		return result as ConvexSearchResult;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			message.toLowerCase().includes("officer access required") ||
			message.toLowerCase().includes("user not found")
		) {
			throw new OfficerAccessError(message);
		}
		throw error;
	}
}

async function buildContext(
	params: {
		logtoId: string;
		query: string;
		messages?: ChatMessage[];
		systemPrompt?: string;
		locale?: string;
	},
	onStep?: (message: string) => void,
): Promise<BuiltContext> {
	const config = getAgentConfig();
	const steps: string[] = [];

	const locale = getResolvedLocale(params.locale);
	const timeZone = getPacificTimeZone();
	const requestNow = Date.now();
	const requestTime = formatTimestamp(requestNow, locale, timeZone);

	const gathered = await gatherAgenticSearch(
		{
			logtoId: params.logtoId,
			query: params.query,
			messages: params.messages,
		},
		onStep,
	);
	const searchResult = gathered.searchResult;
	for (const step of gathered.steps) {
		if (!steps.includes(step)) {
			steps.push(step);
		}
	}

	const serverTime = formatTimestamp(
		searchResult.currentServerTimeMs,
		locale,
		timeZone,
	);
	addStep(
		steps,
		`Resolved current time in Pacific time (${serverTime.timeZoneAbbr}, ${timeZone}).`,
		onStep,
	);

	const { conversationMessages, meta } = buildConversationPayload({
		query: params.query,
		messages: params.messages,
		systemPrompt: params.systemPrompt,
		locale,
		timeZone,
		requestTime,
		searchResult,
		serverTime,
		executedQueries: gathered.executedQueries,
	});

	return {
		config,
		steps,
		conversationMessages,
		meta,
	};
}

export async function chatWithAI(params: {
	logtoId: string;
	query: string;
	messages?: ChatMessage[];
	systemPrompt?: string;
	locale?: string;
}) {
	let reply = "";
	let steps: string[] = [];
	let meta: ChatMeta | null = null;

	for await (const event of chatWithAIStream(params)) {
		if (event.type === "token") reply += event.content;
		if (event.type === "done") {
			reply = event.reply || reply;
			steps = event.steps;
			meta = event.meta;
		}
		if (event.type === "error") throw new Error(event.error);
	}

	if (!meta) {
		throw new Error("No response from AI");
	}

	return { success: true, reply, steps, meta };
}

function buildAgentPrompt(
	conversationMessages: Array<{ role: string; content: string }>,
) {
	const systemMessages = conversationMessages.filter((m) => m.role === "system");
	const nonSystemMessages = conversationMessages.filter((m) => m.role !== "system");
	const latestUser = nonSystemMessages[nonSystemMessages.length - 1]?.content || "";
	const history = nonSystemMessages.slice(0, -1);

	const historyText =
		history.length > 0
			? history
					.map((message) =>
						`${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`,
					)
					.join("\n\n")
			: "No previous conversation history.";

	return {
		systemPrompt: systemMessages.map((message) => message.content).join("\n\n"),
		prompt: `Conversation history:\n${historyText}\n\nCurrent user request:\n${latestUser}`,
	};
}

function extractStreamText(message: SDKMessage) {
	if (message.type !== "stream_event") return "";
	const event = message.event as {
		type?: string;
		delta?: { type?: string; text?: string };
	};
	if (event.type !== "content_block_delta") return "";
	if (event.delta?.type !== "text_delta") return "";
	return event.delta.text || "";
}

function extractStreamReasoning(message: SDKMessage) {
	if (message.type !== "stream_event") return "";
	const event = message.event as {
		type?: string;
		delta?: { type?: string; thinking?: string };
	};
	if (event.type !== "content_block_delta") return "";
	if (event.delta?.type !== "thinking_delta") return "";
	return event.delta.thinking || "";
}

function extractAssistantText(message: SDKMessage) {
	if (message.type !== "assistant") return "";
	const content = message.message.content || [];
	const textBlocks = content
		.filter((block): block is { type: "text"; text: string } => block.type === "text")
		.map((block) => block.text);
	return textBlocks.join("");
}

function extractAssistantToolStarts(message: SDKMessage) {
	if (message.type !== "assistant") return [];
	const content = message.message.content || [];
	return content
		.filter(
			(
				block,
			): block is {
				type: "tool_use";
				id: string;
				name: string;
				input: Record<string, unknown>;
			} => block.type === "tool_use",
		)
		.map((block) => ({
			id: block.id,
			name: block.name,
			args: (block.input || {}) as Record<string, unknown>,
		}));
}

function parseToolResultPayload(value: unknown) {
	if (
		value &&
		typeof value === "object" &&
		"content" in value &&
		Array.isArray((value as { content?: unknown[] }).content)
	) {
		const first = (value as { content: Array<{ type?: string; text?: string }> })
			.content[0];
		if (first?.type === "text" && typeof first.text === "string") {
			try {
				return JSON.parse(first.text) as unknown;
			} catch {
				return { value: first.text };
			}
		}
	}
	return value;
}

export async function* chatWithAIStream(params: {
	logtoId: string;
	query: string;
	messages?: ChatMessage[];
	systemPrompt?: string;
	locale?: string;
}): AsyncGenerator<AIStreamEvent> {
	const { config, steps: streamedSteps, conversationMessages, meta } =
		await buildContext(params);
	for (const step of streamedSteps) {
		yield { type: "status", message: step };
	}
	const streamingStep = "Generating AI response...";
	streamedSteps.push(streamingStep);
	yield { type: "status", message: streamingStep };

	const composed = buildAgentPrompt(
		conversationMessages.map((message) => ({
			role: message.role,
			content: message.content,
		})),
	);
	const mcpServer = createConvexToolsMcpServer(params.logtoId);
	const toolStarts = new Map<
		string,
		{ name: string; args: Record<string, unknown>; startedAtMs: number; completed: boolean }
	>();
	let reply = "";
	let totalToolCalls = 0;
	let sawStreamText = false;

	const agentQuery = query({
		prompt: composed.prompt,
		options: {
			cwd: process.cwd(),
			model: config.model,
			systemPrompt: composed.systemPrompt,
			includePartialMessages: true,
			permissionMode: "dontAsk",
			tools: [],
			settingSources: [],
			mcpServers: {
				ieee_convex_tools: mcpServer,
			},
			env: {
				...process.env,
				ANTHROPIC_BASE_URL: config.anthropicBaseUrl,
				ANTHROPIC_AUTH_TOKEN: config.anthropicAuthToken,
				ANTHROPIC_API_KEY: config.anthropicApiKey,
				OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
			},
		},
	});

	try {
		for await (const sdkMessage of agentQuery) {
			const reasoningDelta = extractStreamReasoning(sdkMessage);
			if (reasoningDelta) {
				yield { type: "reasoning", content: reasoningDelta };
			}

			const streamDelta = extractStreamText(sdkMessage);
			if (streamDelta) {
				sawStreamText = true;
				reply += streamDelta;
				yield { type: "token", content: streamDelta };
			}

			const toolStartList = extractAssistantToolStarts(sdkMessage);
			if (toolStartList.length > 0) {
				totalToolCalls += toolStartList.length;
				for (const toolStart of toolStartList) {
					toolStarts.set(toolStart.id, {
						name: toolStart.name,
						args: toolStart.args,
						startedAtMs: Date.now(),
						completed: false,
					});
				}
				yield { type: "tool_start", tools: toolStartList };
				const stepMsg = `Executing ${toolStartList.length} tool(s): ${toolStartList.map((toolStart) => toolStart.name).join(", ")}`;
				streamedSteps.push(stepMsg);
				yield { type: "status", message: stepMsg };
			}

			if (
				sdkMessage.type === "user" &&
				sdkMessage.isSynthetic &&
				sdkMessage.parent_tool_use_id
			) {
				const toolUseId = sdkMessage.parent_tool_use_id;
				const started = toolStarts.get(toolUseId);
				if (started && !started.completed) {
					const resultPayload = parseToolResultPayload(
						sdkMessage.tool_use_result,
					);
					const summary = summarizeToolResult(started.name, resultPayload);
					const durationMs = Math.max(Date.now() - started.startedAtMs, 1);
					started.completed = true;
					yield {
						type: "tool_result",
						id: toolUseId,
						name: started.name,
						summary,
						durationMs,
					};
					streamedSteps.push(
						`Tool ${started.name}: ${summary} (${durationMs}ms)`,
					);
					yield { type: "status", message: "Continuing generation..." };
				}
			}

			if (sdkMessage.type === "assistant" && !sawStreamText) {
				const assistantText = extractAssistantText(sdkMessage);
				if (assistantText) {
					reply += assistantText;
					yield { type: "token", content: assistantText };
				}
			}

			if (sdkMessage.type === "result") {
				if (sdkMessage.subtype === "success" && sdkMessage.result) {
					reply = sdkMessage.result;
				}
				if (sdkMessage.is_error) {
					throw new Error(
						`Agent execution failed: ${sdkMessage.subtype}`,
					);
				}
			}
		}
	} finally {
		agentQuery.close();
	}

	const doneStep = `Response generated with model ${config.model} (${totalToolCalls} tool calls).`;
	streamedSteps.push(doneStep);
	yield { type: "status", message: doneStep };

	meta.toolCallCount = totalToolCalls;
	yield {
		type: "done",
		reply,
		steps: streamedSteps,
		meta,
	};
}
