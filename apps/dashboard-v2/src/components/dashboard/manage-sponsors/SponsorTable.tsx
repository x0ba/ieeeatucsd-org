import { Pencil, Trash2, ChevronUp, ChevronDown, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Id } from "@convex/_generated/dataModel";
import type { SponsorDomain, SortConfig, SponsorTier } from "./types";

interface SponsorTableProps {
  sponsors: SponsorDomain[];
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  onEditSponsor: (sponsor: SponsorDomain) => void;
  onDeleteSponsor: (sponsorId: Id<"sponsorDomains">) => void;
}

const tierColors: Record<SponsorTier, string> = {
  Bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Silver: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  Gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Diamond: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export function SponsorTable({
  sponsors,
  sortConfig,
  onSort,
  onEditSponsor,
  onDeleteSponsor,
}: SponsorTableProps) {
  const getSortIcon = (field: string) => {
    if (sortConfig.field === field) {
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      );
    }
    return null;
  };

  if (sponsors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Building2 className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No sponsor domains found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add a sponsor domain to automatically assign sponsor status to users with matching email addresses.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/50 dark:bg-gray-700/50">
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => onSort("organizationName")}>
                <span className="flex items-center gap-1">Organization {getSortIcon("organizationName")}</span>
              </th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => onSort("domain")}>
                <span className="flex items-center gap-1">Domain {getSortIcon("domain")}</span>
              </th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => onSort("sponsorTier")}>
                <span className="flex items-center gap-1">Tier {getSortIcon("sponsorTier")}</span>
              </th>
              <th className="text-right p-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.map((sponsor, idx) => (
              <tr key={sponsor._id} className={`border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${idx % 2 === 1 ? "bg-gray-50/30 dark:bg-gray-800/20" : ""}`}>
                <td className="p-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {sponsor.organizationName}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {sponsor.domain}
                  </div>
                </td>
                <td className="p-4">
                  <Badge className={`text-xs ${tierColors[sponsor.sponsorTier]}`}>
                    {sponsor.sponsorTier}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEditSponsor(sponsor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteSponsor(sponsor._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
