import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Link as LinkIcon,
  ExternalLink,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/links")({
  component: LinksPage,
});

function LinksPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const links = useQuery(api.links.list);
  const createLink = useMutation(api.links.create);
  const updateLink = useMutation(api.links.update);
  const removeLink = useMutation(api.links.remove);

  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formShortUrl, setFormShortUrl] = useState("");

  const resetForm = () => {
    setFormTitle("");
    setFormUrl("");
    setFormCategory("");
    setFormDescription("");
    setFormShortUrl("");
  };

  const startEdit = (link: any) => {
    setEditingId(link._id);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category);
    setFormDescription(link.description || "");
    setFormShortUrl(link.shortUrl || "");
    setShowCreateForm(false);
  };

  const handleCreate = async () => {
    if (!logtoId) return;
    if (!formTitle.trim() || !formUrl.trim() || !formCategory.trim()) {
      toast.error("Title, URL, and category are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await createLink({
        logtoId,
        title: formTitle,
        url: formUrl,
        category: formCategory,
        description: formDescription || undefined,
        shortUrl: formShortUrl || undefined,
      });
      toast.success("Link created!");
      resetForm();
      setShowCreateForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!logtoId || !editingId) return;
    if (!formTitle.trim() || !formUrl.trim() || !formCategory.trim()) {
      toast.error("Title, URL, and category are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateLink({
        logtoId,
        id: editingId as any,
        title: formTitle,
        url: formUrl,
        category: formCategory,
        description: formDescription || undefined,
        shortUrl: formShortUrl || undefined,
      });
      toast.success("Link updated!");
      resetForm();
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!logtoId) return;
    setDeletingId(id);
    try {
      await removeLink({ logtoId, id: id as any });
      toast.success("Link deleted");
    } catch {
      toast.error("Failed to delete link");
    } finally {
      setDeletingId(null);
    }
  };

  const grouped = useMemo(() => {
    if (!links) return {};
    const filtered = links.filter(
      (l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.category.toLowerCase().includes(search.toLowerCase()),
    );
    return filtered.reduce(
      (acc, link) => {
        const cat = link.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(link);
        return acc;
      },
      {} as Record<string, typeof links>,
    );
  }, [links, search]);

  const LinkForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          {isEdit ? "Edit Link" : "Add New Link"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm();
            setShowCreateForm(false);
            setEditingId(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            placeholder="e.g. IEEE UCSD Website"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>URL *</Label>
          <Input
            placeholder="https://..."
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
          <Input
            placeholder="e.g. General, Social Media, Resources"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Short URL</Label>
          <Input
            placeholder="e.g. ieee-ucsd"
            value={formShortUrl}
            onChange={(e) => setFormShortUrl(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Brief description of this link..."
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={isEdit ? handleUpdate : handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEdit ? "Update Link" : "Create Link"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetForm();
            setShowCreateForm(false);
            setEditingId(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Links</h1>
          <p className="text-muted-foreground">
            Quick access to important IEEE UCSD resources.
          </p>
        </div>
        {hasOfficerAccess && !showCreateForm && !editingId && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && <LinkForm isEdit={false} />}

      {/* Edit Form (shown at top when editing) */}
      {editingId && <LinkForm isEdit={true} />}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {!links ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryLinks]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryLinks.map((link) => (
                  <div
                    key={link._id}
                    className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors group relative"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 flex-1 min-w-0"
                    >
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                        <LinkIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{link.title}</p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        {link.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </a>
                    {hasOfficerAccess && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            startEdit(link);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={deletingId === link._id}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(link._id);
                          }}
                        >
                          {deletingId === link._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <LinkIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No links found</p>
          <p className="text-sm">Links will appear here when added.</p>
        </div>
      )}
    </div>
  );
}
