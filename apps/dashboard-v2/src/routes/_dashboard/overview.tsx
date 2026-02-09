import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Trophy,
  Users,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_dashboard/overview")({
  component: OverviewPage,
});

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function OverviewPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.name?.split(" ")[0] || "Member"}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your IEEE UCSD activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Points"
          value={user.points || 0}
          icon={Trophy}
          description="Total points earned"
        />
        <StatCard
          title="Events Attended"
          value={user.eventsAttended || 0}
          icon={Calendar}
          description="Events you've checked into"
        />
        <StatCard
          title="Role"
          value={user.role}
          icon={Users}
          description={user.position || "Active member"}
        />
        <StatCard
          title="Member Since"
          value={
            user.joinDate
              ? new Date(user.joinDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "N/A"
          }
          icon={TrendingUp}
          description={user.major || ""}
        />
      </div>

      {!user.signedUp && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Complete Your Profile
          </h3>
          <p className="text-yellow-700 mb-4">
            You haven't completed your profile setup yet. Please complete it to
            access all features.
          </p>
          <Link
            to="/get-started"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            Complete Setup
          </Link>
        </div>
      )}
    </div>
  );
}
