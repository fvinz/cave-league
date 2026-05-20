import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import { teams, getTeamPlayers } from "@/lib/mockData";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/squadre/")({
  component: SquadrePage,
  head: () => ({ meta: [{ title: "Squadre — Cave League" }] }),
});

function SquadrePage() {
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-4">Squadre</h1>
      <div className="grid sm:grid-cols-2 gap-2">
        {sorted.map(t => {
          const players = getTeamPlayers(t.id);
          return (
            <Link
              to="/squadre/$teamId"
              params={{ teamId: t.id }}
              key={t.id}
              className="rounded-xl border bg-card p-3 flex items-center gap-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <TeamBadge teamId={t.id} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">{players.length} giocatori</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
