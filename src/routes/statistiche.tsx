import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import { getTeam, topScorers, topCleanSheets, useStoreVersion } from "@/lib/mockData";

export const Route = createFileRoute("/statistiche")({
  component: StatsPage,
  head: () => ({ meta: [{ title: "Statistiche — Cave League" }] }),
});

function StatsPage() {
  useStoreVersion();
  const [tab, setTab] = useState<"scorers" | "keepers">("scorers");
  const rows = tab === "scorers"
    ? topScorers(20).map(r => ({ player: r.player, value: r.goals }))
    : topCleanSheets(20).map(r => ({ player: r.player, value: r.cleanSheets }));

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-4">Statistiche</h1>

      <div className="inline-flex bg-secondary rounded-lg p-1 mb-4">
        <TabBtn active={tab === "scorers"} onClick={() => setTab("scorers")}>Marcatori</TabBtn>
        <TabBtn active={tab === "keepers"} onClick={() => setTab("keepers")}>Porta inviolata</TabBtn>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-3 py-2 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground grid grid-cols-[24px_1fr_auto] gap-3">
          <span>#</span>
          <span>Giocatore</span>
          <span>{tab === "scorers" ? "Goal" : "CS"}</span>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Nessun dato disponibile.</div>
        ) : rows.map((r, i) => (
          <Link
            to="/giocatori/$playerId"
            params={{ playerId: r.player.id }}
            key={r.player.id}
            className="grid grid-cols-[24px_1fr_auto] gap-3 items-center px-3 py-2.5 border-t hover:bg-secondary/30"
          >
            <span className="text-sm font-bold text-muted-foreground text-center">{i + 1}</span>
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamBadge teamId={r.player.teamId} size={28} />
              <div className="min-w-0">
                <div className="font-semibold truncate text-sm">{r.player.name}</div>
                <div className="text-xs text-muted-foreground">{getTeam(r.player.teamId)?.name}</div>
              </div>
            </div>
            <span className="font-bold tabular-nums text-primary text-lg">{r.value}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
