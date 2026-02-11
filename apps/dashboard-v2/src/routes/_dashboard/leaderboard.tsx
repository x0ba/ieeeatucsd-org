import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Trophy, Medal, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_dashboard/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const leaderboard = useQuery(api.users.getLeaderboard);
  const [search, setSearch] = useState("");

  const filtered = leaderboard?.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.major && m.major.toLowerCase().includes(search.toLowerCase())),
  );

  const top3 = leaderboard?.slice(0, 3) || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank among IEEE UCSD members.
        </p>
      </div>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((podiumIdx) => {
            const member = top3[podiumIdx];
            if (!member) return null;
            const colors = [
              "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20",
              "border-gray-300 bg-gray-50/50 dark:bg-gray-950/20",
              "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
            ];
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div
                key={member._id}
                className={`rounded-xl border p-4 text-center ${colors[podiumIdx]}`}
              >
                <div className="text-2xl mb-2">{medals[podiumIdx]}</div>
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-12 w-12 rounded-full mx-auto mb-2 object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary mx-auto mb-2">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-semibold truncate text-sm">
                  {member.name}
                </p>
                <p className="text-lg font-bold font-mono">
                  {member.points} pts
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.eventsAttended} events
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {!leaderboard ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((member) => {
            const index = leaderboard.findIndex(
              (m) => m._id === member._id,
            );
            return (
              <div
                key={member._id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  index < 3
                    ? "bg-gradient-to-r from-yellow-50/50 to-transparent border-yellow-200/50 dark:from-yellow-950/10"
                    : "bg-card"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-lg shrink-0">
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
                    <span className="text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.name}</p>
                  {member.major && (
                    <p className="text-sm text-muted-foreground truncate">
                      {member.major}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="font-mono">
                    {member.points} pts
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {member.eventsAttended} events
                  </p>
                </div>
              </div>
            );
          })}
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
