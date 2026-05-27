import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { TeamBadge } from "@/components/TeamBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { computeStandings, getPlayer, getPlayerStats, getTeam, getTeamAggregate, getTeamMatches, getTeamPlayers, PlayerRole, teamTextColor, useStoreVersion } from "@/lib/mockData";

export const Route = createFileRoute("/squadre/$teamId")({
  component: TeamDetail,
  head: ({ params }) => ({ meta: [{ title: `${getTeam(params.teamId)?.name ?? "Squadra"} — Cave League` }] }),
});

const roleLabel: Record<PlayerRole, string> = { p: "Portiere", g: "Giocatore", pres: "Presidente" };
const roleColor: Record<PlayerRole, string> = {
  p: "bg-accent/20 text-accent-foreground",
  g: "bg-primary/15 text-primary",
  pres: "bg-destructive/15 text-destructive",
};

function TeamDetail() {
  useStoreVersion();
  const { teamId } = Route.useParams();
  const team = getTeam(teamId);
  if (!team) throw notFound();
  const players = getTeamPlayers(teamId).sort((a, b) => {
    const order = { pres: 0, p: 1, g: 2 } as const;
    return order[a.role] - order[b.role] || a.number - b.number;
  });
  const teamMatches = getTeamMatches(teamId);
  const recent = teamMatches.filter(m => m.status === "finished").slice(-4).reverse();
  const next = teamMatches.filter(m => m.status === "scheduled" || m.status === "live").slice(0, 3);
  const agg = getTeamAggregate(teamId);
  const standings = computeStandings();
  const position = standings.findIndex(s => s.teamId === teamId) + 1;
  const points = standings.find(s => s.teamId === teamId)?.points ?? 0;
  const topScorerPlayer = agg.topScorer ? getPlayer(agg.topScorer.playerId) : undefined;

  return (
    <AppShell>
      <Link to="/squadre" className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block">← Squadre</Link>

      <div className="rounded-2xl p-5 mb-4 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`, color: teamTextColor(team.color) }}>
        <TeamBadge teamId={team.id} size={64} />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-widest opacity-80 font-bold">{team.shortName}</div>
          <h1 className="text-3xl font-black">{team.name}</h1>
          <div className="text-sm opacity-90 mt-1">{position}° in classifica · {points} pt</div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        <Stat label="Giocate" value={agg.played} />
        <Stat label="V" value={agg.wins} />
        <Stat label="N*" value={agg.draws} />
        <Stat label="P" value={agg.losses} />
        <Stat label="GF" value={agg.goalsFor} />
        <Stat label="GS" value={agg.goalsAgainst} />
      </div>
      <p className="text-[11px] text-muted-foreground -mt-4 mb-6">* pareggi nei tempi reg. (decisi ai rigori)</p>

      {topScorerPlayer && (
        <div className="rounded-xl border bg-card p-3 mb-6 flex items-center gap-3">
          <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Capocannoniere</div>
          <Link to="/giocatori/$playerId" params={{ playerId: topScorerPlayer.id }} className="flex items-center gap-2 ml-auto hover:text-primary">
            <span className="font-bold text-sm">{topScorerPlayer.name}</span>
            <span className="text-primary font-black tabular-nums">{agg.topScorer!.goals} goal</span>
          </Link>
        </div>
      )}

      <SectionHeader title="Roster" />
      <div className="rounded-xl border bg-card overflow-hidden mb-2">
        {players.map(p => {
          const s = getPlayerStats(p.id);
          return (
            <Link
              to="/giocatori/$playerId"
              params={{ playerId: p.id }}
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-secondary/40"
            >
              <span className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center font-bold text-sm tabular-nums">{p.number}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.appearances} pres
                  {p.role !== "pres" && ` · ${s.goals} goal`}
                  {p.role === "p" && ` · ${s.cleanSheets} CS`}
                </div>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${roleColor[p.role]}`}>{roleLabel[p.role]}</span>
            </Link>
          );
        })}
      </div>

      {next.length > 0 && (<>
        <SectionHeader title="Prossime partite" />
        <div className="grid gap-2 mb-4">{next.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
      </>)}

      {recent.length > 0 && (<>
        <SectionHeader title="Risultati recenti" />
        <div className="grid gap-2">{recent.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
      </>)}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}
