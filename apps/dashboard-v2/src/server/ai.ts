import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
	TOOL_DEFINITIONS,
	executeToolCallsParallel,
	type ToolCallRequest,
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
	config: ReturnType<typeof getOpenRouterConfig>;
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
const MAX_TOOL_CALL_ROUNDS = 5;
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

function getOpenRouterConfig() {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

	return {
		apiKey,
		model: "x-ai/grok-4.1-fast",
		baseUrl: "https://openrouter.ai/api/v1/chat/completions",
	};
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
		`You are the IEEE at UC San Diego dashboard assistant.
You answer using only the provided Convex search results and user context.
Rules:
- Do not invent records or values.
- If data is missing, clearly say what you could and could not find.
- Do NOT reveal internal database IDs (user IDs, event IDs, record IDs, etc.) unless the user explicitly requests them.
- Format dates and times clearly and include at least one absolute date.
- Always present times in Pacific time (${params.timeZone}, PST/PDT), never UTC.
- Prefer concise markdown (headings, bullets, short tables) when it improves readability.
- Synthesize across all retrieval passes when multiple lookup queries were used.
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
	const config = getOpenRouterConfig();
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
	const { config, steps, conversationMessages, meta } =
		await buildContext(params);

	addStep(steps, "Generating answer with Grok (with tools)...");

	let messages: Array<Record<string, unknown>> = [...conversationMessages];
	let totalToolCalls = 0;

	for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round++) {
		const response = await fetch(config.baseUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "https://ieeeatucsd.org",
				"X-Title": "IEEE UCSD Officer Assistant",
			},
			body: JSON.stringify({
				model: config.model,
				messages,
				temperature: 0.1,
				reasoning: { effort: "high", exclude: false },
				tools: TOOL_DEFINITIONS,
				tool_choice: "auto",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("OpenRouter API Error:", errorText);
			throw new Error("AI Chat API Failed");
		}

		const data = await response.json();
		const choice = data.choices?.[0];
		const assistantMessage = choice?.message;

		if (!assistantMessage) throw new Error("No response from AI");

		const toolCalls = assistantMessage.tool_calls as ToolCallRequest[] | undefined;

		if (!toolCalls || toolCalls.length === 0) {
			const reply = assistantMessage.content;
			if (!reply) throw new Error("No response from AI");
			addStep(steps, `Response generated with model ${config.model} (${totalToolCalls} tool calls).`);
			meta.toolCallCount = totalToolCalls;
			return { success: true, reply, steps, meta };
		}

		messages.push(assistantMessage);
		totalToolCalls += toolCalls.length;
		addStep(steps, `Model requested ${toolCalls.length} tool call(s): ${toolCalls.map((tc) => tc.function.name).join(", ")}`);

		const results = await executeToolCallsParallel(toolCalls, params.logtoId);
		for (const result of results) {
			addStep(steps, `Tool ${result.name}: ${result.summary} (${result.durationMs}ms)`);
			messages.push({
				role: "tool",
				tool_call_id: result.id,
				content: JSON.stringify(result.result),
			});
		}
	}

	throw new Error("Max tool call rounds exceeded");
}

type StreamDelta = {
	content: string;
	reasoning: string;
	toolCalls: Array<{
		index: number;
		id?: string;
		type?: string;
		function?: { name?: string; arguments?: string };
	}>;
	finishReason: string | null;
};

function extractStreamDelta(payload: unknown): StreamDelta {
	const data = payload as {
		choices?: Array<{
			text?: string;
			finish_reason?: string | null;
			delta?: {
				content?: string | null;
				reasoning_content?: string | null;
				reasoning?: string | null;
				tool_calls?: Array<{
					index: number;
					id?: string;
					type?: string;
					function?: { name?: string; arguments?: string };
				}>;
			};
		}>;
	};

	const firstChoice = data.choices?.[0];
	const delta = firstChoice?.delta;

	let content = "";
	if (typeof firstChoice?.text === "string") content = firstChoice.text;
	else if (typeof delta?.content === "string") content = delta.content;

	let reasoning = "";
	if (typeof delta?.reasoning_content === "string") reasoning = delta.reasoning_content;
	else if (typeof delta?.reasoning === "string") reasoning = delta.reasoning;

	const toolCalls = delta?.tool_calls || [];
	const finishReason = firstChoice?.finish_reason || null;

	return { content, reasoning, toolCalls, finishReason };
}

async function* streamOpenRouterResponse(
	config: ReturnType<typeof getOpenRouterConfig>,
	messages: Array<Record<string, unknown>>,
	withTools: boolean,
): AsyncGenerator<{ type: "delta"; delta: StreamDelta } | { type: "line_raw"; line: string }> {
	const body: Record<string, unknown> = {
		model: config.model,
		messages,
		temperature: 0.1,
		reasoning: { effort: "high", exclude: false },
		stream: true,
	};
	if (withTools) {
		body.tools = TOOL_DEFINITIONS;
		body.tool_choice = "auto";
	}

	const response = await fetch(config.baseUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": "application/json",
			Accept: "text/event-stream",
			"HTTP-Referer": "https://ieeeatucsd.org",
			"X-Title": "IEEE UCSD Officer Assistant",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error("OpenRouter API Error:", errorText);
		throw new Error("AI Chat API Failed");
	}

	if (!response.body) {
		throw new Error("Streaming response not available");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let done = false;

	while (!done) {
		const result = await reader.read();
		done = result.done;
		if (result.value) {
			buffer += decoder.decode(result.value, { stream: true });
			let lineBreakIndex = buffer.indexOf("\n");
			while (lineBreakIndex >= 0) {
				const line = buffer.slice(0, lineBreakIndex).trim();
				buffer = buffer.slice(lineBreakIndex + 1);
				if (line.startsWith("data:")) {
					const payload = line.slice(5).trim();
					if (payload && payload !== "[DONE]") {
						try {
							const parsed = JSON.parse(payload);
							yield { type: "delta", delta: extractStreamDelta(parsed) };
						} catch {
							// Ignore malformed chunks
						}
					}
				}
				lineBreakIndex = buffer.indexOf("\n");
			}
		}
	}

	if (buffer.trim().startsWith("data:")) {
		const payload = buffer.trim().slice(5).trim();
		if (payload && payload !== "[DONE]") {
			try {
				const parsed = JSON.parse(payload);
				yield { type: "delta", delta: extractStreamDelta(parsed) };
			} catch {
				// Ignore
			}
		}
	}
}

export async function* chatWithAIStream(params: {
	logtoId: string;
	query: string;
	messages?: ChatMessage[];
	systemPrompt?: string;
	locale?: string;
}): AsyncGenerator<AIStreamEvent> {
	const streamedSteps: string[] = [];
	const config = getOpenRouterConfig();
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
		(message) => {
			streamedSteps.push(message);
		},
	);
	for (const step of gathered.steps) {
		yield { type: "status", message: step };
	}
	const searchResult = gathered.searchResult;

	const serverTime = formatTimestamp(
		searchResult.currentServerTimeMs,
		locale,
		timeZone,
	);
	const timeStep = `Resolved current time in Pacific time (${serverTime.timeZoneAbbr}, ${timeZone}).`;
	streamedSteps.push(timeStep);
	yield { type: "status", message: timeStep };

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

	const streamingStep = "Generating answer with Grok (with tools)...";
	streamedSteps.push(streamingStep);
	yield { type: "status", message: streamingStep };

	let allMessages: Array<Record<string, unknown>> = [...conversationMessages];
	let totalToolCalls = 0;
	let reply = "";

	for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round++) {
		let roundContent = "";
		let roundReasoning = "";
		let finishReason: string | null = null;
		const accumulatedToolCalls = new Map<
			number,
			{ id: string; type: string; function: { name: string; arguments: string } }
		>();

		for await (const event of streamOpenRouterResponse(config, allMessages, true)) {
			if (event.type === "delta") {
				const d = event.delta;

				if (d.reasoning) {
					roundReasoning += d.reasoning;
					yield { type: "reasoning", content: d.reasoning };
				}

				if (d.content) {
					roundContent += d.content;
					yield { type: "token", content: d.content };
				}

				for (const tc of d.toolCalls) {
					const existing = accumulatedToolCalls.get(tc.index);
					if (!existing) {
						accumulatedToolCalls.set(tc.index, {
							id: tc.id || "",
							type: tc.type || "function",
							function: {
								name: tc.function?.name || "",
								arguments: tc.function?.arguments || "",
							},
						});
					} else {
						if (tc.id) existing.id = tc.id;
						if (tc.function?.name) existing.function.name += tc.function.name;
						if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
					}
				}

				if (d.finishReason) {
					finishReason = d.finishReason;
				}
			}
		}

		if (finishReason === "tool_calls" && accumulatedToolCalls.size > 0) {
			const toolCallsList = Array.from(accumulatedToolCalls.values());
			totalToolCalls += toolCallsList.length;

			const toolStartInfo = toolCallsList.map((tc) => {
				let args: Record<string, unknown> = {};
				try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
				return { id: tc.id, name: tc.function.name, args };
			});

			yield { type: "tool_start", tools: toolStartInfo };

			const stepMsg = `Executing ${toolCallsList.length} tool(s): ${toolCallsList.map((tc) => tc.function.name).join(", ")}`;
			streamedSteps.push(stepMsg);
			yield { type: "status", message: stepMsg };

			const toolCallRequests: ToolCallRequest[] = toolCallsList.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.function.name, arguments: tc.function.arguments },
			}));

			const results = await executeToolCallsParallel(toolCallRequests, params.logtoId);

			allMessages.push({
				role: "assistant",
				content: roundContent || null,
				tool_calls: toolCallsList,
			});

			for (const result of results) {
				yield {
					type: "tool_result",
					id: result.id,
					name: result.name,
					summary: result.summary,
					durationMs: result.durationMs,
				};
				streamedSteps.push(`Tool ${result.name}: ${result.summary} (${result.durationMs}ms)`);
				allMessages.push({
					role: "tool",
					tool_call_id: result.id,
					content: JSON.stringify(result.result),
				});
			}

			yield { type: "status", message: "Continuing generation..." };
			streamedSteps.push("Continuing generation...");
			continue;
		}

		reply = roundContent;
		break;
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
