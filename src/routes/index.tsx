import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { getFinalPodium, getTeam, topScorers, type PodiumResult, type ScorerRow } from "@/lib/mockData";
import { Calendar, Trophy, Zap } from "lucide-react";
import clBlack from "@/assets/logos/cl-black.png";
import clWhite from "@/assets/logos/cl-white.png";
import cavelabBlack from "@/assets/logos/cavelab-black.png";
import cavelabWhite from "@/assets/logos/cavelab-white.png";

// Le foto della finalissima vivono in public/finale/ e vanno riferite con
// percorso assoluto: BASE_URL è "/" in dev standalone ma "/league/" quando
// l'app è innestata sotto il sito principale (vedi router.tsx).
const withBase = (path: string) => `${import.meta.env.BASE_URL}${path}`;

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
          background: "oklch(0.22 0.035 58 / 0.85)",
          border: "1px solid oklch(0.75 0.19 58 / 0.4)",
          boxShadow: "0 0 24px oklch(0.75 0.19 58 / 0.12), inset 0 1px 0 oklch(1 0 0 / 0.06)",
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
        background: "linear-gradient(160deg, oklch(0.155 0.03 58) 0%, oklch(0.088 0.018 58) 100%)",
      }}
    >
      {/* warm radial glow rising from below */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 120%, oklch(0.655 0.157 58 / 0.42) 0%, transparent 65%)",
        }}
      />
      {/* top-edge accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.75 0.19 58 / 0.55) 50%, transparent 100%)",
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

// ── podium row inside the results hero — sfondo pieno (non più un velo sulla
// foto) perché l'informazione deve leggersi al primo sguardo, non dedotta ──
function PodiumRow({
  rank, label, team, score, highlight,
}: { rank: number; label: string; team: { name: string }; score?: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 backdrop-blur-sm ${highlight ? "py-3.5" : "py-3"}`}
      style={
        highlight
          ? { background: "oklch(0.70 0.20 72 / 0.94)", boxShadow: "0 4px 18px oklch(0 0 0 / 0.35)" }
          : { background: "oklch(0.14 0.02 58 / 0.82)", border: "1px solid oklch(1 0 0 / 0.14)" }
      }
    >
      {highlight ? (
        <Trophy className="w-7 h-7 shrink-0" style={{ color: "oklch(0.16 0.03 58)" }} />
      ) : (
        <span className="w-7 text-center font-black text-white/55 text-lg shrink-0">{rank}</span>
      )}
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: highlight ? "oklch(0.20 0.04 58 / 0.75)" : "rgba(255,255,255,0.55)" }}
        >
          {label}
        </div>
        <div
          className={`font-black truncate ${highlight ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
          style={{ color: highlight ? "oklch(0.14 0.03 58)" : "#fff" }}
        >
          {team.name}
        </div>
      </div>
      {score && (
        <div
          className="text-sm font-bold shrink-0 tabular-nums"
          style={{ color: highlight ? "oklch(0.20 0.04 58 / 0.8)" : "rgba(255,255,255,0.6)" }}
        >
          {score}
        </div>
      )}
    </div>
  );
}

// ── capocannoniere: riquadro a parte, ancora più evidente del podio ──────────
function TopScorerCallout({ scorer }: { scorer: ScorerRow }) {
  const team = getTeam(scorer.player.teamId);
  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3.5 backdrop-blur-sm"
      style={{ background: "oklch(0.63 0.21 35 / 0.94)", boxShadow: "0 4px 18px oklch(0 0 0 / 0.35)" }}
    >
      <Zap className="w-7 h-7 shrink-0" style={{ color: "oklch(0.16 0.03 35)" }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.20 0.04 35 / 0.75)" }}>
          Capocannoniere del torneo
        </div>
        <div className="font-black text-xl sm:text-2xl truncate" style={{ color: "oklch(0.14 0.03 35)" }}>
          {scorer.player.name}
        </div>
        {team && <div className="text-xs font-semibold truncate" style={{ color: "oklch(0.20 0.04 35 / 0.75)" }}>{team.name}</div>}
      </div>
      <div className="text-3xl sm:text-4xl font-black tabular-nums shrink-0 leading-none" style={{ color: "oklch(0.14 0.03 35)" }}>
        {scorer.goals}
        <span className="block text-[9px] font-bold tracking-widest text-center mt-0.5" style={{ color: "oklch(0.20 0.04 35 / 0.7)" }}>
          GOL
        </span>
      </div>
    </div>
  );
}

// ── results hero — l'unico contenuto della home: podio + sfondo cinematico
// (l'alzata della coppa di Real Madrink alla Super Bowl Night) ───────────────
function ResultsHero({ podium, topScorer }: { podium: PodiumResult; topScorer?: ScorerRow }) {
  return (
    <section className="relative overflow-hidden rounded-2xl mb-6 text-white">
      <img
        src={withBase("finale/hero-trofeo.jpg")}
        alt="Real Madrink alza la coppa della Cave League 2026 tra fuochi d'artificio e coriandoli dorati"
        width={1600}
        height={1067}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Velo pieno su tutta l'immagine, non solo in basso: le card sotto
          sono già opache di loro, ma il testo del titolo poggia solo sul
          velo e deve restare leggibile ovunque, non solo vicino al bordo. */}
      <div className="absolute inset-0" style={{ background: "oklch(0.06 0.02 58 / 0.55)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, oklch(0.05 0.02 58 / 0.98) 0%, oklch(0.06 0.02 58 / 0.9) 38%, oklch(0.08 0.02 58 / 0.55) 68%, oklch(0.10 0.03 58 / 0.25) 100%)",
        }}
      />
      <div className="relative z-10 p-5 sm:p-8 pt-8 sm:pt-12">
        <div className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-white/75">
          5 – 14 Giugno 2026 · Cave · Torneo concluso
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mt-2 leading-none">L'albo d'oro 2026</h1>
        <p className="mt-3 max-w-lg text-white/85 text-sm sm:text-base font-medium">
          Dieci giorni di partite, l'Anfiteatro pieno e la Super Bowl Night finale: ecco come è andata a finire.
        </p>

        <div className="mt-7 grid gap-2.5 max-w-md">
          <PodiumRow rank={1} label="Campione" team={podium.champion} score={podium.finalScore} highlight />
          <PodiumRow rank={2} label="Finalista" team={podium.runnerUp} />
          {podium.third && <PodiumRow rank={3} label="Terzo posto" team={podium.third} score={podium.thirdScore} />}
          {topScorer && <TopScorerCallout scorer={topScorer} />}
        </div>
      </div>
    </section>
  );
}

// ── foto della finalissima (Drive associazione, cartella CaveLeague 2K26 ›
// DAY 10 › Finalissima) ───────────────────────────────────────────────────────
const FINALE_PHOTOS = [
  "finale-1.jpg", "finale-48.jpg", "finale-5.jpg", "finale-41.jpg",
  "finale-9.jpg", "finale-13.jpg", "finale-17.jpg", "finale-45.jpg",
].map(file => withBase(`finale/${file}`));

function FinalePhotos() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {FINALE_PHOTOS.map(src => (
        <a
          key={src}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-4/3 rounded-lg overflow-hidden border group"
        >
          <img
            src={src}
            alt="Un momento della finalissima Cave League 2026"
            loading="lazy"
            width={1000}
            height={750}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </a>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [{ title: "Home — Cave League 2026" }] }),
});

function HomePage() {
  const podium = getFinalPodium();
  const scorers = topScorers(5);

  return (
    <AppShell>
      {/* Torneo concluso: podio della finalissima al posto del countdown
          pre-evento. Finché la finale non è segnata come giocata, la home
          resta nella modalità "hype" di prima. */}
      {podium && <ResultsHero podium={podium} topScorer={scorers[0]} />}

      {/* Countdown — FIRST, disappears automatically when target is reached */}
      {!podium && <Countdown />}

      {/* Hero */}
      {!podium && (
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-pitch text-primary-foreground p-5 sm:p-8 mb-6">
        {/* Two-column layout: text left, logos right */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">

          {/* Left / top: text + CTAs */}
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest opacity-70 font-bold">5 — 14 Giugno 2026 · Cave</div>
            <h1 className="text-4xl sm:text-6xl font-black mt-2 leading-none">CAVE LEAGUE</h1>
            <p className="mt-3 max-w-md opacity-80 text-sm sm:text-base">Il torneo che incendia l'estate. Stile Kings League, cuore di Cave.</p>
          </div>

          {/* Right / bottom: logo pair — horizontal, prominent */}
          <div className="flex justify-center sm:block">
            <HeroBrandLogos
              clSize="h-24 w-24 sm:h-44 sm:w-44"
              labSize="h-20 w-20 sm:h-36 sm:w-36"
              gap="gap-3 sm:gap-6"
            />
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -top-8 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </section>
      )}

      {/* Marcatori: unica lista rimasta perché è l'unica completa per quello
          che dichiara di essere (i primi 5, non "tutti"). */}
      <div className="max-w-md">
        <SectionHeader title="Top 5 marcatori" />
        <div className="rounded-xl border bg-card overflow-hidden">
          {scorers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Nessun goal ancora.</div>
          ) : scorers.map((row, i) => (
            <div key={row.player.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
              <span className="w-6 text-center font-bold text-muted-foreground text-sm">{i + 1}</span>
              <TeamBadge teamId={row.player.teamId} size={24} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm">{row.player.name}</div>
                <div className="text-xs text-muted-foreground">{getTeam(row.player.teamId)?.shortName}</div>
              </div>
              <span className="font-bold tabular-nums text-accent flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{row.goals}</span>
            </div>
          ))}
        </div>
      </div>

      {podium && (
        <div className="mt-6">
          <SectionHeader title="La finalissima in foto" />
          <FinalePhotos />
        </div>
      )}
    </AppShell>
  );
}
