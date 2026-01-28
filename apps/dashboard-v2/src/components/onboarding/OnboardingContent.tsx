import React, { useState } from "react";
import { UserPlus, Mail, List, Lock } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore - Types will be generated after convex dev runs
import { api } from "#convex/_generated/api";
import { Spinner } from "@heroui/react";
import { authClient } from "../../lib/auth-client";
import type { UserRole } from "../../lib/types";
import InvitationFlowTab from "./InvitationFlowTab";
import DirectOnboardingTab from "./DirectOnboardingTab";
import PendingInvitationsTab from "./PendingInvitationsTab";
import { useUser } from "../providers/ConvexClientProvider";

export default function OnboardingContent() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { convexUser: user, syncStatus } = useUser();
  const userLoading = syncStatus === "loading";

  const stats = useQuery(api.invitations.getStats);
  const statsLoading = stats === undefined;

  const invitations = useQuery(api.invitations.listRecent, { limit: 100 });
  const invitationsLoading = invitations === undefined;

  const hasPermission = useQuery(
    api.users.hasOfficerRole,
    session?.user?.id ? { authUserId: session.user.id } : "skip",
  );
  const permissionLoading = hasPermission === undefined;

  // @ts-ignore - Will be resolved after Convex types are generated
  const sendInvitation = useMutation(api.invitations.create);
  // @ts-ignore - Will be resolved after Convex types are generated
  const sendDirectOnboarding = useMutation(
    api.onboarding.createDirectOnboarding,
  );
  // @ts-ignore - Will be resolved after Convex types are generated
  const resendInvitation = useMutation(api.invitations.resend);

  const [activeTab, setActiveTab] = useState<
    "invitation" | "direct" | "pending"
  >("invitation");
  const [loading, setLoading] = useState(false);

  if (userLoading || permissionLoading || statsLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" color="primary" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">Please sign in to access onboarding.</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to access onboarding
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access the onboarding page. This page
              is only accessible to Executive Officers and Administrators.
            </p>
            <a
              href="/overview"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "invitation" as const,
      label: "Invitation Flow",
      icon: Mail,
      description: "Send invitations that require acceptance",
    },
    {
      id: "direct" as const,
      label: "Direct Onboarding",
      icon: UserPlus,
      description: "Onboard officers directly without acceptance",
    },
    {
      id: "pending" as const,
      label: "Pending Invitations",
      icon: List,
      description: "View and manage all invitations",
      badge:
        stats?.pendingInvitations > 0 ? stats.pendingInvitations : undefined,
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Main Content */}
      <main className="p-4 md:p-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                    }}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }
                    `}
                  >
                    <Icon
                      className={`
                        -ml-0.5 mr-2 h-5 w-5
                        ${isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}
                      `}
                    />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Description */}
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "invitation" && (
            <InvitationFlowTab
              onSendInvitation={async (data) => {
                setLoading(true);
                try {
                  await sendInvitation({
                    ...data,
                    invitedBy: session?.user?.id || "",
                  });
                } catch (error) {
                  console.error("Error sending invitation:", error);
                  throw error;
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {activeTab === "direct" && (
            <DirectOnboardingTab
              onSendOnboarding={async (data) => {
                setLoading(true);
                try {
                  await sendDirectOnboarding({
                    ...data,
                    authUserId: session?.user?.id || "",
                  });
                } catch (error) {
                  console.error("Error sending direct onboarding:", error);
                  throw error;
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          )}

          {activeTab === "pending" && (
            <PendingInvitationsTab
              invitations={invitations || []}
              loading={invitationsLoading}
              onRefresh={async () => {
                // Refresh happens automatically via Convex subscriptions
              }}
              onResend={async (invitationId) => {
                setLoading(true);
                try {
                  await resendInvitation({
                    id: invitationId,
                    authUserId: session?.user?.id || "",
                  });
                } catch (error) {
                  console.error("Error resending invitation:", error);
                  throw error;
                } finally {
                  setLoading(false);
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
