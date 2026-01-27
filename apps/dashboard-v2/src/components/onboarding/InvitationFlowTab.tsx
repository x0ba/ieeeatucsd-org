import React, { useState } from "react";
import { Mail, Calendar, MessageSquare } from "lucide-react";
import { Input, Textarea, Button, Select, SelectItem } from "@heroui/react";
import type { InvitationFormData } from "../../lib/types";

interface InvitationFlowTabProps {
  onSendInvitation: (data: InvitationFormData) => Promise<void>;
  loading: boolean;
}

interface InvitationFlowTabProps {
  onSendInvitation: (data: InvitationFormData) => Promise<void>;
  loading: boolean;
}

export default function InvitationFlowTab({
  onSendInvitation,
  loading,
}: InvitationFlowTabProps) {
  const [formData, setFormData] = useState<InvitationFormData>({
    name: "",
    email: "",
    role: "General Officer",
    position: "",
    leaderName: "",
    message: "",
    acceptanceDeadline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.position) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await onSendInvitation(formData);
      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "General Officer",
        position: "",
        leaderName: "",
        message: "",
        acceptanceDeadline: "",
      });
      alert("Invitation sent successfully!");
    } catch (error) {
      alert("Failed to send invitation. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="name"
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
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            classNames={{
              input: "text-sm",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role */}
        <div className="space-y-2">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700"
          >
            Role <span className="text-red-500">*</span>
          </label>
          <Select
            id="role"
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
            htmlFor="position"
            className="block text-sm font-medium text-gray-700"
          >
            Position <span className="text-red-500">*</span>
          </label>
          <Input
            id="position"
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
          htmlFor="leaderName"
          className="block text-sm font-medium text-gray-700"
        >
          Team Lead / Vice Chair (optional)
        </label>
        <Input
          id="leaderName"
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

      {/* Acceptance Deadline */}
      <div className="space-y-2">
        <label
          htmlFor="deadline"
          className="block text-sm font-medium text-gray-700"
        >
          Acceptance Deadline (optional)
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="deadline"
            type="datetime-local"
            value={formData.acceptanceDeadline || ""}
            onChange={(e) =>
              setFormData({ ...formData, acceptanceDeadline: e.target.value })
            }
            className="pl-10"
            classNames={{
              input: "text-sm",
            }}
          />
        </div>
      </div>

      {/* Custom Message */}
      <div className="space-y-2">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700"
        >
          Custom Message (optional)
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            id="message"
            placeholder="Add a personal message to the invitation..."
            value={formData.message || ""}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            minRows={3}
            className="pl-10"
            classNames={{
              input: "text-sm",
            }}
          />
        </div>
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
          Send Invitation
        </Button>
      </div>
    </form>
  );
}
