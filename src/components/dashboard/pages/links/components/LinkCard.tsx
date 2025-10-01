import React from "react";
import {
  ExternalLink,
  Edit,
  Trash2,
  Calendar,
  Link as LinkIcon,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { Link } from "../../../shared/types/firestore";
import { getCategoryColor } from "../utils/linkPermissions";
import { Timestamp } from "firebase/firestore";

interface LinkCardProps {
  link: Link & { id: string };
  canManage: boolean;
  onEdit: (link: Link & { id: string }) => void;
  onDelete: (linkId: string) => void;
}

export default function LinkCard({
  link,
  canManage,
  onEdit,
  onDelete,
}: LinkCardProps) {
  const categoryInfo = getCategoryColor(link.category);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    // Allow the link to open in a new tab
    e.stopPropagation();
  };

  // Check publish/expire status (for officers)
  const now = Timestamp.now();
  const isScheduled = link.publishDate && link.publishDate.toMillis() > now.toMillis();
  const isExpired = link.expireDate && link.expireDate.toMillis() < now.toMillis();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-4 h-full flex flex-col">
      {/* Header with Icon, Title, and Category */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon/Image */}
        <div className="flex-shrink-0">
          {link.iconUrl ? (
            <img
              src={link.iconUrl}
              alt={link.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
          )}
        </div>

        {/* Title and Category */}
        <div className="flex-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 group mb-1.5 break-words"
          >
            <span className="break-words">{link.title}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.bgColor} ${categoryInfo.color}`}
            >
              {link.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {link.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
          {link.description}
        </p>
      )}

      {/* Status Badges (for officers only) */}
      {canManage && (isScheduled || isExpired) && (
        <div className="mb-3 space-y-1">
          {isScheduled && (
            <div className="flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
              <Clock className="w-3 h-3" />
              <span>Scheduled: {formatDateTime(link.publishDate)}</span>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>Expired: {formatDateTime(link.expireDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(link.createdAt)}</span>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(link)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit link"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(link.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete link"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

