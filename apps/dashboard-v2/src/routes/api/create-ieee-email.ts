import { createFileRoute } from "@tanstack/react-router";
import { createIEEEEmail } from "@/server/mxroute";

async function handle({ request }: { request: Request }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing username or password" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await createIEEEEmail({ username, password });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/create-ieee-email")({
  server: {
    handlers: {
      POST: handle,
    },
  },
});
