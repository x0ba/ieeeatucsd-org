import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_dashboard/manage-sponsors")({
  component: ManageSponsorsPage,
});

function ManageSponsorsPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const domains = useQuery(api.sponsorDomains.list, logtoId ? { logtoId } : "skip");
  const createDomain = useMutation(api.sponsorDomains.create);
  const removeDomain = useMutation(api.sponsorDomains.remove);
  const [newDomain, setNewDomain] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newTier, setNewTier] = useState<string>("Bronze");

  if (!hasAdminAccess) {
    return <div className="p-6 text-center text-muted-foreground">You don't have permission to access this page.</div>;
  }

  const handleAdd = async () => {
    if (!newDomain || !newOrg) return;
    try {
      await createDomain({ logtoId: logtoId!, domain: newDomain, organizationName: newOrg, sponsorTier: newTier as any });
      setNewDomain("");
      setNewOrg("");
      toast.success("Sponsor domain added");
    } catch { toast.error("Failed to add"); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Sponsors</h1>
        <p className="text-muted-foreground">Manage sponsor domains for auto-assignment.</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Add Sponsor Domain</h2>
        <div className="flex gap-2">
          <Input placeholder="@domain.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
          <Input placeholder="Organization Name" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
          <select className="border rounded px-3 py-2 text-sm" value={newTier} onChange={(e) => setNewTier(e.target.value)}>
            <option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option>
          </select>
          <Button onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      {!domains ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : domains.length > 0 ? (
        <div className="space-y-2">
          {domains.map((d) => (
            <div key={d._id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{d.domain}</p>
                <p className="text-sm text-muted-foreground">{d.organizationName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.sponsorTier}</Badge>
                <Button size="sm" variant="ghost" onClick={async () => { try { await removeDomain({ logtoId: logtoId!, id: d._id }); toast.success("Removed"); } catch { toast.error("Failed"); } }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No sponsor domains configured.</p>
      )}
    </div>
  );
}
