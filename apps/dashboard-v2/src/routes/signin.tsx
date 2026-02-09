import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/overview" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignIn = () => {
    signIn();
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 overflow-hidden bg-gray-50">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm py-10 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/logos/blue_logo_only.svg"
                alt="IEEE UCSD Logo"
                className="w-24 h-24"
              />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to the{" "}
              <span className="font-semibold text-gray-800">
                IEEE Student Branch at UC San Diego
              </span>{" "}
              dashboard
            </p>
          </div>

          <div>
            <Button
              onClick={handleSignIn}
              className="w-full py-3.5 text-sm font-medium rounded-xl shadow-md"
              size="lg"
            >
              Continue with Google
            </Button>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/50 px-2 text-gray-500">
                Need access?{" "}
                <a
                  href="mailto:ieee@ucsd.edu"
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Contact IEEE UCSD
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
