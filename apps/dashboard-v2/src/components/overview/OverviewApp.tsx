import React from "react";
import { ConvexClientProvider } from "../providers/ConvexClientProvider";
import { Toaster } from "sonner";

interface OverviewAppProps {
    hasAuthParams: boolean;
    authUserId: string | null;
    email: string | null;
}

export default function OverviewApp({
    hasAuthParams,
    authUserId,
    email,
}: OverviewAppProps) {
    return (
        <ConvexClientProvider>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-2xl mx-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Dashboard Overview
                    </h1>

                    {hasAuthParams && authUserId && (
                        <div className="space-y-4 mb-8">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h2 className="text-lg font-semibold text-blue-900 mb-2">
                                    🙌 Sign-in Successful!
                                </h2>
                                <p className="text-blue-800">
                                    Welcome <strong className="email">{email}</strong>!
                                </p>
                                <p className="text-sm text-blue-700 mt-2">
                                    Your Convex user ID:{" "}
                                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                                        {authUserId}
                                    </code>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            🚀 Dashboard Coming Soon
                        </h2>
                        <p className="text-gray-600 mb-6">
                            The overview page is currently being implemented. You've
                            successfully signed in using the self-hosted Convex + standalone
                            authentication system.
                        </p>

                        <div className="space-y-2 text-left text-sm">
                            <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                <span className="text-gray-700">
                                    Self-hosted Convex backend connected
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                <span className="text-gray-700">Better Auth configured</span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                <span className="text-gray-700">Schema deployed to Convex</span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                <span className="text-gray-700">
                                    TypeScript types generated
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-x-4">
                        <a
                            href="/onboarding"
                            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Onboarding
                        </a>
                        <a
                            href="/signout"
                            className="inline-block border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Sign Out
                        </a>
                    </div>
                </div>
            </div>
            <Toaster richColors position="top-center" />
        </ConvexClientProvider>
    );
}
