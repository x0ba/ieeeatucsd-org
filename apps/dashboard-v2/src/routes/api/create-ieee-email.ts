import { createFileRoute } from "@tanstack/react-router";
import { createIEEEEmail } from "@/server/mxroute";
import { requireApiAuth } from "@/server/auth";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

async function handle({ request }: { request: Request }) {
  try {
    const authResult = await requireApiAuth(request);
    if (authResult instanceof Response) return authResult;
    const { logtoId, body } = authResult;
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing username or password" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await createIEEEEmail({ username, password });

    // Update Convex user record with the new IEEE email
    if (result.success && result.ieeeEmail) {
      try {
        const convexUrl =
          process.env.CONVEX_URL ||
          process.env.VITE_CONVEX_URL ||
          (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
            .env?.VITE_CONVEX_URL;

        if (convexUrl) {
          const client = new ConvexHttpClient(convexUrl);
          const fn = "users:setIEEEEmail" as unknown as FunctionReference<"mutation">;
          await client.mutation(fn, { logtoId, ieeeEmail: result.ieeeEmail });
        }
      } catch (convexError) {
        console.error("Failed to update Convex user with IEEE email:", convexError);
        // Don't fail the request — the MXRoute account was created successfully
      }
    }

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
