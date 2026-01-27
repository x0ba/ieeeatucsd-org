/**
 * Simple Auth Configuration for Self-Hosted Setup
 * Using localStorage for session management
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Session {
  user: SessionUser;
  expiresAt: number;
}

const SESSION_KEY = "dashboard_session";

export const auth = {
  // Get current session from localStorage
  getSession: (): Session | null => {
    if (typeof window === "undefined") return null;

    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session: Session = JSON.parse(sessionData);

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  // Set session in localStorage
  setSession: (
    user: SessionUser,
    expiresIn: number = 60 * 60 * 24 * 5 * 1000,
  ): void => {
    if (typeof window === "undefined") return;

    const session: Session = {
      user,
      expiresAt: Date.now() + expiresIn,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  // Clear session
  clearSession: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!auth.getSession();
  },
};
