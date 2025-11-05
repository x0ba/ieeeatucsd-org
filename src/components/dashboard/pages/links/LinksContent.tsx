import React, { useState, useMemo } from "react";
import { Plus, AlertCircle, CheckCircle, Link as LinkIcon, Search } from "lucide-react";
import { useLinksManagement } from "./hooks/useLinksManagement";
import LinkCard from "./components/LinkCard";
import LinkModal from "./components/LinkModal";
import LinkFilters from "./components/LinkFilters";
import type { Link } from "../../shared/types/firestore";
import { Skeleton } from "@heroui/react";

export default function LinksContent() {
  const {
    links,
    visibleLinks,
    allLinks,
    loading,
    searchTerm,
    categoryFilter,
    canManageLinks,
    createLink,
    updateLink,
    deleteLink,
    setSearchTerm,
    setCategoryFilter,
  } = useLinksManagement();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<
    (Link & { id: string }) | null
  >(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  // Calculate link counts by category (using visibleLinks to respect date visibility)
  const linkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleLinks.forEach((link) => {
      counts[link.category] = (counts[link.category] || 0) + 1;
    });
    return counts;
  }, [visibleLinks]);

  const handleAddLink = () => {
    setEditingLink(null);
    setShowLinkModal(true);
  };

  const handleEditLink = (link: Link & { id: string }) => {
    setEditingLink(link);
    setShowLinkModal(true);
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    setDeletingLinkId(linkId);
    await deleteLink(linkId);
    setDeletingLinkId(null);
  };

  const handleSaveLink = async (linkData: {
    url: string;
    title: string;
    category: string;
    description?: string;
    iconUrl?: string;
    shortUrl?: string;
    publishDate?: any;
    expireDate?: any;
  }) => {
    if (editingLink) {
      await updateLink(editingLink.id, linkData);
    } else {
      await createLink(linkData);
    }
    setShowLinkModal(false);
    setEditingLink(null);
  };

  const handleCloseModal = () => {
    setShowLinkModal(false);
    setEditingLink(null);
  };

  return (
    <div className="flex-1 overflow-auto">
      <main className="p-4 md:p-6">
        {/* Search and Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search links..."
              aria-label="Search links"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px]"
            />
          </div>
          {canManageLinks && (
            <button
              onClick={handleAddLink}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Link</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <LinkFilters
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            linkCounts={linkCounts}
          />
        </div>

        {/* Links Grid */}
        {
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || categoryFilter !== "all"
                  ? "No links found"
                  : "No links yet"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || categoryFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : canManageLinks
                    ? "Get started by adding your first link"
                    : "Links will appear here once they are added"}
              </p>
              {canManageLinks &&
                !searchTerm &&
                categoryFilter === "all" && (
                  <button
                    onClick={handleAddLink}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Link
                  </button>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  canManage={canManageLinks}
                  onEdit={handleEditLink}
                  onDelete={handleDeleteLink}
                />
              ))}
            </div>
          )
        }

        {/* Results count */}
        {
          !loading && links.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-600">
              Showing {links.length} {links.length === 1 ? "link" : "links"}
              {(searchTerm || categoryFilter !== "all") && (
                <span>
                  {" "}
                  of {allLinks.length} total
                </span>
              )}
            </div>
          )
        }
      </main>

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={handleCloseModal}
        onSave={handleSaveLink}
        editingLink={editingLink}
        loading={loading}
        allLinks={allLinks}
      />
    </div>
  );
}
