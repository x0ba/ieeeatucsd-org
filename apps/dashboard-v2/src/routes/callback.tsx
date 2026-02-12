import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useRef } from "react";

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
  const { getIdTokenClaims } = useLogto();
  const upsertUser = useMutation(api.users.upsertFromAuth);
  const navigate = useNavigate();
  const upsertStarted = useRef(false);

  // Note: useHandleSignInCallback's callback is NOT async-aware (type is () => void).
  // The SDK calls callbackRef.current?.() without await.
  // We fire the upsert and navigate immediately — the upsert runs in the background.
  const { isLoading } = useHandleSignInCallback(() => {
    if (upsertStarted.current) return;
    upsertStarted.current = true;

    getIdTokenClaims?.()
      .then((claims) => {
        if (claims) {
          // Fire and forget — don't block navigation on upsert completion
          upsertUser({
            logtoId: claims.sub,
            email: (claims as any).email || "",
            name: (claims as any).name || claims.sub,
            avatar: (claims as any).picture,
            signInMethod: "logto",
          }).catch((err: unknown) => {
            console.error("Error upserting user after sign-in:", err);
          });
        }
      })
      .catch((err: unknown) => {
        console.error("Error getting ID token claims:", err);
      });

    navigate({ to: "/overview" });
  });

  if (isLoading) {
    return <CallbackLoading />;
  }

  return null;
}
