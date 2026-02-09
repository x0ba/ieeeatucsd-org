import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_dashboard/sponsors/information")({
  component: SponsorInformationPage,
});

function SponsorInformationPage() {
  const { isSponsor, isAdmin } = usePermissions();

  if (!isSponsor && !isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">You don't have permission to access this page.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sponsor Information</h1>
        <p className="text-muted-foreground">View your sponsorship details and benefits.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p>Sponsor information coming soon.</p>
      </div>
    </div>
  );
}
