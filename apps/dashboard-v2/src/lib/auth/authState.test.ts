import { describe, expect, it } from "vitest";
import { resolveAuthState, shouldAttemptProvisioning } from "./authState";

describe("shouldAttemptProvisioning", () => {
  it("returns true for first null-user attempt", () => {
    expect(
      shouldAttemptProvisioning({
        isAuthenticated: true,
        logtoId: "logto|new-user",
        convexSessionToken: "session-token",
        convexUser: null,
        lastProvisioningAttemptLogtoId: null,
      }),
    ).toBe(true);
  });

  it("returns false after provisioning already attempted for same user", () => {
    expect(
      shouldAttemptProvisioning({
        isAuthenticated: true,
        logtoId: "logto|new-user",
        convexSessionToken: "session-token",
        convexUser: null,
        lastProvisioningAttemptLogtoId: "logto|new-user",
      }),
    ).toBe(false);
  });
});

describe("resolveAuthState", () => {
  it("does not block unauthenticated users on logto loading", () => {
    const state = resolveAuthState({
      logtoLoading: true,
      isAuthenticated: false,
      logtoId: null,
      accessToken: null,
      convexSessionToken: null,
      convexUser: undefined,
      isProvisioningUser: false,
      hasProvisioningAttempt: false,
      authFailureReason: null,
    });

    expect(state.isLoading).toBe(false);
    expect(state.isAuthResolved).toBe(true);
  });

  it("stays loading while provisioning is in progress", () => {
    const state = resolveAuthState({
      logtoLoading: false,
      isAuthenticated: true,
      logtoId: "logto|new-user",
      accessToken: "access-token",
      convexSessionToken: "session-token",
      convexUser: null,
      isProvisioningUser: true,
      hasProvisioningAttempt: true,
      authFailureReason: null,
    });

    expect(state.isLoading).toBe(true);
    expect(state.isAuthResolved).toBe(false);
  });

  it("clears loading after bounded null-user provisioning attempt", () => {
    const state = resolveAuthState({
      logtoLoading: false,
      isAuthenticated: true,
      logtoId: "logto|new-user",
      accessToken: "access-token",
      convexSessionToken: "session-token",
      convexUser: null,
      isProvisioningUser: false,
      hasProvisioningAttempt: true,
      authFailureReason: null,
    });

    expect(state.isLoading).toBe(false);
    expect(state.isAuthResolved).toBe(true);
  });

  it("clears loading when auth bootstrap has a terminal failure", () => {
    const state = resolveAuthState({
      logtoLoading: false,
      isAuthenticated: true,
      logtoId: null,
      accessToken: null,
      convexSessionToken: null,
      convexUser: undefined,
      isProvisioningUser: false,
      hasProvisioningAttempt: false,
      authFailureReason: "session_mint_failed",
    });

    expect(state.isLoading).toBe(false);
    expect(state.isAuthResolved).toBe(true);
  });
});
