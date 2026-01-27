import React, { useState } from "react";
import { Skeleton } from "@heroui/react";
import { toast } from "sonner";

import BlueIEEELogo from "./BlueIEEELogo";
import { authClient } from "../../lib/auth-client";

const SignOutButtonSkeleton = () => (
  <div className="w-full space-y-3">
    <Skeleton className="h-12 w-full rounded-xl" />
    <Skeleton className="h-12 w-full rounded-xl" />
  </div>
);

export default function SignOutContent() {
  const { isPending: sessionLoading } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout failed", error);
      toast.error("Failed to sign out. Please try again.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      document.referrer &&
      !document.referrer.includes("/signin") &&
      !document.referrer.includes("/signout")
    ) {
      window.history.back();
    } else {
      window.location.href = "/overview";
    }
  };

  const showSkeleton = loading || sessionLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex justify-center mb-6">
              <BlueIEEELogo className="w-20 h-20" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign Out</h1>
            <p className="text-gray-600 text-sm">Are you sure you want to sign out?</p>
          </div>

          <div className="px-8 pb-10">
            {showSkeleton ? (
              <SignOutButtonSkeleton />
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Confirm sign out"
                >
                  <span>Sign Out</span>
                </button>

                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-100 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Cancel sign out"
                >
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble?{" "}
            <a
              href="mailto:ieee@ucsd.edu"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Contact IEEE UCSD
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
