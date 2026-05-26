import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  getMatch, getTeam, getPlayer, phaseLabel,
  useStoreVersion,
  type Match, type MatchEvent,
} from "@/lib/mockData";
import { Lock, CheckCircle2, Goal, AlertCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/partite/$matchId")({
  component: MatchDetail,
  head: ({ params }) => {
    const m = getMatch(params.matchId);
    const home = m?.homeTeamId ? getTeam(m.homeTeamId)?.name : m?.homeLabel ?? "?";
    const away = m?.awayTeamId ? getTeam(m.awayTeamId)?.name : m?.awayLabel ?? "?";
    return { meta: [{ title: `${home} vs ${away} — Cave League` }] };
  },
});

const PERIOD_LABEL: Record<string, string> = {
  first_half: "1° Tempo", second_half: "2° Tempo", shootout: "Rigori",
};

function currentPhaseLabel(m: Match): string {
  if (m.status === "locked")   return "Bloccata";
  if (m.status === "finished") return "Terminata";
  if (m.status !== "live")     return "In programma";
  switch (m.currentPhase) {
    case "first_half":  return "1° Tempo";
    case "half_time":   return "Intervallo";
    case "second_half": return "2° Tempo";
    case "shootout":    return "Rigori";
    default:            return "LIVE";
  }
}

function elapsedSecs(from: string | null): number {
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
}

function MatchDetail() {
  useStoreVersion();
  const { matchId } = Route.useParams();
  const m = getMatch(matchId);

  // live-minute tick — hooks must come before any conditional throw
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (m?.status !== "live") return;
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [m?.status]);

  if (!m) throw notFound();

  // compute the live minute string (changes every tick)
  const minuteLabel = (() => {
    void tick;
    if (m.status !== "live") return undefined;
    if (m.currentPhase === "first_half" && m.firstHalfStartedAt) {
      const min = Math.min(20, Math.ceil(elapsedSecs(m.firstHalfStartedAt) / 60) || 1);
      return `${min}'`;
    }
    if (m.currentPhase === "second_half" && m.secondHalfStartedAt) {
      const min = Math.min(40, 20 + (Math.ceil(elapsedSecs(m.secondHalfStartedAt) / 60) || 1));
      return `${min}'`;
    }
    return undefined; // half_time and shootout: show phase label only
  })();

  const home = getTeam(m.homeTeamId);
  const away = getTeam(m.awayTeamId);
  const isLive = m.status === "live";
  const hasScore = m.status === "live" || m.status === "finished" || m.status === "locked";

  const date = new Date(m.date);
  const dateLabel = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // group events by period
  const periods = ["first_half", "second_half", "shootout"] as const;
  const eventsByPeriod = periods
    .map(p => ({ key: p, events: m.events.filter(e => e.period === p) }))
    .filter(g => g.events.length > 0);
  const unpaged = m.events.filter(e => !e.period);

  // cards
  const yellowCards = m.events.filter(e => e.type === "yellow_card");
  const redCards    = m.events.filter(e => e.type === "red_card");

  // shootout sub-scores
  const homeSO = m.events.filter(e => e.period === "shootout" && e.team === "home" && e.type === "shootout_goal").length;
  const awaySO = m.events.filter(e => e.period === "shootout" && e.team === "away" && e.type === "shootout_goal").length;

  return (
    <AppShell>
      <Link to="/calendario" className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block">
        ← Calendario
      </Link>

      {/* Header card */}
      <section className="rounded-2xl border bg-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {phaseLabel[m.phase]}{m.matchday > 0 ? ` · G${m.matchday}` : ""}
          </span>
          <StatusBadge m={m} minuteLabel={minuteLabel} />
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
          <TeamCol team={home} name={m.homeLabel} align="left" />
          <div className="text-center min-w-[80px]">
            {hasScore ? (
              <>
                <div className="text-5xl sm:text-6xl font-black tabular-nums leading-none">
                  {m.homeScore} <span className="text-2xl text-muted-foreground">:</span> {m.awayScore}
                </div>
                {(homeSO > 0 || awaySO > 0) && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    reg. {(m.homeScore ?? 0) - homeSO}–{(m.awayScore ?? 0) - awaySO} · rig. {homeSO}–{awaySO}
                  </div>
                )}
                {m.shootoutWinner && m.status !== "live" && (
                  <div className="text-[11px] font-bold text-primary mt-0.5">
                    Vince ai rigori: {m.shootoutWinner === "home" ? (home?.name ?? m.homeLabel) : (away?.name ?? m.awayLabel)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-3xl font-black text-muted-foreground">vs</div>
            )}
          </div>
          <TeamCol team={away} name={m.awayLabel} align="right" />
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <span className="capitalize">{dateLabel}</span> · {timeLabel}
          {m.venue && <span> · {m.venue}</span>}
        </div>
        {m.highlight && (
          <div className="text-center text-xs font-bold text-accent uppercase tracking-wide mt-1">{m.highlight}</div>
        )}
      </section>

      {/* Live phase banner */}
      {isLive && (
        <div className="rounded-xl border border-live/40 bg-live/5 px-4 py-2.5 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-live live-pulse shrink-0" />
          <span className="text-sm font-bold text-live">{currentPhaseLabel(m)}</span>
          {minuteLabel && (
            <span className="ml-auto text-sm font-black text-live tabular-nums">{minuteLabel}</span>
          )}
        </div>
      )}

      {/* Cards summary */}
      {(yellowCards.length > 0 || redCards.length > 0) && (
        <section className="rounded-xl border bg-card p-3 mb-4">
          <h2 className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Cartellini</h2>
          <div className="flex flex-wrap gap-2">
            {yellowCards.map(ev => (
              <CardChip key={ev.id} ev={ev} color="bg-yellow-400/15 text-yellow-700 dark:text-yellow-400" label="Giallo" />
            ))}
            {redCards.map(ev => (
              <CardChip key={ev.id} ev={ev} color="bg-red-500/15 text-red-600 dark:text-red-400" label="Rosso" />
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {m.events.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Timeline
          </h2>
          <div className="rounded-xl border bg-card overflow-hidden">
            {unpaged.length > 0 && <EventGroup events={unpaged} home={home?.id} away={away?.id} />}
            {eventsByPeriod.map(g => (
              <div key={g.key}>
                <div className="px-3 py-1 bg-secondary/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                  {PERIOD_LABEL[g.key]}
                </div>
                <EventGroup events={g.events} home={home?.id} away={away?.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {m.events.length === 0 && hasScore && (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nessun evento registrato.
        </div>
      )}
    </AppShell>
  );
}

function StatusBadge({ m, minuteLabel }: { m: Match; minuteLabel?: string }) {
  if (m.status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-live text-xs font-bold uppercase">
        <span className="w-2 h-2 rounded-full bg-live live-pulse" />
        {currentPhaseLabel(m)}
        {minuteLabel && <span className="font-black tabular-nums">{minuteLabel}</span>}
      </span>
    );
  }
  if (m.status === "finished") {
    return <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Finale</span>;
  }
  if (m.status === "locked") {
    return <span className="flex items-center gap-1 text-muted-foreground text-xs font-bold uppercase"><Lock className="w-3.5 h-3.5" /> Bloccata</span>;
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs font-bold uppercase">
      <Calendar className="w-3.5 h-3.5" /> In programma
    </span>
  );
}

function TeamCol({ team, name, align }: {
  team: ReturnType<typeof getTeam>;
  name?: string;
  align: "left" | "right";
}) {
  const label = team?.name ?? name ?? "—";
  const badge = team
    ? <TeamBadge teamId={team.id} size={44} />
    : <div className="w-11 h-11 rounded-xl bg-secondary shrink-0" />;

  const inner = align === "right" ? (
    // mobile: stack badge on top, name below, both right-aligned
    // desktop: name left of badge, group pushed right
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
      <span className="font-bold text-sm sm:text-base leading-tight text-right">{label}</span>
      {badge}
    </div>
  ) : (
    // mobile: badge on top, name below, both left-aligned
    // desktop: badge left of name
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
      {badge}
      <span className="font-bold text-sm sm:text-base leading-tight">{label}</span>
    </div>
  );

  if (team) {
    return (
      <Link to="/squadre/$teamId" params={{ teamId: team.id }} className="block hover:text-primary transition-colors">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function CardChip({ ev, color, label }: { ev: MatchEvent; color: string; label: string }) {
  const p = getPlayer(ev.playerId);
  return (
    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${color}`}>
      <AlertCircle className="w-3 h-3" />
      {label} · {p?.name ?? "—"}
    </span>
  );
}

function EventGroup({ events, home, away }: {
  events: MatchEvent[];
  home?: string;
  away?: string;
}) {
  return (
    <>
      {events.map(ev => {
        const isHome = ev.team === "home";
        const teamId = isHome ? home : away;
        const player = getPlayer(ev.playerId);
        const isCard = ev.type === "yellow_card" || ev.type === "red_card";
        const isMiss = ev.type === "shootout_miss";
        return (
          <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
            <span className="w-9 text-center font-bold tabular-nums text-sm text-muted-foreground shrink-0">{ev.minute}'</span>
            {teamId ? <TeamBadge teamId={teamId} size={20} /> : <div className="w-5 h-5 rounded-full bg-secondary" />}
            <div className="flex-1 min-w-0">
              {player
                ? <Link to="/giocatori/$playerId" params={{ playerId: player.id }} className="text-sm font-semibold hover:text-primary truncate block">{player.name}</Link>
                : <div className="text-sm font-semibold text-muted-foreground">—</div>}
              <div className="text-[11px] text-muted-foreground">{ev.label}</div>
            </div>
            {ev.weight > 1 && (
              <span className="text-[10px] font-bold bg-violet-500/15 text-violet-600 px-1.5 py-0.5 rounded">×{ev.weight}</span>
            )}
            {isCard ? (
              <span className={`w-4 h-5 rounded-sm shrink-0 ${ev.type === "yellow_card" ? "bg-yellow-400" : "bg-red-600"}`} />
            ) : isMiss ? (
              <span className="text-xs font-black text-rose-500 shrink-0">✗</span>
            ) : (
              <Goal className={`w-4 h-4 shrink-0 ${ev.type === "own_goal" ? "text-destructive" : ev.type === "shootout_goal" ? "text-emerald-500" : "text-primary"}`} />
            )}
          </div>
        );
      })}
    </>
  );
}
