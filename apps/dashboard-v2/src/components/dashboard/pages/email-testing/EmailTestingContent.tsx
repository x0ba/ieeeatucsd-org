import React, { useState } from "react";

const EMAIL_GROUPS = [
  {
    label: "Reimbursements",
    options: [
      { value: "reimbursement_submission", text: "Reimbursement Submission" },
      { value: "reimbursement_status_change_approved", text: "Reimbursement Approved" },
      { value: "reimbursement_status_change_rejected", text: "Reimbursement Rejected" },
      { value: "reimbursement_status_change_paid", text: "Reimbursement Paid" },
      { value: "audit_request", text: "Audit Request" },
    ],
  },
  {
    label: "Events",
    options: [
      { value: "event_submission", text: "Event Request Submission" },
      { value: "event_status_change", text: "Event Status Change" },
      { value: "event_edit", text: "Event Edit" },
      { value: "event_delete", text: "Event Delete" },
      { value: "graphics_upload", text: "Graphics Upload" },
    ],
  },
  {
    label: "Fund Deposits",
    options: [
      { value: "fund_deposit_submission", text: "Fund Deposit Submission" },
      { value: "fund_deposit_status_change", text: "Fund Deposit Status Change" },
    ],
  },
  {
    label: "User Management",
    options: [
      { value: "user_profile_update", text: "User Profile Update" },
      { value: "user_role_change", text: "User Role Change (Promotion)" },
    ],
  },
];

export default function EmailTestingContent() {
  const [testEmail, setTestEmail] = useState("");
  const [emailType, setEmailType] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "loading" | null; message: string }>({
    type: null,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (!testEmail || !emailType) {
      setStatus({ type: "error", message: "Please fill in all fields" });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(testEmail)) {
      setStatus({ type: "error", message: "Please enter a valid email address" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "loading", message: "Sending test email..." });

    try {
      const response = await fetch("/api/email/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testEmail, emailType }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus({ type: "success", message: `✅ Test email sent successfully to ${testEmail}!` });
      } else {
        setStatus({
          type: "error",
          message: `❌ Failed to send email: ${result.error || "Unknown error"}`,
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Email Testing Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Test email notifications using production routes with realistic data.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="test-email" className="block text-sm font-medium text-slate-700">
              Test Email Address
            </label>
            <input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email-type" className="block text-sm font-medium text-slate-700">
              Email Type
            </label>
            <select
              id="email-type"
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select an email type...</option>
              {EMAIL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.text}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Test Email"}
        </button>

        {status.type && (
          <div
            className={
              status.type === "success"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
                : status.type === "error"
                  ? "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900"
                  : "rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900"
            }
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">ℹ️ Important Notes</h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-blue-900/80">
          <li>All emails use the same production routes and functions.</li>
          <li>Test data is realistic but clearly marked as "TEST".</li>
          <li>Emails are sent via the production Resend API.</li>
          <li>Check your spam folder if you don't receive the email.</li>
        </ul>
      </div>
    </div>
  );
}
