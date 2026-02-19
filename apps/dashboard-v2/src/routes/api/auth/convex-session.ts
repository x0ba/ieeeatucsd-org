import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/server/auth";
import { createConvexSessionToken } from "@/server/convex-session";
import type { UserRole } from "@/types/roles";

async function handle({ request }: { request: Request }) {
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authResult = await requireApiAuth(request, { allowMissingBody: true });
    if (authResult instanceof Response) return authResult;

    const { logtoId, user } = authResult;
    const { token, payload } = createConvexSessionToken({
      sub: logtoId,
      role: user.role as UserRole | undefined,
    });

    return new Response(
      JSON.stringify({
        sessionToken: token,
        expiresAt: payload.exp * 1000,
        logtoId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const Route = createFileRoute("/api/auth/convex-session")({
  server: {
    handlers: {
      POST: handle,
    },
  },
});
