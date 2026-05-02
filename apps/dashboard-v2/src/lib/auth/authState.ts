interface ResolveAuthStateInput {
  logtoLoading: boolean;
  isAuthenticated: boolean;
  logtoId: string | null;
  accessToken: string | null;
  convexSessionToken: string | null;
  convexUser: unknown;
  isProvisioningUser: boolean;
  hasProvisioningAttempt: boolean;
  authFailureReason: string | null;
}

interface ResolvedAuthUser<TUser> {
  logtoId: string;
  user: TUser;
}

interface ResolveStableAuthUserInput<TUser> {
  logtoId: string | null;
  convexUser: TUser | null | undefined;
  lastResolvedUser: ResolvedAuthUser<TUser> | null;
}

export function resolveStableAuthUser<TUser>({
  logtoId,
  convexUser,
  lastResolvedUser,
}: ResolveStableAuthUserInput<TUser>) {
  if (!logtoId) {
    return {
      user: null,
      lastResolvedUser: null,
    };
  }

  if (convexUser === null) {
    return {
      user: null,
      lastResolvedUser: null,
    };
  }

  if (convexUser !== undefined) {
    return {
      user: convexUser,
      lastResolvedUser: {
        logtoId,
        user: convexUser,
      },
    };
  }

  if (lastResolvedUser?.logtoId === logtoId) {
    return {
      user: lastResolvedUser.user,
      lastResolvedUser,
    };
  }

  return {
    user: undefined,
    lastResolvedUser: null,
  };
}

export function resolveAuthState({
  isAuthenticated,
  logtoId,
  accessToken,
  convexSessionToken,
  convexUser,
  isProvisioningUser,
  hasProvisioningAttempt,
  authFailureReason,
}: ResolveAuthStateInput) {
  if (authFailureReason) {
    return {
      isAuthResolved: true,
      isLoading: false,
    };
  }

  if (!isAuthenticated) {
    return {
      isAuthResolved: true,
      isLoading: false,
    };
  }

  const hasCoreSession = !!logtoId && !!accessToken && !!convexSessionToken;
  if (!hasCoreSession) {
    return {
      isAuthResolved: false,
      isLoading: true,
    };
  }

  const isAuthResolved =
    convexUser !== undefined &&
    !(convexUser === null && isProvisioningUser) &&
    !(convexUser === null && !hasProvisioningAttempt);

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
