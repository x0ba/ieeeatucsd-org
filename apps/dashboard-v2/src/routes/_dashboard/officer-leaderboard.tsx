import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_dashboard/officer-leaderboard")({
  component: OfficerLeaderboardPage,
});

function OfficerLeaderboardPage() {
  const { hasOfficerAccess } = usePermissions();

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Officer Leaderboard</h1>
        <p className="text-muted-foreground">Track officer contributions and activity.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p>Officer leaderboard coming soon.</p>
      </div>
    </div>
  );
}
