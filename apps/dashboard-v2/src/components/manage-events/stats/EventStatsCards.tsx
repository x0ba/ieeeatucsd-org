import { CalendarDays, CheckCircle2, Users } from "lucide-react";
import type { EventStats } from "../types";

interface EventStatsCardsProps {
  stats: EventStats;
  loading?: boolean;
}

export function EventStatsCards({ stats, loading = false }: EventStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-6 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Events",
      value: stats.totalEvents,
      icon: CalendarDays,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Published Events",
      value: stats.publishedEvents,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40",
      textColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Total Attendees",
      value: stats.totalAttendees,
      icon: Users,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40",
      textColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {statCards.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={stat.title}
            className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${stat.bgGradient} p-6`}
          >
            <div className="relative z-10 flex items-center gap-4">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}
              >
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p
                  className={`text-2xl font-bold ${stat.textColor}`}
                >
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
