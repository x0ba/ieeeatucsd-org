import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

export type ToolDefinition = {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
};

export type ToolCallRequest = {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
};

export type ToolCallResult = {
	id: string;
	name: string;
	result: unknown;
	summary: string;
	durationMs: number;
};

const ALL_TABLE_NAMES = [
	"users",
	"publicProfiles",
	"events",
	"attendees",
	"eventRequests",
	"reimbursements",
	"links",
	"constitutions",
	"constitutionAuditLogs",
	"officerInvitations",
	"sponsorDomains",
	"fundRequests",
	"fundDeposits",
	"logs",
	"organizationSettings",
	"emailTemplates",
	"notifications",
	"googleGroupAssignments",
	"directOnboardings",
	"invites",
	"budgetConfigs",
	"budgetAdjustments",
];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		type: "function",
		function: {
			name: "search_data",
			description:
				"Full-text search across all Convex database tables or a specific table. Returns matching records ranked by relevance. Use this for broad keyword searches.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Search query text (keywords, names, etc.)",
					},
					table: {
						type: "string",
						description: `Optional: limit search to a specific table. Available tables: ${ALL_TABLE_NAMES.join(", ")}`,
					},
					limit: {
						type: "number",
						description:
							"Max results to return (1-60, default 25)",
					},
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_record",
			description:
				"Fetch a specific record by its Convex document ID and table name. Use when you already know the exact record ID.",
			parameters: {
				type: "object",
				properties: {
					table: {
						type: "string",
						description: `Table name. One of: ${ALL_TABLE_NAMES.join(", ")}`,
					},
					recordId: {
						type: "string",
						description: "The Convex document ID (e.g., 'k57abc123...')",
					},
				},
				required: ["table", "recordId"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "list_records",
			description:
				"List records from a specific table with optional status filter. Good for getting all records of a certain type or status.",
			parameters: {
				type: "object",
				properties: {
					table: {
						type: "string",
						description: `Table name. One of: ${ALL_TABLE_NAMES.join(", ")}`,
					},
					status: {
						type: "string",
						description:
							"Optional status filter (e.g., 'approved', 'pending', 'submitted', 'active')",
					},
					limit: {
						type: "number",
						description: "Max records to return (1-100, default 25)",
					},
				},
				required: ["table"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_statistics",
			description:
				"Get aggregate statistics for a table: total count, status breakdown, and total amounts (for financial tables). Use for summary/overview questions.",
			parameters: {
				type: "object",
				properties: {
					table: {
						type: "string",
						description: `Table name. One of: ${ALL_TABLE_NAMES.join(", ")}`,
					},
				},
				required: ["table"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_user_info",
			description:
				"Look up users by name or email address. Returns matching user records with their roles, points, and status.",
			parameters: {
				type: "object",
				properties: {
					searchTerm: {
						type: "string",
						description:
							"Name or email to search for (partial matches supported)",
					},
				},
				required: ["searchTerm"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_budget_overview",
			description:
				"Get a comprehensive budget overview including total budgets, adjustments, approved fund requests, verified deposits, and remaining balances per department.",
			parameters: {
				type: "object",
				properties: {
					department: {
						type: "string",
						description:
							"Optional: filter to a specific department (events, projects, internal, other)",
					},
				},
				required: [],
			},
		},
	},
];

function getConvexClient(): ConvexHttpClient {
	const viteEnv = (
		import.meta as ImportMeta & { env?: Record<string, string | undefined> }
	).env;
	const url =
		process.env.CONVEX_URL ||
		process.env.VITE_CONVEX_URL ||
		viteEnv?.VITE_CONVEX_URL;
	if (!url) throw new Error("Missing CONVEX_URL or VITE_CONVEX_URL");
	return new ConvexHttpClient(url);
}

function summarizeResult(name: string, result: unknown): string {
	if (!result || typeof result !== "object") return `${name}: no data`;
	const r = result as Record<string, unknown>;

	if (r.error) return `${name}: error - ${r.error}`;

	switch (name) {
		case "search_data": {
			const count = r.totalMatches ?? 0;
			const tables = Array.isArray(r.scannedTables)
				? r.scannedTables.length
				: 0;
			return `Found ${count} matches across ${tables} tables`;
		}
		case "get_record":
			return r.record ? "Record found" : "Record not found";
		case "list_records": {
			const total = r.total ?? 0;
			return `Listed ${total} records`;
		}
		case "get_statistics": {
			const table = r.table || "unknown";
			const count = r.totalCount ?? 0;
			return `${table}: ${count} total records`;
		}
		case "get_user_info": {
			const users = Array.isArray(r.users) ? r.users.length : 0;
			return `Found ${users} matching users`;
		}
		case "get_budget_overview": {
			const depts = Array.isArray(r.departments) ? r.departments.length : 0;
			return `Budget overview for ${depts} departments`;
		}
		default:
			return `${name}: completed`;
	}
}

export async function executeToolCall(
	toolCall: ToolCallRequest,
	logtoId: string,
): Promise<ToolCallResult> {
	const start = Date.now();
	const name = toolCall.function.name;

	let args: Record<string, unknown>;
	try {
		args = JSON.parse(toolCall.function.arguments);
	} catch {
		return {
			id: toolCall.id,
			name,
			result: { error: "Invalid JSON arguments" },
			summary: `${name}: invalid arguments`,
			durationMs: Date.now() - start,
		};
	}

	const convex = getConvexClient();
	let result: unknown;

	try {
		switch (name) {
			case "search_data": {
				const fn =
					"ai:searchEverything" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					query: String(args.query || ""),
					limit: args.limit ? Number(args.limit) : 25,
					table: args.table ? String(args.table) : undefined,
				});
				break;
			}
			case "get_record": {
				const fn =
					"ai:getRecordById" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					table: String(args.table || ""),
					recordId: String(args.recordId || ""),
				});
				break;
			}
			case "list_records": {
				const fn =
					"ai:listRecords" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					table: String(args.table || ""),
					status: args.status ? String(args.status) : undefined,
					limit: args.limit ? Number(args.limit) : undefined,
				});
				break;
			}
			case "get_statistics": {
				const fn =
					"ai:getStatistics" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					table: String(args.table || ""),
				});
				break;
			}
			case "get_user_info": {
				const fn =
					"ai:getUserByNameOrEmail" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					searchTerm: String(args.searchTerm || ""),
				});
				break;
			}
			case "get_budget_overview": {
				const fn =
					"ai:getBudgetOverview" as unknown as FunctionReference<"query">;
				result = await convex.query(fn, {
					logtoId,
					department: args.department
						? String(args.department)
						: undefined,
				});
				break;
			}
			default:
				result = { error: `Unknown tool: ${name}` };
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		result = { error: message };
	}

	return {
		id: toolCall.id,
		name,
		result,
		summary: summarizeResult(name, result),
		durationMs: Date.now() - start,
	};
}

export async function executeToolCallsParallel(
	toolCalls: ToolCallRequest[],
	logtoId: string,
): Promise<ToolCallResult[]> {
	return Promise.all(
		toolCalls.map((tc) => executeToolCall(tc, logtoId)),
	);
}
