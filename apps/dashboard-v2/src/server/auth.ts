import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

/**
 * Validates a logtoId by checking if the user exists in Convex.
 * Returns the user record if valid, null otherwise.
 */
export async function validateLogtoId(logtoId: string | undefined | null) {
  if (!logtoId || typeof logtoId !== "string" || logtoId.trim().length === 0) {
    return null;
  }

  const url =
    process.env.CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env?.VITE_CONVEX_URL;

  if (!url) return null;

  try {
    const client = new ConvexHttpClient(url);
    const fn = "users:getByLogtoId" as unknown as FunctionReference<"query">;
    const user = await client.query(fn, { logtoId });
    return user ?? null;
  } catch {
    return null;
  }
}

export function isAiEnabledForUser(
  user: { aiFeaturesEnabled?: boolean } | null | undefined,
) {
  return user?.aiFeaturesEnabled !== false;
}

export function createAiDisabledResponse() {
  return new Response(
    JSON.stringify({
      error: "AI features are disabled for this account",
      code: "AI_DISABLED_BY_USER",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Returns a 401 JSON Response if logtoId is missing or invalid.
 * Use at the top of API route handlers.
 */
export async function requireApiAuth(
  request: Request,
): Promise<{
  logtoId: string;
  body: Record<string, unknown>;
  user: { aiFeaturesEnabled?: boolean } & Record<string, unknown>;
} | Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const logtoId = body.logtoId as string | undefined;
  if (!logtoId) {
    return new Response(
      JSON.stringify({ error: "Authentication required: missing logtoId" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const user = await validateLogtoId(logtoId);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Authentication failed: invalid logtoId" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return {
    logtoId,
    body,
    user: user as { aiFeaturesEnabled?: boolean } & Record<string, unknown>,
  };
}
