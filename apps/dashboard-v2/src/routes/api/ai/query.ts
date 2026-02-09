import { createFileRoute } from "@tanstack/react-router";
import { chatWithAI } from "@/server/ai";

async function handle({ request }: { request: Request }) {
  try {
    const { query, messages } = await request.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing query" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await chatWithAI({ query, messages });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Query failed",
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
