import React, { useState, useEffect } from "react";
import { Skeleton } from "@heroui/react";
import CircuitBackground from "./CircuitBackground";
import BlueIEEELogo from "./BlueIEEELogo";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const SignInButtonSkeleton = () => (
  <div className="w-full">
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
);

export default function SignInContent() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const syncUserFromSession = useMutation(api.users.syncUserFromSession);

  // Check sessionStorage accessibility on mount
  useEffect(() => {
    try {
      const testKey = "__storage_test__";
      sessionStorage.setItem(testKey, "test");
      sessionStorage.removeItem(testKey);
    } catch (e) {
      setStorageWarning(true);
      console.warn(
        "SessionStorage is not accessible. This may cause authentication issues.",
      );
    }
  }, []);

  // If already signed in, redirect
  useEffect(() => {
    if (session && !sessionLoading) {
      const inviteId = new URLSearchParams(window.location.search).get(
        "invite",
      );
      const redirectUrl = inviteId
        ? `/overview?invite=${inviteId}`
        : "/overview";
      window.location.href = redirectUrl;
    }
  }, [session, sessionLoading]);

  // Process invite after successful sign-in
  useEffect(() => {
    const processInvite = async () => {
      if (session && !sessionLoading) {
        const inviteId = new URLSearchParams(window.location.search).get("invite");
        if (inviteId) {
          try {
            await syncUserFromSession({
              inviteId,
              signInMethod: "google",
            });
            console.log("Invite processed successfully");
          } catch (error) {
            console.error("Error processing invite:", error);
          }
        }
      }
    };

    processInvite();
  }, [session, sessionLoading, syncUserFromSession]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const inviteId = new URLSearchParams(window.location.search).get("invite");
      const callbackURL = inviteId
        ? `/overview?invite=${inviteId}`
        : "/overview";

      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err: any) {
      console.error("Sign-in error:", err);
      toast.error("Failed to sign in with Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 overflow-hidden bg-gray-50">
      {/* Background Animation */}
      <CircuitBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm py-10 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <BlueIEEELogo className="w-24 h-24" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to the{" "}
              <span className="font-semibold text-gray-800">
                IEEE Student Branch at UC San Diego
              </span>{" "}
              dashboard
            </p>
          </div>

          <div>
            {loading ? (
              <SignInButtonSkeleton />
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || sessionLoading}
                className="w-full relative flex justify-center items-center px-4 py-3.5 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="Sign in with Google"
              >
                Continue with Google
              </button>
            )}
          </div>

          {storageWarning && (
            <div className="mt-6 rounded-md bg-yellow-50 p-4 border border-yellow-200">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Browser Issue
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your browser settings may be hindering the sign-in
                      process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/50 px-2 text-gray-500">
                Need access?{" "}
                <a
                  href="mailto:ieee@ucsd.edu"
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Contact IEEE UCSD
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
