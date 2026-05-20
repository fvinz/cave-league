import { Link } from "@tanstack/react-router";
import { Match, getTeam } from "@/lib/mockData";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const home = getTeam(match.homeTeamId)!;
  const away = getTeam(match.awayTeamId)!;
  const date = new Date(match.date);
  const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const dayLabel = date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
        <span className="font-medium">Giornata {match.matchday} · {dayLabel}</span>
        {match.status === "live" ? (
          <span className="flex items-center gap-1.5 text-live font-bold">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            LIVE
          </span>
        ) : match.status === "finished" ? (
          <span className="text-success font-semibold">FINALE</span>
        ) : (
          <span>{time}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge teamId={home.id} size={compact ? 28 : 36} />
          <span className="font-semibold truncate text-sm sm:text-base">{home.name}</span>
        </div>
        <div className="text-center font-bold text-lg sm:text-xl tabular-nums px-2 sm:px-4">
          {match.status === "scheduled" ? (
            <span className="text-muted-foreground">vs</span>
          ) : (
            <span>{match.homeScore} — {match.awayScore}</span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold truncate text-sm sm:text-base text-right">{away.name}</span>
          <TeamBadge teamId={away.id} size={compact ? 28 : 36} />
        </div>
      </div>
      {match.highlight && (
        <div className="mt-2 text-xs font-bold text-accent uppercase tracking-wide">{match.highlight}</div>
      )}
    </div>
  );
}
