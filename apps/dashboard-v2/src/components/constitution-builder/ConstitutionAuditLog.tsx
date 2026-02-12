import React, { useState, useMemo } from "react";
import { Clock, User, Search, Filter, Plus, Minus, Edit3 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConstitutionAuditEntry } from "./types";
import { format } from "date-fns";

interface ConstitutionAuditLogProps {
  constitutionId: string;
}

export const ConstitutionAuditLog: React.FC<ConstitutionAuditLogProps> = ({
  constitutionId,
}) => {
  const auditLog = useQuery(api.constitutions.getAuditLog, {
    constitutionId: constitutionId as any,
  });

  const entries = auditLog || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(entries.map((entry) => entry.userName));
    return Array.from(users).sort();
  }, [entries]);

  const searchInEntry = (entry: ConstitutionAuditEntry, query: string): boolean => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();

    if (
      entry.changeDescription.toLowerCase().includes(lowerQuery) ||
      entry.userName.toLowerCase().includes(lowerQuery) ||
      entry.changeType.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    if (
      entry.beforeValue?.title?.toLowerCase().includes(lowerQuery) ||
      entry.afterValue?.title?.toLowerCase().includes(lowerQuery) ||
      entry.beforeValue?.content?.toLowerCase().includes(lowerQuery) ||
      entry.afterValue?.content?.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    if (
      entry.sectionId?.toLowerCase().includes(lowerQuery) ||
      entry.userId?.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    const formattedDate = formatTimestamp(entry.timestamp);
    if (formattedDate.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    return false;
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = searchInEntry(entry, debouncedSearchQuery);
      const matchesChangeType =
        changeTypeFilter === "all" || entry.changeType === changeTypeFilter;
      const matchesUser = userFilter === "all" || entry.userName === userFilter;

      return matchesSearch && matchesChangeType && matchesUser;
    });
  }, [entries, debouncedSearchQuery, changeTypeFilter, userFilter, searchInEntry]);

  const getChangeTypeIcon = (changeType: ConstitutionAuditEntry["changeType"]) => {
    switch (changeType) {
      case "create":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "update":
        return <Edit3 className="h-4 w-4 text-blue-600" />;
      case "delete":
        return <Minus className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeTypeBadge = (changeType: ConstitutionAuditEntry["changeType"]) => {
    const variants = {
      create: "bg-green-100 text-green-800 hover:bg-green-100",
      update: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      delete: "bg-red-100 text-red-800 hover:bg-red-100",
      reorder: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    };

    return (
      <Badge variant="secondary" className={variants[changeType]}>
        {changeType.charAt(0).toUpperCase() + changeType.slice(1)}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "MMM dd, yyyy 'at' h:mm a");
  };

  const renderBeforeAfterComparison = (entry: ConstitutionAuditEntry) => {
    if (entry.changeType === "create") {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Created Section:</h4>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p>
                <strong>Title:</strong> {entry.afterValue?.title || "Untitled"}
              </p>
              <p>
                <strong>Type:</strong> {entry.afterValue?.type}
              </p>
              {entry.afterValue?.content && (
                <div className="mt-2">
                  <strong>Content:</strong>
                  <p className="mt-1 text-sm bg-white p-2 rounded border">
                    {entry.afterValue.content.substring(0, 300)}
                    {entry.afterValue.content.length > 300 && "..."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (entry.changeType === "delete") {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-red-700 mb-2">Deleted Section:</h4>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p>
                <strong>Title:</strong> {entry.beforeValue?.title || "Untitled"}
              </p>
              <p>
                <strong>Type:</strong> {entry.beforeValue?.type}
              </p>
              {entry.beforeValue?.content && (
                <div className="mt-2">
                  <strong>Content:</strong>
                  <p className="mt-1 text-sm bg-white p-2 rounded border">
                    {entry.beforeValue.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (entry.changeType === "update") {
      return (
        <div className="space-y-4">
          {entry.beforeValue?.title !== entry.afterValue?.title && (
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Title Changed:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <h5 className="font-medium text-red-700">Before:</h5>
                  <p className="text-sm">{entry.beforeValue?.title || "Untitled"}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-700">After:</h5>
                  <p className="text-sm">{entry.afterValue?.title || "Untitled"}</p>
                </div>
              </div>
            </div>
          )}

          {entry.beforeValue?.content !== entry.afterValue?.content && (
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Content Changed:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <h5 className="font-medium text-red-700">Before:</h5>
                  <p className="text-sm bg-white p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                    {entry.beforeValue?.content || "Empty"}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-700">After:</h5>
                  <p className="text-sm bg-white p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                    {entry.afterValue?.content || "Empty"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Constitution Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No audit entries found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Constitution Audit Log
        </CardTitle>
        <p className="text-sm text-gray-600">
          Complete history of all changes made to the constitution. This log is
          read-only and cannot be modified.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search audit entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Change Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="reorder">Reordered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {entries.length === 0
                  ? "No audit entries found."
                  : "No entries match your filters."}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getChangeTypeIcon(entry.changeType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getChangeTypeBadge(entry.changeType)}
                      <span className="text-sm text-gray-600">by</span>
                      <span className="font-medium text-sm">
                        {entry.userName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 mb-2">
                      {entry.changeDescription}
                    </p>

                    {(entry.beforeValue || entry.afterValue) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getChangeTypeIcon(entry.changeType)}
                              Change Details - {formatTimestamp(entry.timestamp)}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <p>
                                <strong>User:</strong> {entry.userName}
                              </p>
                              <p>
                                <strong>Action:</strong> {entry.changeDescription}
                              </p>
                            </div>
                            {renderBeforeAfterComparison(entry)}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            {filteredEntries.length === entries.length
              ? `Showing all ${entries.length} audit entries`
              : `Showing ${filteredEntries.length} of ${entries.length} audit entries`}
            {debouncedSearchQuery && ` (filtered by "${debouncedSearchQuery}")`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
