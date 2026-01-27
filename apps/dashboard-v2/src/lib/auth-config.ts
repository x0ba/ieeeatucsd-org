/**
 * Client-side Auth Configuration for BetterAuth
 * Provides client-side session access for React components
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  signedUp?: boolean;
}

export interface Session {
  user: SessionUser;
  expiresAt: number;
}

/**
 * Get the current session from BetterAuth
 * This makes a server request to get the session from cookies
 */
export async function getSession(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.user) {
      return null;
    }

    return {
      user: data.user,
      expiresAt: data.expiresAt || Date.now() + (60 * 60 * 24 * 7 * 1000),
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Sign out the user
 */
export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to sign out:', error);
  }
}

// Legacy export for backward compatibility
export const auth = {
  getSession,
  isAuthenticated,
  signOut,
};
