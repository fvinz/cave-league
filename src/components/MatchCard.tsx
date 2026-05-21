import { Link } from "@tanstack/react-router";
import { Match, getTeam, phaseShort, phaseLabel } from "@/lib/mockData";
import { TeamBadge } from "./TeamBadge";
import { Lock } from "lucide-react";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const date = new Date(match.date);
  const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const dayLabel = date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

  const phaseChipCls =
    match.phase === "final" ? "bg-accent text-accent-foreground" :
    match.phase === "semi" ? "bg-primary/15 text-primary" :
    match.phase === "quarter" ? "bg-primary/10 text-primary" :
    match.phase === "third" ? "bg-secondary text-secondary-foreground" :
    "bg-secondary text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`uppercase text-[10px] font-bold px-1.5 py-0.5 rounded ${phaseChipCls}`}>
            {match.phase === "regular" ? `${phaseShort.regular} G${match.matchday}` : phaseLabel[match.phase]}
          </span>
          <span className="font-medium truncate">{dayLabel}</span>
        </div>
        {match.status === "live" ? (
          <span className="flex items-center gap-1.5 text-live font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            LIVE
          </span>
        ) : match.status === "finished" ? (
          <span className="text-success font-semibold shrink-0">FINALE</span>
        ) : match.status === "locked" ? (
          <span className="flex items-center gap-1 text-muted-foreground font-semibold shrink-0">
            <Lock className="w-3 h-3" /> DA DEFINIRE
          </span>
        ) : (
          <span className="shrink-0">{time}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {home ? <TeamBadge teamId={home.id} size={compact ? 28 : 36} /> : <div className="w-9 h-9 rounded-md bg-secondary" />}
          <span className="font-semibold truncate text-sm sm:text-base">{home?.name ?? match.homeLabel ?? "—"}</span>
        </div>
        <div className="text-center font-bold text-lg sm:text-xl tabular-nums px-2 sm:px-4">
          {match.status === "finished" || match.status === "live" ? (
            <div className="flex flex-col items-center leading-none">
              <span>{match.homeScore} — {match.awayScore}</span>
              {match.shootoutWinner && (
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">d.c.r. ({match.shootoutWinner === "home" ? home?.shortName : away?.shortName})</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold truncate text-sm sm:text-base text-right">{away?.name ?? match.awayLabel ?? "—"}</span>
          {away ? <TeamBadge teamId={away.id} size={compact ? 28 : 36} /> : <div className="w-9 h-9 rounded-md bg-secondary" />}
        </div>
      </div>
      {match.highlight && (
        <div className="mt-2 text-xs font-bold text-accent uppercase tracking-wide">{match.highlight}</div>
      )}
      {(home && away && match.id) && (home.id && away.id) && match.homeTeamId && match.awayTeamId && match.status !== "locked" && (
        <Link
          to="/squadre/$teamId"
          params={{ teamId: home.id }}
          className="sr-only"
          aria-label={`Vai a ${home.name}`}
        >.</Link>
      )}
    </div>
  );
}
