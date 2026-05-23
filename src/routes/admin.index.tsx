import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { matches, teams, players, computeStandings, useStoreVersion, recomputeAll } from "@/lib/mockData";
import { Calendar, Users, Gamepad2, Upload, Zap, RefreshCw, Lock } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin — Cave League" }] }),
});

function AdminDashboard() {
  useStoreVersion();
  const liveCount = matches.filter(m => m.status === "live").length;
  const finishedCount = matches.filter(m => m.status === "finished").length;
  const scheduledCount = matches.filter(m => m.status === "scheduled").length;
  const lockedCount = matches.filter(m => m.status === "locked").length;
  const standings = computeStandings();

  const stats = [
    { label: "Squadre", value: teams.length, icon: Users },
    { label: "Giocatori", value: players.length, icon: Users },
    { label: "Partite totali", value: matches.length, icon: Calendar },
    { label: "Live", value: liveCount, icon: Zap, highlight: liveCount > 0 },
  ];

  const actions = [
    { to: "/admin/import", label: "Import CSV", desc: "Carica giocatori, squadre, calendario", icon: Upload },
    { to: "/admin/calendario", label: "Gestione calendario", desc: "Crea, modifica o annulla partite", icon: Calendar },
    { to: "/admin/partita", label: "Gestione partita live", desc: "Eventi: goal, cartellini, rigori", icon: Gamepad2 },
  ];

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Cave League 2026 · stato torneo</p>
        </div>
        <button
          onClick={() => { recomputeAll(); toast.success("Dati ricalcolati da tutti gli eventi partita."); }}
          className="shrink-0 px-3 py-2 rounded-lg border bg-card text-xs font-bold flex items-center gap-1.5 hover:bg-secondary/50"
          title="Forza ricalcolo classifica e statistiche"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Ricalcola tutto
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border bg-card p-4 ${s.highlight ? "border-live" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${s.highlight ? "text-live" : "text-muted-foreground"}`} />
                {s.highlight && <span className="text-[10px] font-bold text-live uppercase live-pulse">live</span>}
              </div>
              <div className="text-2xl font-black tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Avanzamento</h2>
      <div className="rounded-xl border bg-card p-4 mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{finishedCount} concluse</span>
          <span>{scheduledCount} programmate</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${(finishedCount / matches.length) * 100}%` }} />
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Azioni rapide</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {actions.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.to} to={a.to} className="rounded-xl border bg-card p-4 hover:border-primary/50 hover:bg-secondary/30 transition-colors">
              <Icon className="w-5 h-5 text-primary mb-2" />
              <div className="font-bold">{a.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{a.desc}</div>
            </Link>
          );
        })}
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-8 mb-3">Capolista</h2>
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">In testa con {standings[0].points} punti</div>
          <div className="text-xl font-black mt-0.5">{teams.find(t => t.id === standings[0].teamId)?.name}</div>
        </div>
        <div className="text-3xl">🏆</div>
      </div>
    </AdminShell>
  );
}
