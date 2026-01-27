import React, { useState } from "react";
import { UserPlus, Mail as MailIcon } from "lucide-react";
import { Input, Textarea, Button, Select, SelectItem } from "@heroui/react";
import type { DirectOnboardingFormData } from "../../lib/types";

interface DirectOnboardingTabProps {
  onSendOnboarding: (data: DirectOnboardingFormData) => Promise<void>;
  loading: boolean;
}

interface DirectOnboardingTabProps {
  onSendOnboarding: (data: DirectOnboardingFormData) => Promise<void>;
  loading: boolean;
}

export default function DirectOnboardingTab({
  onSendOnboarding,
  loading,
}: DirectOnboardingTabProps) {
  const [formData, setFormData] = useState<DirectOnboardingFormData>({
    name: "",
    email: "",
    role: "General Officer",
    position: "",
    leaderName: "",
    customMessage: "",
    emailTemplate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.position) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await onSendOnboarding(formData);
      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "General Officer",
        position: "",
        leaderName: "",
        customMessage: "",
        emailTemplate: "",
      });
      alert("Onboarding sent successfully!");
    } catch (error) {
      alert("Failed to send onboarding. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Direct onboarding skips the invitation
          acceptance process. The user will be onboarded immediately with the
          specified role.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <label
            htmlFor="direct-name"
            className="block text-sm font-medium text-gray-700"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="direct-name"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="pl-10"
              classNames={{
                input: "text-sm",
              }}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label
            htmlFor="direct-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="direct-email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="pl-10"
              classNames={{
                input: "text-sm",
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role */}
        <div className="space-y-2">
          <label
            htmlFor="direct-role"
            className="block text-sm font-medium text-gray-700"
          >
            Role <span className="text-red-500">*</span>
          </label>
          <Select
            id="direct-role"
            label="Select role"
            selectedKeys={[formData.role]}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              setFormData({ ...formData, role: selectedKey as any });
            }}
            classNames={{
              trigger: "text-sm",
            }}
            aria-label="Select role"
          >
            {[
              { key: "General Officer", label: "General Officer" },
              { key: "Executive Officer", label: "Executive Officer" },
              { key: "Member at Large", label: "Member at Large" },
              { key: "Past Officer", label: "Past Officer" },
            ].map((role) => (
              <SelectItem key={role.key}>{role.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <label
            htmlFor="direct-position"
            className="block text-sm font-medium text-gray-700"
          >
            Position <span className="text-red-500">*</span>
          </label>
          <Input
            id="direct-position"
            placeholder="e.g., Webmaster, President, etc."
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            classNames={{
              input: "text-sm",
            }}
          />
        </div>
      </div>

      {/* Team Lead / Vice Chair */}
      <div className="space-y-2">
        <label
          htmlFor="direct-leaderName"
          className="block text-sm font-medium text-gray-700"
        >
          Team Lead / Vice Chair (optional)
        </label>
        <Input
          id="direct-leaderName"
          placeholder="Name of the team lead or mentor"
          value={formData.leaderName || ""}
          onChange={(e) =>
            setFormData({ ...formData, leaderName: e.target.value })
          }
          classNames={{
            input: "text-sm",
          }}
        />
      </div>

      {/* Custom Message */}
      <div className="space-y-2">
        <label
          htmlFor="direct-message"
          className="block text-sm font-medium text-gray-700"
        >
          Custom Message (optional)
        </label>
        <Textarea
          id="direct-message"
          placeholder="Add a personal message to the onboarding email..."
          value={formData.customMessage || ""}
          onChange={(e) =>
            setFormData({ ...formData, customMessage: e.target.value })
          }
          minRows={3}
          classNames={{
            input: "text-sm",
          }}
        />
      </div>

      {/* Email Template */}
      <div className="space-y-2">
        <label
          htmlFor="direct-template"
          className="block text-sm font-medium text-gray-700"
        >
          Email Template (optional)
        </label>
        <Input
          id="direct-template"
          placeholder="Email template ID or name"
          value={formData.emailTemplate || ""}
          onChange={(e) =>
            setFormData({ ...formData, emailTemplate: e.target.value })
          }
          classNames={{
            input: "text-sm",
          }}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          color="primary"
          isDisabled={loading}
          isLoading={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Send Onboarding
        </Button>
      </div>
    </form>
  );
}
