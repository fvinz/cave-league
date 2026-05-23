import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { matches, MatchPhase, MatchStatus, phaseLabel, TOURNAMENT_TODAY, useStoreVersion } from "@/lib/mockData";

export const Route = createFileRoute("/calendario")({
  component: CalendarioPage,
  head: () => ({ meta: [{ title: "Calendario — Cave League" }] }),
});

function CalendarioPage() {
  const [phase, setPhase] = useState<MatchPhase | "all">("all");
  const [status, setStatus] = useState<MatchStatus | "all">("all");

  const days = useMemo(() => {
    const set = new Set(matches.map(m => new Date(m.date).toDateString()));
    return [...set].sort((a, b) => +new Date(a) - +new Date(b));
  }, []);

  const filtered = matches.filter(m =>
    (phase === "all" || m.phase === phase) &&
    (status === "all" || m.status === status)
  );

  // raggruppa per giorno
  const grouped = days
    .map(d => ({
      day: d,
      list: filtered
        .filter(m => new Date(m.date).toDateString() === d)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    }))
    .filter(g => g.list.length > 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-1">Calendario</h1>
      <p className="text-sm text-muted-foreground mb-4">
        5 — 14 giugno 2026 · Regular season parziale (4 partite a squadra), poi fase a eliminazione
      </p>

      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        <Chip active={phase === "all"} onClick={() => setPhase("all")}>Tutte le fasi</Chip>
        <Chip active={phase === "regular"} onClick={() => setPhase("regular")}>Regular</Chip>
        <Chip active={phase === "quarter"} onClick={() => setPhase("quarter")}>Quarti</Chip>
        <Chip active={phase === "semi"} onClick={() => setPhase("semi")}>Semifinali</Chip>
        <Chip active={phase === "third"} onClick={() => setPhase("third")}>3° posto</Chip>
        <Chip active={phase === "final"} onClick={() => setPhase("final")}>Finale</Chip>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        <Chip active={status === "all"} onClick={() => setStatus("all")}>Tutti gli stati</Chip>
        <Chip active={status === "live"} onClick={() => setStatus("live")}>Live</Chip>
        <Chip active={status === "finished"} onClick={() => setStatus("finished")}>Finite</Chip>
        <Chip active={status === "scheduled"} onClick={() => setStatus("scheduled")}>Programmate</Chip>
        <Chip active={status === "locked"} onClick={() => setStatus("locked")}>Da definire</Chip>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Nessuna partita trovata.</div>
      ) : grouped.map(g => {
        const date = new Date(g.day);
        const isToday = date.toDateString() === TOURNAMENT_TODAY.toDateString();
        const label = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
        return (
          <section key={g.day} className="mb-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span className="capitalize">{label}</span>
              {isToday && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">OGGI</span>}
            </h2>
            <div className="grid gap-2">{g.list.map(m => <MatchCard key={m.id} match={m} />)}</div>
          </section>
        );
      })}

      {phase !== "all" && (
        <p className="text-xs text-muted-foreground mt-4">Filtro fase: {phaseLabel[phase]}</p>
      )}
    </AppShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
      }`}
    >
      {children}
    </button>
  );
}
