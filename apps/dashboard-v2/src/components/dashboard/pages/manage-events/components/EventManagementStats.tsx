import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../ui/card";
import { Badge } from "../../../../ui/badge";
import { 
  CalendarDays, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface EventManagementStatsProps {
  stats: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    pendingEvents: number;
    completedEvents: number;
    totalAttendees: number;
    averageAttendance: number;
    upcomingEvents: number;
    pastEvents: number;
  };
}

export function EventManagementStats({ stats }: EventManagementStatsProps) {
  const statCards = [
    {
      title: "Total Events",
      value: stats.totalEvents,
      icon: CalendarDays,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Published Events",
      value: stats.publishedEvents,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Draft Events",
      value: stats.draftEvents,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Pending Review",
      value: stats.pendingEvents,
      icon: AlertCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Completed Events",
      value: stats.completedEvents,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Total Attendees",
      value: stats.totalAttendees,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Average Attendance",
      value: stats.averageAttendance.toFixed(1),
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Clock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}

      {/* Additional stats card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Past Events
          </CardTitle>
          <div className="p-2 rounded-full bg-gray-50">
            <TrendingDown className="h-4 w-4 text-gray-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pastEvents}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default stats for when no data is available
export const defaultEventStats: EventManagementStatsProps["stats"] = {
  totalEvents: 0,
  publishedEvents: 0,
  draftEvents: 0,
  pendingEvents: 0,
  completedEvents: 0,
  totalAttendees: 0,
  averageAttendance: 0,
  upcomingEvents: 0,
  pastEvents: 0,
};
