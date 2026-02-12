import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Shield,
  RefreshCw,
  Inbox,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PasswordStrengthIndicator } from "@/components/dashboard/slack-access/PasswordStrengthIndicator";
import { EmailModal } from "@/components/dashboard/slack-access/EmailModal";
import type { EmailMessage, EmailInboxState, EmailGenerationState, PasswordValidation } from "@/components/dashboard/slack-access/types";

export const Route = createFileRoute("/_dashboard/slack-access")({
  component: SlackAccessPage,
});

function SlackAccessPage() {
  const { user } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    isValid: false,
    strength: 0,
    requirements: { minLength: false, hasUppercase: false, hasLowercase: false, hasNumber: false, hasSpecialChar: false },
  });

  const [showInboxPassword, setShowInboxPassword] = useState(false);
  const [inboxPassword, setInboxPassword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 12;

  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailState, setEmailState] = useState<EmailGenerationState>({
    isGenerating: false,
    isResetting: false,
    generatedEmail: null,
    error: null,
    success: null,
  });
  const [inboxState, setInboxState] = useState<EmailInboxState>({
    isAuthenticated: false,
    isLoading: false,
    isRefreshing: false,
    emails: [],
    error: null,
    credentials: null,
  });

  // Check if user has existing IEEE email
  const hasIEEEEmail = !!user?.ieeeEmail;
  const ieeeEmail = user?.ieeeEmail || emailState.generatedEmail;
  const canResetPassword = user?.role && ["General Officer", "Executive Officer", "Past Officer", "Administrator"].includes(user?.role);

  useEffect(() => {
    setPasswordValidation(validatePassword(customPassword));
  }, [customPassword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [inboxState.emails.length]);

  const extractUsername = (email: string): string => {
    return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  const validatePassword = (password: string): PasswordValidation => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    };

    const isValid = Object.values(requirements).every((req) => req);
    const strength = Object.values(requirements).filter((req) => req).length;

    return { isValid, strength, requirements };
  };

  const handleIEEEPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (hasIEEEEmail) {
        if (!emailState.isResetting && customPassword.trim() && passwordValidation.isValid) {
          resetEmailPassword();
        }
      } else {
        if (!emailState.isGenerating && customPassword.trim() && passwordValidation.isValid) {
          generateIEEEEmail();
        }
      }
    }
  };

  const handleInboxPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!inboxState.isLoading && inboxPassword.trim()) {
        authenticateInbox();
      }
    }
  };

  const getPaginatedEmails = () => {
    const startIndex = (currentPage - 1) * emailsPerPage;
    const endIndex = startIndex + emailsPerPage;
    return inboxState.emails.slice(startIndex, endIndex);
  };

  const generateIEEEEmail = async () => {
    if (!user) {
      setEmailState((prev) => ({ ...prev, error: "User authentication required" }));
      return;
    }

    if (!user.email || !user.email.includes("@")) {
      setEmailState((prev) => ({ ...prev, error: "Invalid user email format" }));
      return;
    }

    if (!customPassword.trim()) {
      setEmailState((prev) => ({ ...prev, error: "Password is required" }));
      return;
    }

    const validation = validatePassword(customPassword);
    if (!validation.isValid) {
      setEmailState((prev) => ({ ...prev, error: "Password does not meet requirements." }));
      return;
    }

    setEmailState((prev) => ({ ...prev, isGenerating: true, error: null, success: null }));

    try {
      const username = extractUsername(user.email);
      const proposedEmail = `${username}@ieeeatucsd.org`;

      const checkResponse = await fetch("/api/ieee-email/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: proposedEmail }),
      });

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        if (checkResult.exists) {
          setEmailState((prev) => ({
            ...prev,
            isGenerating: false,
            error: `Email ${proposedEmail} already exists. Please contact webmaster@ieeeatucsd.org.`,
          }));
          return;
        }
      }

      const response = await fetch("/api/ieee-email/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          name: user.name,
          email: user.email,
          password: customPassword,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (result.success) {
        // Update user data would happen in a real app
        setEmailState((prev) => ({
          ...prev,
          isGenerating: false,
          generatedEmail: result.data.ieeeEmail,
          success: result.data.message,
        }));
        toast.success("IEEE email created successfully!");
        setCustomPassword("");
      } else {
        setEmailState((prev) => ({
          ...prev,
          isGenerating: false,
          error: result.message || "Failed to create IEEE email",
        }));
      }
    } catch (error) {
      console.error("Error creating IEEE email:", error);
      setEmailState((prev) => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : "Failed to create IEEE email.",
      }));
    }
  };

  const resetEmailPassword = async () => {
    const ieeeEmailAddress = emailState.generatedEmail || user?.ieeeEmail;
    if (!ieeeEmailAddress || !customPassword.trim()) {
      setEmailState((prev) => ({ ...prev, error: "Email and password required" }));
      return;
    }

    const validation = validatePassword(customPassword);
    if (!validation.isValid) {
      setEmailState((prev) => ({ ...prev, error: "Password does not meet requirements." }));
      return;
    }

    setEmailState((prev) => ({ ...prev, isResetting: true, error: null, success: null }));

    try {
      const response = await fetch("/api/ieee-email/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ieeeEmailAddress, password: customPassword }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (result.success) {
        setEmailState((prev) => ({
          ...prev,
          isResetting: false,
          success: result.message,
        }));
        toast.success("Password reset successfully!");
        setCustomPassword("");
      } else {
        setEmailState((prev) => ({
          ...prev,
          isResetting: false,
          error: result.message || "Failed to reset password",
        }));
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setEmailState((prev) => ({
        ...prev,
        isResetting: false,
        error: error instanceof Error ? error.message : "Failed to reset password.",
      }));
    }
  };

  const authenticateInbox = async () => {
    const ieeeEmailAddress = emailState.generatedEmail || user?.ieeeEmail;
    if (!ieeeEmailAddress || !inboxPassword.trim()) {
      setInboxState((prev) => ({ ...prev, error: "Credentials required" }));
      return;
    }

    setInboxState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/ieee-email/fetch-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ieeeEmailAddress, password: inboxPassword }),
      });

      const result = await response.json();

      if (result.success) {
        setInboxState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          emails: result.emails || [],
          credentials: { email: ieeeEmailAddress, password: inboxPassword },
        }));
        setInboxPassword("");
        toast.success("Inbox authenticated successfully!");
      } else {
        const errorMessage = result.message || "Failed to authenticate";
        const isAuthError = errorMessage.toLowerCase().includes("password") || errorMessage.toLowerCase().includes("login");
        setInboxState((prev) => ({
          ...prev,
          isLoading: false,
          error: isAuthError ? "Login failed. Check password." : "Connection failed.",
        }));
      }
    } catch (error) {
      console.error("Error authenticating inbox:", error);
      setInboxState((prev) => ({ ...prev, isLoading: false, error: "Connection failed." }));
    }
  };

  const refreshInbox = async () => {
    if (!inboxState.isAuthenticated || !inboxState.credentials) return;
    setInboxState((prev) => ({ ...prev, isRefreshing: true, error: null }));

    try {
      const response = await fetch("/api/ieee-email/fetch-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inboxState.credentials),
      });

      const result = await response.json();
      if (result.success) {
        setInboxState((prev) => ({ ...prev, isRefreshing: false, emails: result.emails || [] }));
        toast.success("Inbox refreshed!");
      } else {
        setInboxState((prev) => ({ ...prev, isRefreshing: false, error: "Failed to refresh." }));
      }
    } catch (error) {
      setInboxState((prev) => ({ ...prev, isRefreshing: false, error: "Failed to refresh." }));
    }
  };

  const copyEmail = () => {
    if (ieeeEmail) {
      navigator.clipboard.writeText(ieeeEmail);
      toast.success("Email copied to clipboard");
    }
  };

  const username = user?.email ? extractUsername(user.email) : "";

  return (
    <div className="w-full">
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Notice */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Important Notice</h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-0.5">
              This email address is exclusively for Slack authentication. It provides access to the IEEE UCSD Slack workspace only.
            </p>
          </div>
        </div>

        {/* Slack Workspace Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">IEEE UCSD Slack Workspace</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Connect with fellow members and stay updated</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-border">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Workspace URL</h3>
              <p className="text-sm text-ieee-blue font-medium flex items-center gap-1">
                ieeeucsdofficers.slack.com
                <a href="https://ieeeucsdofficers.slack.com" target="_blank" rel="noopener noreferrer" className="hover:text-ieee-blue-light">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-border">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Access Method</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Use your IEEE email to join</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-border">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contact webmaster@ieeeatucsd.org</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Email Management */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                <Mail className="w-6 h-6 text-ieee-blue" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {hasIEEEEmail ? "IEEE Email Management" : "IEEE Email Generation"}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {hasIEEEEmail ? "Manage your existing IEEE email" : "Create your Slack-specific IEEE email"}
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-border">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Personal Email</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</dd>
                </div>
                {hasIEEEEmail || ieeeEmail ? (
                  <>
                    <div className="flex justify-between pt-2 border-t border-border mt-2">
                      <dt className="text-gray-500 dark:text-gray-400">IEEE Email</dt>
                      <dd className="flex items-center gap-2 font-medium text-ieee-blue">
                        {ieeeEmail}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyEmail}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between pt-2 border-t border-border mt-2">
                    <dt className="text-gray-500 dark:text-gray-400">Proposed IEEE Email</dt>
                    <dd className="font-medium text-ieee-blue">{username}@ieeeatucsd.org</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Password input */}
            <div className="mb-4 sm:mb-6">
              <Label htmlFor="password">{hasIEEEEmail ? "New Password" : "Password"}</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={hasIEEEEmail ? "Enter new password" : "Enter a secure password"}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  onKeyDown={handleIEEEPasswordKeyDown}
                  disabled={hasIEEEEmail && !canResetPassword}
                  className={hasIEEEEmail && !canResetPassword ? "opacity-50" : ""}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {hasIEEEEmail && !canResetPassword && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Password reset is only available to officers and administrators.
                </p>
              )}
              {customPassword && <PasswordStrengthIndicator validation={passwordValidation} />}
            </div>

            {hasIEEEEmail ? (
              canResetPassword ? (
                <Button
                  onClick={resetEmailPassword}
                  disabled={!customPassword.trim() || !passwordValidation.isValid || emailState.isResetting}
                  className="w-full bg-ieee-blue hover:bg-ieee-blue-light text-white"
                >
                  {emailState.isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              ) : (
                <div className="w-full p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">Restricted</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Contact administrator to reset.</p>
                  </div>
                </div>
              )
            ) : (
              <Button
                onClick={generateIEEEEmail}
                disabled={!customPassword.trim() || !passwordValidation.isValid || emailState.isGenerating}
                className="w-full bg-ieee-blue hover:bg-ieee-blue-light text-white"
              >
                {emailState.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Generate IEEE Email
                  </>
                )}
              </Button>
            )}

            {/* Status Messages */}
            {emailState.success && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">{emailState.success}</p>
              </div>
            )}
            {emailState.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{emailState.error}</p>
              </div>
            )}
          </div>

          {/* Inbox Preview */}
          <div className="rounded-xl border bg-card p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl">
                  <Inbox className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Inbox Preview</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">View your Slack-related emails</p>
                </div>
              </div>
              {inboxState.isAuthenticated && (
                <Button variant="ghost" size="sm" onClick={refreshInbox} disabled={inboxState.isRefreshing}>
                  {inboxState.isRefreshing ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : <RefreshCw className="w-5 h-5 text-purple-600" />}
                </Button>
              )}
            </div>

            <div className="flex-1 min-h-[400px]">
              {!ieeeEmail ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-border">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">No Email Account</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">Generate an IEEE email first.</p>
                </div>
              ) : !inboxState.isAuthenticated ? (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-border">
                  <div className="w-full max-w-sm space-y-6 text-center">
                    <div>
                      <div className="bg-purple-100 dark:bg-purple-950/40 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Key className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-2">Authentication Required</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Enter password for<br />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{ieeeEmail}</span>
                      </p>
                    </div>
                    <div className="space-y-4 text-left">
                      <div>
                        <Label htmlFor="inbox-password">Password</Label>
                        <div className="relative mt-2">
                          <Input
                            id="inbox-password"
                            type={showInboxPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={inboxPassword}
                            onChange={(e) => setInboxPassword(e.target.value)}
                            onKeyDown={handleInboxPasswordKeyDown}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setShowInboxPassword(!showInboxPassword)}
                            type="button"
                          >
                            {showInboxPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={authenticateInbox}
                        disabled={!inboxPassword.trim() || inboxState.isLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {inboxState.isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4 mr-2" />
                            Access Inbox
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {inboxState.emails.length === 0 && !inboxState.isRefreshing ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400">
                      <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p>Inbox is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[400px]">
                        {getPaginatedEmails().map((email) => {
                          const isSlackRelated = email.subject.toLowerCase().includes("slack") || email.from.toLowerCase().includes("slack");
                          return (
                            <div
                              key={email.id}
                              onClick={() => setSelectedEmail(email)}
                              className={`group p-4 rounded-xl border transition-all cursor-pointer relative hover:shadow-md ${
                                email.isRead
                                  ? "bg-white dark:bg-gray-900 border-border hover:border-purple-300 dark:hover:border-purple-600"
                                  : "bg-purple-50/30 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900 hover:border-purple-200 dark:hover:border-purple-800"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {!email.isRead && <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0" />}
                                  {isSlackRelated && (
                                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] rounded-full font-medium">
                                      SLACK
                                    </span>
                                  )}
                                  <h4 className={`text-sm truncate ${!email.isRead ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                                    {email.subject || "(No Subject)"}
                                  </h4>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">{email.date}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                                <span className="font-medium text-gray-600 dark:text-gray-300">{email.from}</span>
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{email.preview}</p>
                            </div>
                          );
                        })}
                      </div>
                      {Math.ceil(inboxState.emails.length / emailsPerPage) > 1 && (
                        <div className="flex justify-center pt-4 border-t border-border mt-4 gap-2">
                          {Array.from({ length: Math.ceil(inboxState.emails.length / emailsPerPage) }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {inboxState.error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{inboxState.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">How to Join IEEE UCSD Slack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Generate IEEE Email", desc: "Use the form above to create your IEEE email address." },
              { step: 2, title: "Sign up for Slack", desc: "Use your new @ieeeatucsd.org email to sign up." },
              { step: 3, title: "Verify Email", desc: "Check the inbox preview above for the confirmation code." },
              { step: 4, title: "Collaborate", desc: "Join channels and start chatting with the team." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {selectedEmail && (
        <EmailModal
          email={selectedEmail}
          credentials={inboxState.credentials}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}
