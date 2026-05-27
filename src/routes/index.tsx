import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { TeamBadge } from "@/components/TeamBadge";
import { SectionHeader } from "@/components/SectionHeader";
import {
  computeStandings, getTeam, matches, calendarEvents,
  topScorers, useStoreVersion,
  type CalendarEvent,
} from "@/lib/mockData";
import { Calendar, Trophy, Zap, Star } from "lucide-react";
import clBlack from "@/assets/logos/cl-black.png";
import clWhite from "@/assets/logos/cl-white.png";
import cavelabBlack from "@/assets/logos/cavelab-black.png";
import cavelabWhite from "@/assets/logos/cavelab-white.png";

// ── Countdown target: Friday 5 June 2026, 19:00 CEST (Italy = UTC+2 in summer)
const COUNTDOWN_TARGET = new Date("2026-06-05T19:00:00+02:00");

// ── hook: null while SSR to prevent hydration mismatch ───────────────────────
function useCountdown(target: Date): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => Math.max(0, target.getTime() - Date.now());
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  // target is a module-level constant — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return remaining;
}

// ── Countdown digit block ────────────────────────────────────────────────────
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-xl text-center w-[62px] sm:w-[82px] py-3 sm:py-5"
        style={{
          background: "oklch(0.22 0.035 40 / 0.85)",
          border: "1px solid oklch(0.72 0.25 43 / 0.4)",
          boxShadow: "0 0 24px oklch(0.72 0.25 43 / 0.12), inset 0 1px 0 oklch(1 0 0 / 0.06)",
        }}
      >
        <span className="text-[2.25rem] sm:text-5xl font-black tabular-nums leading-none text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
    </div>
  );
}

// ── Countdown section — cinematic dark hero, completely distinct from the banner
function Countdown() {
  const remaining = useCountdown(COUNTDOWN_TARGET);

  // null = SSR / not yet hydrated; <= 0 = expired — both: render nothing
  if (remaining === null || remaining <= 0) return null;

  const days    = Math.floor(remaining / 86_400_000);
  const hours   = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000)  / 60_000);
  const seconds = Math.floor((remaining % 60_000)     / 1_000);

  return (
    <section
      className="relative overflow-hidden rounded-2xl mb-6 px-5 pt-7 pb-8 sm:px-10 sm:pt-10 sm:pb-12 text-center text-white"
      style={{
        background: "linear-gradient(160deg, oklch(0.155 0.03 40) 0%, oklch(0.088 0.018 38) 100%)",
      }}
    >
      {/* warm radial glow rising from below */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 120%, oklch(0.62 0.23 43 / 0.42) 0%, transparent 65%)",
        }}
      />
      {/* top-edge accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.72 0.25 43 / 0.55) 50%, transparent 100%)",
        }}
      />

      <div className="relative z-10">
        {/* eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="w-8 h-px bg-white/15" />
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-white/35">
            Cave League 2026
          </span>
          <span className="w-8 h-px bg-white/15" />
        </div>

        <p className="text-base sm:text-lg font-black uppercase tracking-widest text-white/70 mb-6">
          Inizia fra
        </p>

        {/* digit units */}
        <div className="flex items-start justify-center gap-1.5 sm:gap-3 mb-7">
          <CountdownUnit value={days}    label="giorni" />
          <span className="text-3xl sm:text-4xl font-black text-primary/45 mt-3 sm:mt-5 leading-none select-none">:</span>
          <CountdownUnit value={hours}   label="ore" />
          <span className="text-3xl sm:text-4xl font-black text-primary/45 mt-3 sm:mt-5 leading-none select-none">:</span>
          <CountdownUnit value={minutes} label="min" />
          <span className="text-3xl sm:text-4xl font-black text-primary/45 mt-3 sm:mt-5 leading-none select-none">:</span>
          <CountdownUnit value={seconds} label="sec" />
        </div>

        {/* date / venue */}
        <div className="flex items-center justify-center gap-1.5 text-sm text-white/50 font-medium">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-primary/65" />
          <span>Venerdì 5 Giugno 2026 · Anfiteatro Cave · ore 19:00</span>
        </div>
      </div>

      {/* decorative corner blobs */}
      <div className="absolute -left-10 top-0 w-36 h-36 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -right-10 top-0 w-36 h-36 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
    </section>
  );
}

// ── simple event card for non-match calendar items ────────────────────────────
function TodayEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 flex items-start gap-3 hover:border-primary/40 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
        <Star className="w-4 h-4 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm">{event.title}</div>
          {event.startTime && (
            <span className="text-xs text-muted-foreground shrink-0">{event.startTime}</span>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ── brand logo pair for the hero banner ──────────────────────────────────────
function HeroBrandLogos({ clSize, labSize, gap = "gap-4" }: {
  clSize: string; labSize: string; gap?: string;
}) {
  return (
    <div className={`flex items-center ${gap} shrink-0`}>
      <img src={clBlack}      alt="Cave League" width={1000} height={1000} className={`${clSize} object-contain block dark:hidden`} />
      <img src={clWhite}      alt="Cave League" width={1000} height={1000} className={`${clSize} object-contain hidden dark:block`} />
      <img src={cavelabBlack} alt="Cave Lab"    width={1000} height={1000} className={`${labSize} object-contain block dark:hidden`} />
      <img src={cavelabWhite} alt="Cave Lab"    width={1000} height={1000} className={`${labSize} object-contain hidden dark:block`} />
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [{ title: "Home — Cave League 2026" }] }),
});

function HomePage() {
  useStoreVersion();
  const standings = computeStandings().slice(0, 5);
  const scorers = topScorers(5);
  const featured =
    matches.find(m => m.status === "live") ??
    matches.find(m => m.status === "scheduled" && m.highlight) ??
    matches.find(m => m.status === "finished" && m.highlight) ??
    matches[0];

  const todayStr = new Date().toDateString();

  const todayMatches = matches
    .filter(m => new Date(m.date).toDateString() === todayStr)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const todayCalEvents = calendarEvents
    .filter(e => new Date(e.date + "T00:00:00").toDateString() === todayStr)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const hasToday = todayMatches.length > 0 || todayCalEvents.length > 0;

  return (
    <AppShell>
      {/* Countdown — FIRST, disappears automatically when target is reached */}
      <Countdown />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-pitch text-primary-foreground p-5 sm:p-8 mb-6">
        {/* Two-column layout: text left, logos right */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">

          {/* Left / top: text + CTAs */}
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest opacity-70 font-bold">5 — 14 Giugno 2026 · Cave</div>
            <h1 className="text-4xl sm:text-6xl font-black mt-2 leading-none">CAVE LEAGUE</h1>
            <p className="mt-3 max-w-md opacity-80 text-sm sm:text-base">Il torneo che incendia l'estate. Stile Kings League, cuore di Cave.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link to="/calendario" className="bg-white/15 backdrop-blur border border-white/25 px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/25 transition-colors">
                <Calendar className="w-4 h-4" /> Calendario
              </Link>
              <Link to="/classifica" className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold border border-white/15 inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors">
                <Trophy className="w-4 h-4" /> Classifica
              </Link>
            </div>
          </div>

          {/* Right / bottom: logo pair — horizontal, prominent */}
          <HeroBrandLogos
            clSize="h-24 w-24 sm:h-44 sm:w-44"
            labSize="h-20 w-20 sm:h-36 sm:w-36"
            gap="gap-3 sm:gap-6"
          />
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -top-8 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </section>

      {/* Featured */}
      {featured ? (
        <>
          <SectionHeader title="In evidenza" />
          <div className="mb-2"><MatchCard match={featured} /></div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground mb-4">
          Il calendario verrà pubblicato a breve.
        </div>
      )}

      {/* Today */}
      <SectionHeader title="Eventi di oggi" link="/calendario" />
      <div className="grid gap-2 mb-6">
        {!hasToday ? (
          <div className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            Nessun evento oggi.
          </div>
        ) : (
          <>
            {todayMatches.map(m => <MatchCard key={m.id} match={m} />)}
            {todayCalEvents.map(e => <TodayEventCard key={e.id} event={e} />)}
          </>
        )}
      </div>

      {/* Two col */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Top 5 squadre" link="/classifica" />
          <div className="rounded-xl border bg-card overflow-hidden">
            {standings.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Nessuna squadra ancora.</div>
            ) : standings.map((s, i) => {
              const t = getTeam(s.teamId);
              if (!t) return null;
              return (
                <Link to="/squadre/$teamId" params={{ teamId: t.id }} key={s.teamId} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-secondary/50">
                  <span className="w-6 text-center font-bold text-muted-foreground text-sm">{i + 1}</span>
                  <TeamBadge teamId={t.id} size={28} />
                  <span className="font-semibold flex-1 truncate text-sm">{t.name}</span>
                  <span className="font-bold tabular-nums text-primary">{s.points}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <SectionHeader title="Top 5 marcatori" link="/statistiche" />
          <div className="rounded-xl border bg-card overflow-hidden">
            {scorers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Nessun goal ancora.</div>
            ) : scorers.map((row, i) => (
              <Link to="/giocatori/$playerId" params={{ playerId: row.player.id }} key={row.player.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-secondary/50">
                <span className="w-6 text-center font-bold text-muted-foreground text-sm">{i + 1}</span>
                <TeamBadge teamId={row.player.teamId} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{row.player.name}</div>
                  <div className="text-xs text-muted-foreground">{getTeam(row.player.teamId)?.shortName}</div>
                </div>
                <span className="font-bold tabular-nums text-accent flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{row.goals}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
