import React from "react";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button, Badge } from "@heroui/react";
// @ts-ignore - Types will be generated after convex dev runs
import type { Id } from '../../../../../../convex/_generated/dataModel';
import type { InvitationStatus } from "../../lib/types";

interface OfficerInvitation {
  _id: Id<"officerInvitations">;
  name: string;
  email: string;
  role: string;
  position: string;
  status: InvitationStatus;
  invitedAt: number;
  expiresAt: number;
  acceptedAt?: number;
}

interface PendingInvitationsTabProps {
  invitations: OfficerInvitation[];
  loading: boolean;
  onRefresh: () => void;
  onResend: (invitationId: Id<"officerInvitations">) => Promise<void>;
}

export default function PendingInvitationsTab({
  invitations,
  loading,
  onRefresh,
  onResend,
}: PendingInvitationsTabProps) {
  const getStatusBadge = (status: InvitationStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge color="warning" variant="flat">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge color="success" variant="flat">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge color="danger" variant="flat">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case "expired":
        return (
          <Badge color="default" variant="flat">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (invitation: OfficerInvitation) => {
    return invitation.expiresAt < Date.now() && invitation.status === "pending";
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          All Invitations ({invitations.length})
        </h3>
        <Button
          color="primary"
          variant="light"
          size="sm"
          onPress={onRefresh}
          startContent={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading invitations...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No invitations found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {invitation.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invitation.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {invitation.position}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invitation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(invitation.invitedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === "pending" &&
                      !isExpired(invitation) && (
                        <Button
                          color="primary"
                          variant="light"
                          size="sm"
                          onPress={() => onResend(invitation._id)}
                        >
                          Resend
                        </Button>
                      )}
                    {isExpired(invitation) && (
                      <span className="text-xs text-gray-400">Expired</span>
                    )}
                    {invitation.status !== "pending" && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
