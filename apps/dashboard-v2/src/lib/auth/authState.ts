interface ResolveAuthStateInput {
  logtoLoading: boolean;
  isAuthenticated: boolean;
  logtoId: string | null;
  accessToken: string | null;
  convexSessionToken: string | null;
  convexUser: unknown;
  isProvisioningUser: boolean;
  hasProvisioningAttempt: boolean;
}

export function resolveAuthState({
  logtoLoading,
  isAuthenticated,
  logtoId,
  accessToken,
  convexSessionToken,
  convexUser,
  isProvisioningUser,
  hasProvisioningAttempt,
}: ResolveAuthStateInput) {
  const isAuthResolved =
    !logtoLoading &&
    (!isAuthenticated ||
      (!!logtoId &&
        !!accessToken &&
        !!convexSessionToken &&
        convexUser !== undefined &&
        !(convexUser === null && isProvisioningUser) &&
        !(convexUser === null && !hasProvisioningAttempt)));

  return {
    isAuthResolved,
    isLoading: !isAuthResolved,
  };
}

interface ShouldAttemptProvisioningInput {
  isAuthenticated: boolean;
  logtoId: string | null;
  convexSessionToken: string | null;
  convexUser: unknown;
  lastProvisioningAttemptLogtoId: string | null;
}

export function shouldAttemptProvisioning({
  isAuthenticated,
  logtoId,
  convexSessionToken,
  convexUser,
  lastProvisioningAttemptLogtoId,
}: ShouldAttemptProvisioningInput) {
  if (!isAuthenticated || !logtoId || !convexSessionToken) return false;
  if (convexUser !== null) return false;
  return lastProvisioningAttemptLogtoId !== logtoId;
}
