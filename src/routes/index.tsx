import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { TeamBadge } from "@/components/TeamBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { computeStandings, getTeam, matches, matchesOnDay, topScorers, TOURNAMENT_TODAY, useStoreVersion } from "@/lib/mockData";
import { Calendar, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [{ title: "Home — Cave League 2026" }] }),
});

function HomePage() {
  useStoreVersion();
  const standings = computeStandings().slice(0, 5);
  const scorers = topScorers(5);
  const today = matchesOnDay(TOURNAMENT_TODAY);
  const featured =
    matches.find(m => m.status === "live") ??
    matches.find(m => m.status === "scheduled" && m.highlight) ??
    matches.find(m => m.status === "finished" && m.highlight) ??
    matches[0];

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-pitch text-primary-foreground p-5 sm:p-8 mb-6">
        <div className="relative z-10">
          <div className="text-xs uppercase tracking-widest opacity-80 font-bold">5 — 14 Giugno 2026 · Cave</div>
          <h1 className="text-3xl sm:text-5xl font-black mt-2">CAVE LEAGUE</h1>
          <p className="mt-2 max-w-md opacity-90 text-sm sm:text-base">Il torneo che incendia l'estate. Stile Kings League, cuore di Cave.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/calendario" className="bg-background text-foreground px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Calendario
            </Link>
            <Link to="/classifica" className="bg-background/15 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold border border-white/20 inline-flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Classifica
            </Link>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
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
      <SectionHeader title="Partite di oggi" link="/calendario" />
      <div className="grid gap-2">
        {today.length === 0 ? (
          <div className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">Nessuna partita oggi.</div>
        ) : today.map(m => <MatchCard key={m.id} match={m} />)}
      </div>

      {/* Two col */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <SectionHeader title="Top 5 squadre" link="/classifica" />
          <div className="rounded-xl border bg-card overflow-hidden">
            {standings.map((s, i) => {
              const t = getTeam(s.teamId)!;
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
