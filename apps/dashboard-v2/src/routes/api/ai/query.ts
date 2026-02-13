import { createFileRoute } from "@tanstack/react-router";
import { chatWithAI, chatWithAIStream, OfficerAccessError } from "@/server/ai";

async function handle({ request }: { request: Request }) {
	try {
		const { query, messages, logtoId, locale, stream } = await request.json();

		if (!query) {
			return new Response(JSON.stringify({ error: "Missing query" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!logtoId) {
			return new Response(JSON.stringify({ error: "Missing logtoId" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const wantsStream = Boolean(stream);
		const canStream = typeof ReadableStream !== "undefined";

		if (wantsStream && canStream) {
			const encoder = new TextEncoder();
			const responseStream = new ReadableStream({
				start: async (controller) => {
					try {
						for await (const event of chatWithAIStream({
							query,
							messages,
							logtoId,
							locale,
						})) {
							controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
						}
					} catch (error) {
						const message = error instanceof Error ? error.message : "Unknown";
						controller.enqueue(
							encoder.encode(
								`${JSON.stringify({ type: "error", error: message })}\n`,
							),
						);
					} finally {
						controller.close();
					}
				},
			});

			return new Response(responseStream, {
				status: 200,
				headers: {
					"Content-Type": "application/x-ndjson; charset=utf-8",
					"Cache-Control": "no-cache, no-transform",
					Connection: "keep-alive",
				},
			});
		}

		if (wantsStream && !canStream) {
			console.warn("AI query route: streaming unavailable in current runtime");
		}

		const result = await chatWithAI({
			query,
			messages,
			logtoId,
			locale,
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("AI query route failed:", error);

		if (error instanceof OfficerAccessError) {
			return new Response(
				JSON.stringify({
					error: "Officer access required",
					details: error.message,
				}),
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Query failed",
				details: error instanceof Error ? error.message : "Unknown",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

export const Route = createFileRoute("/api/ai/query")({
	server: {
		handlers: {
			POST: handle,
		},
	},
});
