import { Home, Settings, LogOut, AlertTriangle } from "lucide-react";
import { auth } from "../../../firebase/client";

interface FallbackLayoutProps {
  children?: React.ReactNode;
  reason?: "timeout" | "error" | "unknown";
  errorMessage?: string;
}

/**
 * Minimal fallback layout that renders immediately with zero dependencies.
 * Used as last resort when all other layout mechanisms fail.
 * Guarantees the application always shows something functional.
 */
export function FallbackLayout({ children, reason = "unknown", errorMessage }: FallbackLayoutProps) {
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.href = "/dashboard/signin";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Minimal Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
              I
            </div>
            <span className="text-lg font-bold">IEEE UCSD</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <a
              href="/dashboard/overview"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Overview</span>
            </a>
            <a
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </a>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fallback Mode Indicator */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-semibold">Limited Mode Active</p>
              <p className="text-sm">
                {reason === "timeout"
                  ? "Layout preferences are loading slowly. Using minimal interface."
                  : reason === "error"
                  ? `An error occurred: ${errorMessage || "Unknown error"}. Using minimal interface.`
                  : "Using minimal interface due to an unknown issue."}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children || (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                <p className="text-gray-600 mb-4">
                  The dashboard is running in minimal mode. Some features may be unavailable.
                </p>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-2">What you can do:</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>Navigate to Overview or Settings using the sidebar</li>
                    <li>Sign out using the button below</li>
                    <li>Refresh the page to attempt normal loading</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}