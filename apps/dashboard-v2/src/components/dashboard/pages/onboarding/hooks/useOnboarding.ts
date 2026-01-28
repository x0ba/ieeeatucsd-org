import { useState } from "react";
import { useAuth } from "../../shared/hooks/useConvexAuth";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import type {
  OfficerInvitation,
  UserRole,
  GoogleGroup,
} from "../../../../shared/types/constitution";
import type {
  InvitationFormData,
  DirectOnboardingFormData,
  OnboardingStats,
} from "../types/OnboardingTypes";
import { showToast } from "../../../shared/utils/toast";

export function useOnboarding() {
  const { authUserId } = useAuth();
  const invitations = useQuery(api.onboarding.listInvitations, {});
  const stats = useQuery(api.onboarding.getInvitationStats, {});
  const createInvitation = useMutation(api.onboarding.createInvitation);
  const updateInvitation = useMutation(api.onboarding.updateInvitation);
  const createDirectOnboarding = useMutation(api.onboarding.createDirectOnboarding);
  
  const [loading, setLoading] = useState(false);

  // Determine Google Group based on role
  const getGoogleGroupForRole = (role: UserRole): GoogleGroup | null => {
    switch (role) {
      case "Executive Officer":
      case "Administrator":
        return "executive-officers@ieeeatucsd.org";
      case "General Officer":
        return "general-officers@ieeeatucsd.org";
      case "Past Officer":
        return "past-officers@ieeeatucsd.org";
      default:
        return null;
    }
  };

  // Send invitation email
  const sendInvitation = async (formData: InvitationFormData) => {
    if (!authUserId) {
      showToast.error("You must be logged in to send invitations");
      return;
    }

    try {
      setLoading(true);

      // Parse the acceptance deadline from datetime-local input
      const expiresAt = new Date(formData.acceptanceDeadline);

      // Validate the date
      if (isNaN(expiresAt.getTime())) {
        throw new Error("Invalid acceptance deadline");
      }

      // Check if deadline is in the future
      if (expiresAt <= new Date()) {
        throw new Error("Acceptance deadline must be in the future");
      }

      // Format deadline for email display
      const formattedDeadline = expiresAt.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });

      // Create invitation record in Convex
      await createInvitation({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        position: formData.position,
        expiresAt: expiresAt.getTime(),
        message: formData.message,
        acceptanceDeadline: formattedDeadline,
        leaderName: formData.leaderName,
        invitedBy: authUserId,
      });

      // Send invitation email via API
      const response = await fetch("/api/onboarding/send-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId: "temp-id", // Will be replaced by API with actual ID
          name: formData.name,
          email: formData.email,
          role: formData.role,
          position: formData.position,
          acceptanceDeadline: formattedDeadline,
          message: formData.message,
          leaderName: formData.leaderName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation email");
      }

      showToast.success(`Invitation sent successfully to ${formData.name}!`);
    } catch (err) {
      console.error("Error sending invitation:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setLoading(false);
    }
  };

  // Send direct onboarding
  const sendDirectOnboarding = async (formData: DirectOnboardingFormData) => {
    if (!authUserId) {
      showToast.error("You must be logged in to onboard officers");
      return;
    }

    try {
      setLoading(true);

      // Send onboarding email and create user via API
      const response = await fetch("/api/onboarding/send-direct-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          position: formData.position,
          leaderName: formData.leaderName,
          customMessage: formData.customMessage,
          emailTemplate: formData.emailTemplate,
          onboardedBy: authUserId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send onboarding email");
      }

      // Create direct onboarding record
      await createDirectOnboarding({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        position: formData.position,
        leaderName: formData.leaderName,
        customMessage: formData.customMessage,
        emailTemplate: formData.emailTemplate,
        onboardedBy: authUserId,
        userId: result.userId || "unknown",
      });

      showToast.success(`${formData.name} has been onboarded successfully!`);
    } catch (err) {
      console.error("Error sending direct onboarding:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to onboard officer",
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend invitation
  const resendInvitation = async (invitationId: string) => {
    if (!authUserId) {
      showToast.error("You must be logged in to resend invitations");
      return;
    }

    try {
      setLoading(true);

      // Call API to resend invitation
      const response = await fetch("/api/onboarding/resend-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend invitation");
      }

      // Update invitation lastSentAt
      await updateInvitation({
        invitationId: invitationId as any,
        lastSentAt: Date.now(),
      });

      showToast.success("Invitation resent successfully!");
    } catch (err) {
      console.error("Error resending invitation:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to resend invitation",
      );
    } finally {
      setLoading(false);
    }
  };

  // Refresh invitations (no-op since real-time listener handles updates)
  const refreshInvitations = async () => {
    // Convex queries automatically update
  };

  return {
    invitations: invitations || [],
    stats: stats || {
      totalInvitations: 0,
      pendingInvitations: 0,
      acceptedInvitations: 0,
      declinedInvitations: 0,
    },
    loading,
    sendInvitation,
    sendDirectOnboarding,
    resendInvitation,
    refreshInvitations,
  };
}
