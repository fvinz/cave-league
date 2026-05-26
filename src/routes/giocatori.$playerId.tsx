import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  getPlayer, getPlayerStats, getTeam, getTeamMatches,
  PlayerRole, useStoreVersion,
} from "@/lib/mockData";

export const Route = createFileRoute("/giocatori/$playerId")({
  component: PlayerDetail,
  head: ({ params }) => ({ meta: [{ title: `${getPlayer(params.playerId)?.name ?? "Giocatore"} — Cave League` }] }),
});

const roleLabel: Record<PlayerRole, string> = { p: "Portiere", g: "Giocatore", pres: "Presidente" };

function PlayerDetail() {
  useStoreVersion();
  const { playerId } = Route.useParams();
  const player = getPlayer(playerId);
  if (!player) throw notFound();
  const team = getTeam(player.teamId)!;
  const s = getPlayerStats(player.id);
  const teamMatches = getTeamMatches(team.id).filter(m => m.status === "finished" || m.status === "live");

  const stats = [
    { label: "Presenze",   value: s.appearances },
    { label: "Goal",       value: s.goals },
    { label: "Autogoal",   value: s.ownGoals },
    ...(player.role === "p" ? [{ label: "Clean sheet", value: s.cleanSheets }] : []),
  ];

  const cards = [
    ...(s.yellowCards > 0 ? [{ label: "Gialli", value: s.yellowCards, color: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-400" }] : []),
    ...(s.redCards > 0    ? [{ label: "Rossi",  value: s.redCards,    color: "bg-red-500/15 text-red-600 dark:text-red-400" }] : []),
  ];

  return (
    <AppShell>
      <Link to="/squadre/$teamId" params={{ teamId: team.id }} className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block">
        ← {team.name}
      </Link>

      <div className="rounded-2xl border bg-card p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black text-white shrink-0"
            style={{ backgroundColor: team.color }}>
            {player.number || "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{roleLabel[player.role]}</div>
            <h1 className="text-2xl sm:text-3xl font-black">{player.name}</h1>
            <Link to="/squadre/$teamId" params={{ teamId: team.id }} className="flex items-center gap-2 mt-2 hover:text-primary">
              <TeamBadge teamId={team.id} size={24} />
              <span className="font-semibold text-sm">{team.name}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(stats.length, 4)} gap-2 mb-4`}>
        {stats.map(st => (
          <div key={st.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{st.label}</div>
            <div className="text-3xl font-black mt-1 tabular-nums text-primary">{st.value}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {cards.map(c => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
              <div className="text-xs uppercase font-semibold tracking-wider opacity-70">{c.label}</div>
              <div className="text-3xl font-black mt-1 tabular-nums">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Note</div>
        <p className="text-xs text-muted-foreground">
          Le presenze sono calcolate sul numero di partite disputate dalla squadra.
          {player.role === "p" && " Le clean sheet sono assegnate al portiere quando l'avversaria non segna (inclusi goal da rigori)."}
          {` Partite squadra: ${teamMatches.length}.`}
        </p>
      </div>
    </AppShell>
  );
}
