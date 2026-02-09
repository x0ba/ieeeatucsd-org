import { createFileRoute } from "@tanstack/react-router";
import { checkEmailExists } from "@/server/mxroute";

async function handle({ request }: { request: Request }) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing email" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await checkEmailExists(email);

    return new Response(JSON.stringify({ success: true, ...result }), {
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

export const Route = createFileRoute("/api/check-email-exists")({
  server: {
    handlers: {
      POST: handle,
    },
  },
});
