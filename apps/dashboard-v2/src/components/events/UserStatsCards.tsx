import { Calendar, Trophy, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface UserStatsCardsProps {
  latestEvent?: {
    eventName: string;
    eventDate: number;
  };
  totalPoints: number;
  eventsAttended: number;
  loading?: boolean;
}

export function UserStatsCards({
  latestEvent,
  totalPoints,
  eventsAttended,
  loading = false,
}: UserStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-8 w-32 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Latest Event",
      value: latestEvent?.eventName || "None",
      subtext: latestEvent
        ? new Date(latestEvent.eventDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : undefined,
      icon: Calendar,
      gradient: "from-blue-50/50 to-white",
      textColor: "text-gray-900",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Points Earned",
      value: totalPoints.toString(),
      icon: Trophy,
      gradient: "from-yellow-50/50 to-white",
      textColor:
        "text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600",
      valueClass: "text-3xl font-black",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      title: "Events Attended",
      value: eventsAttended.toString(),
      icon: Users,
      gradient: "from-purple-50/50 to-white",
      textColor:
        "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600",
      valueClass: "text-3xl font-black",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card
            key={stat.title}
            className={`border-none shadow-sm bg-gradient-to-br ${stat.gradient} hover:shadow-md transition-all duration-300`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-lg ${stat.iconBg} ${stat.iconColor} shrink-0`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <h4
                    className={`font-bold truncate ${stat.valueClass || "text-xl"} ${stat.textColor}`}
                    title={stat.value}
                  >
                    {stat.value}
                  </h4>
                  {stat.subtext && (
                    <p className="text-xs text-gray-400">{stat.subtext}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
