import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function CallbackLoading({ label = "Signing you in..." }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CallbackClient() {
  const { getIdTokenClaims, getAccessToken } = useLogto();
  const upsertUser = useMutation(api.users.upsertFromAuth);
  const navigate = useNavigate();
  const upsertStarted = useRef(false);
  const [finalizeInProgress, setFinalizeInProgress] = useState(false);

  // Note: useHandleSignInCallback's callback is NOT async-aware (type is () => void).
  // useHandleSignInCallback's isLoading becomes false before our async finalize + navigate
  // finish — track finalizeInProgress so we never render an empty screen during that gap.
  const { isLoading } = useHandleSignInCallback(() => {
    if (upsertStarted.current) return;
    upsertStarted.current = true;
    setFinalizeInProgress(true);

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
      .then(async (targetRoute) => {
        await navigate({ to: targetRoute });
      })
      .catch((err: unknown) => {
        console.error("Error finalizing sign-in:", err);
        return navigate({ to: "/signin" });
      })
      .finally(() => {
        setFinalizeInProgress(false);
      });
  });

  // Logto finished without invoking the handler (bad state / direct /callback hit)
  useEffect(() => {
    if (isLoading || finalizeInProgress) return;
    if (upsertStarted.current) return;
    const id = window.setTimeout(() => {
      if (!upsertStarted.current) {
        void navigate({ to: "/signin" });
      }
    }, 4000);
    return () => window.clearTimeout(id);
  }, [isLoading, finalizeInProgress, navigate]);

  const label =
    isLoading && !upsertStarted.current
      ? "Signing you in..."
      : "Finishing sign in...";

  // Keep a visible shell until navigation unmounts us; never return null.
  if (isLoading || finalizeInProgress || upsertStarted.current) {
    return <CallbackLoading label={label} />;
  }

  return <CallbackLoading label="Finishing sign in..." />;
}
