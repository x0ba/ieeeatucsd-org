import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { finalizeSignInAndGetRedirect } from "@/lib/auth/callbackFlow";

export const Route = createFileRoute("/callback")({
  component: CallbackPage,
});

const isServer = typeof window === "undefined";

function CallbackPage() {
  // During SSR, Logto hooks are unavailable. Show a loading spinner
  // and let the client handle the actual callback processing.
  if (isServer) {
    return <CallbackLoading />;
  }

  return <CallbackClient />;
}

function CallbackLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

function CallbackClient() {
  const { getIdTokenClaims, getAccessToken } = useLogto();
  const upsertUser = useMutation(api.users.upsertFromAuth);
  const navigate = useNavigate();
  const upsertStarted = useRef(false);

  // Note: useHandleSignInCallback's callback is NOT async-aware (type is () => void).
  // Use an internal async function and manage navigation ourselves.
  const { isLoading } = useHandleSignInCallback(() => {
    if (upsertStarted.current) return;
    upsertStarted.current = true;

    void finalizeSignInAndGetRedirect({
      getIdTokenClaims: getIdTokenClaims as any,
      getAccessToken: getAccessToken as any,
      createSession: async (accessToken: string) => {
        const sessionResponse = await fetch("/api/auth/convex-session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (!sessionResponse.ok) {
          throw new Error(`Failed to create Convex session (${sessionResponse.status})`);
        }
        return (await sessionResponse.json()) as { sessionToken: string };
      },
      upsertUser,
    })
      .then((targetRoute) => {
        navigate({ to: targetRoute });
      })
      .catch((err: unknown) => {
      console.error("Error finalizing sign-in:", err);
      navigate({ to: "/signin" });
    });
  });

  if (isLoading) {
    return <CallbackLoading />;
  }

  return null;
}
