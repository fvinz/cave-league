import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import { matches, getTeam, getTeamPlayers } from "@/lib/mockData";
import { Play, Pause, Plus, Square } from "lucide-react";

export const Route = createFileRoute("/admin/partita")({
  component: AdminPartita,
  head: () => ({ meta: [{ title: "Gestione partita — Admin" }] }),
});

const eventTypes = [
  { type: "goal", label: "Goal", color: "bg-primary text-primary-foreground" },
  { type: "yellow", label: "Giallo", color: "bg-accent text-accent-foreground" },
  { type: "red", label: "Rosso", color: "bg-destructive text-destructive-foreground" },
  { type: "sub", label: "Sostituzione", color: "bg-secondary text-secondary-foreground" },
];

function AdminPartita() {
  const liveMatch = matches.find(m => m.status === "live") ?? matches.find(m => m.status === "scheduled")!;
  const [selectedId, setSelectedId] = useState(liveMatch.id);
  const match = matches.find(m => m.id === selectedId)!;
  const home = getTeam(match.homeTeamId)!;
  const away = getTeam(match.awayTeamId)!;
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [isLive, setIsLive] = useState(match.status === "live");
  const [events, setEvents] = useState<{ min: number; team: string; type: string; player: string }[]>([]);

  const addEvent = (team: "home" | "away", type: string) => {
    const teamObj = team === "home" ? home : away;
    const player = getTeamPlayers(teamObj.id)[0]?.name ?? "—";
    setEvents(e => [{ min: Math.floor(Math.random() * 40) + 1, team: teamObj.shortName, type, player }, ...e]);
    if (type === "goal") {
      team === "home" ? setHomeScore(s => s + 1) : setAwayScore(s => s + 1);
    }
  };

  return (
    <AdminShell>
      <h1 className="text-2xl font-black mb-1">Gestione partita live</h1>
      <p className="text-sm text-muted-foreground mb-4">Registra eventi in tempo reale (mock UI).</p>

      <div className="mb-4">
        <label className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Partita</label>
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); const m = matches.find(x => x.id === e.target.value)!; setHomeScore(m.homeScore ?? 0); setAwayScore(m.awayScore ?? 0); setIsLive(m.status === "live"); setEvents([]); }}
          className="w-full bg-background border rounded-lg px-3 py-2 text-sm mt-1"
        >
          {matches.map(m => (
            <option key={m.id} value={m.id}>G{m.matchday} · {getTeam(m.homeTeamId)?.shortName} vs {getTeam(m.awayTeamId)?.shortName}</option>
          ))}
        </select>
      </div>

      {/* Scoreboard */}
      <div className="rounded-2xl border bg-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giornata {match.matchday}</span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-live text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-live live-pulse" /> LIVE
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-semibold">In pausa</span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <TeamBadge teamId={home.id} size={56} />
            <span className="font-bold text-sm text-center">{home.name}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-2 text-4xl font-black tabular-nums">
              <ScoreButtons value={homeScore} onChange={setHomeScore} />
              <span>—</span>
              <ScoreButtons value={awayScore} onChange={setAwayScore} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamBadge teamId={away.id} size={56} />
            <span className="font-bold text-sm text-center">{away.name}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-center">
          <button onClick={() => setIsLive(v => !v)} className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 ${isLive ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
            {isLive ? <><Pause className="w-4 h-4" /> Pausa</> : <><Play className="w-4 h-4" /> Avvia</>}
          </button>
          <button className="px-4 py-2 rounded-lg font-semibold text-sm bg-destructive text-destructive-foreground flex items-center gap-1.5">
            <Square className="w-4 h-4" /> Termina
          </button>
        </div>
      </div>

      {/* Add events */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {(["home", "away"] as const).map(side => {
          const t = side === "home" ? home : away;
          return (
            <div key={side} className="rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2 mb-3"><TeamBadge teamId={t.id} size={24} /><span className="font-semibold text-sm">{t.name}</span></div>
              <div className="grid grid-cols-2 gap-1.5">
                {eventTypes.map(e => (
                  <button key={e.type} onClick={() => addEvent(side, e.type)} className={`text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1 ${e.color}`}>
                    <Plus className="w-3 h-3" /> {e.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event log */}
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Eventi</h2>
      <div className="rounded-xl border bg-card overflow-hidden">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Nessun evento registrato.</div>
        ) : events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
            <span className="w-10 text-center font-bold tabular-nums">{e.min}'</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary uppercase">{e.team}</span>
            <span className="text-sm flex-1">{e.player}</span>
            <span className="text-xs font-semibold uppercase text-primary">{e.type}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function ScoreButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex flex-col items-center">
      <button onClick={() => onChange(value + 1)} className="text-xs px-2 text-muted-foreground hover:text-primary">▲</button>
      <span className="min-w-[2ch] text-center">{value}</span>
      <button onClick={() => onChange(Math.max(0, value - 1))} className="text-xs px-2 text-muted-foreground hover:text-destructive">▼</button>
    </div>
  );
}
