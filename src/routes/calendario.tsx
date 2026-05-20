import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { matches, TOURNAMENT_TODAY } from "@/lib/mockData";

export const Route = createFileRoute("/calendario")({
  component: CalendarioPage,
  head: () => ({ meta: [{ title: "Calendario — Cave League" }] }),
});

function CalendarioPage() {
  const [matchday, setMatchday] = useState<number | "all">("all");
  const [status, setStatus] = useState<"all" | "scheduled" | "live" | "finished">("all");

  const matchdays = useMemo(() => [...new Set(matches.map(m => m.matchday))].sort(), []);
  const filtered = matches.filter(m =>
    (matchday === "all" || m.matchday === matchday) &&
    (status === "all" || m.status === status)
  );
  const today = TOURNAMENT_TODAY;
  const finished = filtered.filter(m => new Date(m.date) < today || m.status === "finished").sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const upcoming = filtered.filter(m => !(new Date(m.date) < today || m.status === "finished")).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-1">Calendario</h1>
      <p className="text-sm text-muted-foreground mb-4">5 — 14 giugno 2026</p>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        <FilterButton active={matchday === "all"} onClick={() => setMatchday("all")}>Tutte</FilterButton>
        {matchdays.map(md => (
          <FilterButton key={md} active={matchday === md} onClick={() => setMatchday(md)}>G{md}</FilterButton>
        ))}
        <span className="w-px bg-border mx-1" />
        <FilterButton active={status === "all"} onClick={() => setStatus("all")}>Tutte</FilterButton>
        <FilterButton active={status === "live"} onClick={() => setStatus("live")}>Live</FilterButton>
        <FilterButton active={status === "finished"} onClick={() => setStatus("finished")}>Finite</FilterButton>
        <FilterButton active={status === "scheduled"} onClick={() => setStatus("scheduled")}>Programmate</FilterButton>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Prossime partite</h2>
          <div className="grid gap-2">{upcoming.map(m => <MatchCard key={m.id} match={m} />)}</div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Concluse</h2>
          <div className="grid gap-2">{finished.map(m => <MatchCard key={m.id} match={m} />)}</div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground py-12">Nessuna partita trovata.</div>
      )}
    </AppShell>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
