import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  CreditCard,
  Award,
  Clock,
  DollarSign,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_dashboard/overview")({
  component: OverviewPage,
});

const statCardColors: Record<string, { icon: string }> = {
  points: { icon: "text-amber-600 dark:text-amber-400" },
  events: { icon: "text-blue-600 dark:text-blue-400" },
  role: { icon: "text-purple-600 dark:text-purple-400" },
  member: { icon: "text-emerald-600 dark:text-emerald-400" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  colorKey,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  colorKey: string;
}) {
  const colors = statCardColors[colorKey] || statCardColors.points;
  return (
    <div className={`rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg bg-secondary/50 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const activityIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  event: { icon: Calendar, color: "text-blue-600 dark:text-blue-400" },
  reimbursement: { icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400" },
  fund_deposit: { icon: DollarSign, color: "text-purple-600 dark:text-purple-400" },
};

function OverviewPage() {
  const { user, isLoading } = useAuth();
  const { logtoId } = usePermissions();
  const overviewData = useQuery(
    api.users.getOverviewData,
    logtoId ? { logtoId } : "skip",
  );

  if (isLoading || !user) {
    return (
      <div className="p-6 space-y-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const chartData = overviewData?.pointsHistory.map((p) => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    points: p.cumulative,
  })) || [];

  return (
    <div className="p-6 space-y-8 w-full">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.name?.split(" ")[0] || "Member"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            You've earned <span className="font-semibold text-foreground">{user.points || 0} points</span> across <span className="font-semibold text-foreground">{user.eventsAttended || 0} events</span> this year.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full border border-border/50 transition-colors hover:bg-secondary">
          <Award className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Rank</span>
            <span className="text-sm font-bold tabular-nums">#{overviewData?.rank || "-"}</span>
            <span className="text-[10px] font-medium text-muted-foreground/60">/ {overviewData?.totalMembers || "-"}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Points" value={user.points || 0} icon={Trophy} description="Total points earned" colorKey="points" />
        <StatCard title="Events Attended" value={user.eventsAttended || 0} icon={Calendar} description="Events you've checked into" colorKey="events" />
        <StatCard title="Role" value={user.role} icon={Users} description={user.position || "Active member"} colorKey="role" />
        <StatCard
          title="Member Since"
          value={user.joinDate ? new Date(user.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A"}
          icon={TrendingUp}
          description={user.major || ""}
          colorKey="member"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Points Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold">Points Growth</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Activity performance</p>
            </div>
          </div>
          {chartData.length >= 2 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }} 
                    className="text-muted-foreground/70"
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }} 
                    className="text-muted-foreground/70" 
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "1px solid hsl(var(--border))", 
                      background: "hsl(var(--card))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                    labelStyle={{ fontWeight: 700, marginBottom: '4px', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px', padding: 0 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.05} 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Calendar className="h-6 w-6 opacity-20" />
              </div>
              <p className="text-sm">Attend events to see your growth chart</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary rounded-lg">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold">Recent Activity</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Latest updates</p>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {overviewData?.recentActivity && overviewData.recentActivity.length > 0 ? (
              <div className="space-y-4 pr-1 max-h-72 overflow-y-auto custom-scrollbar">
                {overviewData.recentActivity.map((activity, idx) => {
                  const config = activityIcons[activity.type] || activityIcons.event;
                  const Icon = config.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 group">
                      <div className={`p-2 rounded-lg bg-secondary/50 shrink-0 transition-colors group-hover:bg-secondary ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {activity.title}
                          </p>
                          {activity.points && activity.points > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                              +{activity.points}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60 uppercase shrink-0 ml-2">
                            {new Date(activity.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-12">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                  <Clock className="h-6 w-6 opacity-20" />
                </div>
                <p className="text-sm">No recent activity found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!user.signedUp && (
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
              Complete Your Profile
            </h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80 max-w-2xl">
              You haven't completed your profile setup yet. Finish setting up your account to access all features and start earning points.
            </p>
          </div>
          <Link
            to="/get-started"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-bold shadow-sm shadow-amber-900/20 shrink-0"
          >
            Finish Setup
          </Link>
        </div>
      )}
    </div>
  );
}
