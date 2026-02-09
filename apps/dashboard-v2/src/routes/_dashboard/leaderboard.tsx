import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Trophy, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_dashboard/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const leaderboard = useQuery(api.users.getLeaderboard);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank among IEEE UCSD members.
        </p>
      </div>

      {!leaderboard ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((member, index) => (
            <div
              key={member._id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                index < 3
                  ? "bg-gradient-to-r from-yellow-50/50 to-transparent border-yellow-200/50"
                  : "bg-card"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-lg">
                {index < 3 ? (
                  <Medal
                    className={`h-5 w-5 ${
                      index === 0
                        ? "text-yellow-500"
                        : index === 1
                          ? "text-gray-400"
                          : "text-amber-600"
                    }`}
                  />
                ) : (
                  <span className="text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.name}</p>
                {member.major && (
                  <p className="text-sm text-muted-foreground truncate">
                    {member.major}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="font-mono">
                  {member.points} pts
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {member.eventsAttended} events
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No rankings yet</p>
          <p className="text-sm">
            Attend events to earn points and climb the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
}
