import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import { matches, getTeam } from "@/lib/mockData";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/calendario")({
  component: AdminCalendario,
  head: () => ({ meta: [{ title: "Gestione calendario — Admin" }] }),
});

function AdminCalendario() {
  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">Gestione calendario</h1>
          <p className="text-sm text-muted-foreground">{matches.length} partite programmate</p>
        </div>
        <button className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Nuova
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="hidden sm:grid grid-cols-[60px_1fr_140px_100px_80px] gap-3 px-4 py-2.5 bg-secondary/50 text-xs uppercase font-semibold text-muted-foreground tracking-wider">
          <span>G</span><span>Match</span><span>Data</span><span>Stato</span><span></span>
        </div>
        {matches.map(m => {
          const date = new Date(m.date);
          const homeName = m.homeTeamId ? getTeam(m.homeTeamId)?.shortName : m.homeLabel ?? "—";
          const awayName = m.awayTeamId ? getTeam(m.awayTeamId)?.shortName : m.awayLabel ?? "—";
          return (
            <div key={m.id} className="grid sm:grid-cols-[60px_1fr_140px_100px_80px] gap-3 items-center px-4 py-3 border-t hover:bg-secondary/30">
              <div className="text-xs"><span className="bg-secondary px-2 py-0.5 rounded font-bold">G{m.matchday}</span></div>
              <div className="flex items-center gap-2 min-w-0">
                {m.homeTeamId ? <TeamBadge teamId={m.homeTeamId} size={24} /> : <span className="w-6 h-6 rounded bg-secondary" />}
                <span className="text-sm font-semibold truncate">{homeName}</span>
                <span className="text-muted-foreground text-xs">vs</span>
                <span className="text-sm font-semibold truncate">{awayName}</span>
                {m.awayTeamId ? <TeamBadge teamId={m.awayTeamId} size={24} /> : <span className="w-6 h-6 rounded bg-secondary" />}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} · {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-1 justify-end">
                <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                <button className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: "scheduled" | "live" | "finished" | "locked" }) {
  const map = {
    scheduled: { label: "Programmata", cls: "bg-secondary text-muted-foreground" },
    live: { label: "LIVE", cls: "bg-live text-live-foreground live-pulse" },
    finished: { label: "Finita", cls: "bg-success/15 text-success" },
    locked: { label: "Bloccata", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status];
  return <span className={`inline-block text-[10px] font-bold uppercase px-2 py-1 rounded ${s.cls}`}>{s.label}</span>;
}
