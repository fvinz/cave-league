import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import { getTeam, topScorers, topCleanSheets, topYellowCards, topRedCards, useStoreVersion } from "@/lib/mockData";

export const Route = createFileRoute("/statistiche")({
  component: StatsPage,
  head: () => ({ meta: [{ title: "Statistiche — Cave League" }] }),
});

type Tab = "scorers" | "keepers" | "yellow" | "red";

const TAB_META: Record<Tab, { label: string; col: string; valueClass: string }> = {
  scorers: { label: "Marcatori",      col: "Goal", valueClass: "text-primary" },
  keepers: { label: "Porta inviolata", col: "CS",   valueClass: "text-primary" },
  yellow:  { label: "Cartellini gialli", col: "🟨",  valueClass: "text-yellow-500" },
  red:     { label: "Cartellini rossi",  col: "🟥",  valueClass: "text-red-500" },
};

function getRows(tab: Tab) {
  switch (tab) {
    case "scorers": return topScorers(20).map(r  => ({ player: r.player,  value: r.goals }));
    case "keepers": return topCleanSheets(20).map(r => ({ player: r.player, value: r.cleanSheets }));
    case "yellow":  return topYellowCards(20).map(r => ({ player: r.player, value: r.cards }));
    case "red":     return topRedCards(20).map(r    => ({ player: r.player, value: r.cards }));
  }
}

function StatsPage() {
  useStoreVersion();
  const [tab, setTab] = useState<Tab>("scorers");
  const rows = getRows(tab);
  const meta = TAB_META[tab];

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-4">Statistiche</h1>

      <div className="flex flex-wrap gap-1 bg-secondary rounded-lg p-1 mb-4 w-fit">
        {(Object.keys(TAB_META) as Tab[]).map(t => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{TAB_META[t].label}</TabBtn>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-3 py-2 bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground grid grid-cols-[24px_1fr_auto] gap-3">
          <span>#</span>
          <span>Giocatore</span>
          <span>{meta.col}</span>
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
            <span className={`font-bold tabular-nums text-lg ${meta.valueClass}`}>{r.value}</span>
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
