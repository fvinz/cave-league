import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  matches as initialMatches,
  getTeam,
  getTeamPlayers,
  phaseLabel,
  phaseShort,
  type Match,
  type MatchEvent,
  type MatchStatus,
} from "@/lib/mockData";
import {
  Play, Pause, Square, Plus, Undo2, Trophy, Goal, Shield,
  RotateCcw, Lock, X, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/admin/partita")({
  component: AdminPartita,
  head: () => ({ meta: [{ title: "Gestione partita — Admin" }] }),
});

type AdminEvent = MatchEvent & { id: string; weight: number; label: string };
type MatchState = {
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  events: AdminEvent[];
  clock: number; // minutes elapsed (mock)
  shootoutWinner?: "home" | "away";
};

const QUICK = [
  { type: "goal" as const, label: "Goal", icon: Goal, weight: 1, color: "bg-primary text-primary-foreground" },
  { type: "goal" as const, label: "Goal x2", icon: Goal, weight: 2, color: "bg-accent text-accent-foreground" },
  { type: "own_goal" as const, label: "Autogoal", icon: Shield, weight: 1, color: "bg-destructive/90 text-destructive-foreground" },
];

function AdminPartita() {
  // pool of selectable matches (regular + knockout già abbinati)
  const playable = useMemo(
    () => initialMatches.filter(m => m.homeTeamId && m.awayTeamId && m.status !== "locked"),
    [],
  );
  const initial = playable.find(m => m.status === "live") ?? playable.find(m => m.status === "scheduled") ?? playable[0];

  const [selectedId, setSelectedId] = useState(initial.id);
  const match = playable.find(m => m.id === selectedId)!;

  const [state, setState] = useState<MatchState>(initFromMatch(match));
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");
  const [pickerEvent, setPickerEvent] = useState<{ side: "home" | "away"; type: "goal" | "own_goal"; weight: number; label: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const home = getTeam(match.homeTeamId)!;
  const away = getTeam(match.awayTeamId)!;

  const switchMatch = (id: string) => {
    setSelectedId(id);
    setState(initFromMatch(playable.find(m => m.id === id)!));
  };

  const start = () => {
    setState(s => ({ ...s, status: "live" }));
    toast.success("Partita avviata", { description: `${home.shortName} vs ${away.shortName}` });
  };

  const togglePause = () => setState(s => ({ ...s, status: s.status === "live" ? "scheduled" : "live" }));

  const reset = () => {
    setState(initFromMatch(match));
    toast.info("Stato partita resettato");
  };

  const recordEvent = (playerId: string) => {
    if (!pickerEvent) return;
    const { side, type, weight, label } = pickerEvent;
    // autogoal → punto va all'altra squadra
    const scoringSide = type === "own_goal" ? (side === "home" ? "away" : "home") : side;
    const ev: AdminEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      minute: state.clock || 1,
      team: side,
      type,
      playerId,
      weight,
      label,
    };
    setState(s => ({
      ...s,
      homeScore: scoringSide === "home" ? s.homeScore + weight : s.homeScore,
      awayScore: scoringSide === "away" ? s.awayScore + weight : s.awayScore,
      events: [ev, ...s.events],
    }));
    setPickerEvent(null);
    toast.success(`${label} registrato`, { description: `${getTeam(side === "home" ? home.id : away.id)?.shortName} · ${getPlayerName(playerId)}` });
  };

  const undo = () => {
    setState(s => {
      if (s.events.length === 0) return s;
      const [last, ...rest] = s.events;
      const scoringSide = last.type === "own_goal" ? (last.team === "home" ? "away" : "home") : last.team;
      return {
        ...s,
        events: rest,
        homeScore: scoringSide === "home" ? Math.max(0, s.homeScore - last.weight) : s.homeScore,
        awayScore: scoringSide === "away" ? Math.max(0, s.awayScore - last.weight) : s.awayScore,
      };
    });
    toast.info("Ultima azione annullata");
  };

  const bumpClock = (delta: number) => setState(s => ({ ...s, clock: Math.max(0, Math.min(50, s.clock + delta)) }));

  const finishDirect = () => {
    setState(s => ({ ...s, status: "finished", shootoutWinner: undefined }));
    setConfirmClose(false);
    toast.success("Partita chiusa", { description: `${state.homeScore} - ${state.awayScore}` });
  };

  const finishShootout = (winner: "home" | "away") => {
    setState(s => ({ ...s, status: "finished", shootoutWinner: winner }));
    setConfirmClose(false);
    toast.success(`Vittoria ai rigori: ${winner === "home" ? home.shortName : away.shortName}`);
  };

  const tied = state.homeScore === state.awayScore;

  return (
    <AdminShell>
      {/* Match picker */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black">Gestione partita</h1>
          <p className="text-sm text-muted-foreground">UX rapida da bordo campo. Mock — nessuna scrittura backend.</p>
        </div>
      </div>

      <label className="block mb-4">
        <span className="block text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Partita selezionata</span>
        <select
          value={selectedId}
          onChange={e => switchMatch(e.target.value)}
          className="w-full bg-background border rounded-lg px-3 py-2.5 text-sm font-semibold"
        >
          {playable.map(m => (
            <option key={m.id} value={m.id}>
              {phaseShort[m.phase]}{m.matchday} · {getTeam(m.homeTeamId)?.shortName} vs {getTeam(m.awayTeamId)?.shortName} · {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
            </option>
          ))}
        </select>
      </label>

      {/* Scoreboard */}
      <section className="rounded-2xl border bg-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {phaseLabel[match.phase]} · giornata {match.matchday}
          </span>
          <StatusBadge status={state.status} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamColumn team={home} side="home" active={activeSide === "home"} onSelect={() => setActiveSide("home")} />
          <div className="flex items-end gap-2 text-5xl sm:text-6xl font-black tabular-nums">
            <span className={activeSide === "home" ? "text-primary" : ""}>{state.homeScore}</span>
            <span className="text-2xl text-muted-foreground mb-1.5">:</span>
            <span className={activeSide === "away" ? "text-primary" : ""}>{state.awayScore}</span>
          </div>
          <TeamColumn team={away} side="away" active={activeSide === "away"} onSelect={() => setActiveSide("away")} />
        </div>

        {/* Clock & controls */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => bumpClock(-1)} className="w-8 h-8 rounded-md bg-secondary font-bold">-</button>
          <div className="px-4 py-1.5 rounded-md bg-background border text-center min-w-[80px]">
            <div className="text-[10px] uppercase text-muted-foreground font-bold">Minuto</div>
            <div className="text-lg font-black tabular-nums leading-none">{state.clock}'</div>
          </div>
          <button onClick={() => bumpClock(1)} className="w-8 h-8 rounded-md bg-secondary font-bold">+</button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {state.status === "finished" ? (
            <button onClick={reset} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Riapri
            </button>
          ) : state.status === "live" ? (
            <button onClick={togglePause} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <Pause className="w-4 h-4" /> Pausa
            </button>
          ) : (
            <button onClick={start} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Avvia
            </button>
          )}
          <button onClick={undo} disabled={state.events.length === 0} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
            <Undo2 className="w-4 h-4" /> Undo
          </button>
          <button
            onClick={() => setConfirmClose(true)}
            disabled={state.status === "finished"}
            className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Square className="w-4 h-4" /> Chiudi
          </button>
        </div>
      </section>

      {/* Side switcher (mobile big tap targets) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["home", "away"] as const).map(side => {
          const t = side === "home" ? home : away;
          const isActive = activeSide === side;
          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-colors ${
                isActive ? "border-primary bg-primary/5" : "border-transparent bg-card"
              }`}
            >
              <TeamBadge teamId={t.id} size={22} />
              <span className="text-sm font-bold truncate flex-1 text-left">{t.shortName}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">{side}</span>
            </button>
          );
        })}
      </div>

      {/* Quick event buttons */}
      <section className="rounded-xl border bg-card p-3 mb-4">
        <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">
          Evento per {(activeSide === "home" ? home : away).name}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map(q => {
            const Icon = q.icon;
            const disabled = state.status === "finished";
            return (
              <button
                key={q.label}
                disabled={disabled}
                onClick={() => setPickerEvent({ side: activeSide, type: q.type, weight: q.weight, label: q.label })}
                className={`flex flex-col items-center justify-center gap-1 py-4 rounded-lg font-semibold text-xs ${q.color} disabled:opacity-40 active:scale-[0.97] transition-transform`}
              >
                <Icon className="w-5 h-5" />
                {q.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Timeline · {state.events.length} eventi</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          {state.events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Nessun evento registrato.</div>
          ) : state.events.map(ev => {
            const sideTeam = ev.team === "home" ? home : away;
            const isOwn = ev.type === "own_goal";
            return (
              <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
                <span className="w-10 text-center font-bold tabular-nums text-sm">{ev.minute}'</span>
                <TeamBadge teamId={sideTeam.id} size={20} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{getPlayerName(ev.playerId)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ev.label}
                    {isOwn && <span className="ml-1 italic">(punto a {(ev.team === "home" ? away : home).shortName})</span>}
                  </div>
                </div>
                {ev.weight > 1 && <span className="text-[10px] font-bold bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">×{ev.weight}</span>}
                <Goal className={`w-4 h-4 ${isOwn ? "text-destructive" : "text-primary"}`} />
              </div>
            );
          })}
        </div>
      </section>

      {state.status === "finished" && (
        <div className="mt-4 rounded-xl border border-success/40 bg-success/5 p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-success shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-bold">Partita chiusa: {state.homeScore} - {state.awayScore}</div>
            {state.shootoutWinner && (
              <div className="text-xs text-muted-foreground">Vittoria ai rigori: {(state.shootoutWinner === "home" ? home : away).name}</div>
            )}
          </div>
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Player picker dialog */}
      {pickerEvent && (
        <PlayerPicker
          teamId={pickerEvent.side === "home" ? home.id : away.id}
          title={`${pickerEvent.label} · ${pickerEvent.side === "home" ? home.shortName : away.shortName}`}
          subtitle={pickerEvent.type === "own_goal" ? `Autogoal — il punto va a ${(pickerEvent.side === "home" ? away : home).shortName}` : undefined}
          onCancel={() => setPickerEvent(null)}
          onPick={recordEvent}
        />
      )}

      {/* Close confirm */}
      {confirmClose && (
        <CloseDialog
          tied={tied}
          home={home.name}
          away={away.name}
          homeScore={state.homeScore}
          awayScore={state.awayScore}
          onCancel={() => setConfirmClose(false)}
          onDirect={finishDirect}
          onShootout={finishShootout}
        />
      )}
    </AdminShell>
  );
}

// ---------- helpers / sub-components ----------

function initFromMatch(m: Match): MatchState {
  return {
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    status: m.status === "finished" ? "finished" : m.status === "live" ? "live" : "scheduled",
    events: [],
    clock: m.status === "live" ? 25 : 0,
    shootoutWinner: m.shootoutWinner,
  };
}

function getPlayerName(id: string) {
  return getTeamPlayers(id.split("-p")[0])?.find(p => p.id === id)?.name ?? id;
}

function TeamColumn({ team, side, active, onSelect }: { team: { id: string; name: string; shortName: string }; side: "home" | "away"; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`flex flex-col items-center gap-2 p-2 rounded-lg ${active ? "bg-primary/5" : ""}`}>
      <TeamBadge teamId={team.id} size={52} />
      <div className="text-center">
        <div className="font-bold text-sm leading-tight">{team.shortName}</div>
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{side}</div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === "live") return <span className="flex items-center gap-1.5 text-live text-xs font-bold uppercase"><span className="w-2 h-2 rounded-full bg-live live-pulse" /> LIVE</span>;
  if (status === "finished") return <span className="text-xs font-bold text-success uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Finita</span>;
  return <span className="text-xs font-bold text-muted-foreground uppercase">In attesa</span>;
}

function PlayerPicker({
  teamId, title, subtitle, onCancel, onPick,
}: { teamId: string; title: string; subtitle?: string; onCancel: () => void; onPick: (id: string) => void }) {
  const roster = getTeamPlayers(teamId).filter(p => p.role !== "pres");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full sm:max-w-md bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-black">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {roster.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 text-left"
            >
              <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold tabular-nums">{p.number}</span>
              <span className="flex-1 font-semibold text-sm">{p.name}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">{p.role === "p" ? "Portiere" : "Giocatore"}</span>
              <Plus className="w-4 h-4 text-primary" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CloseDialog({
  tied, home, away, homeScore, awayScore, onCancel, onDirect, onShootout,
}: {
  tied: boolean; home: string; away: string; homeScore: number; awayScore: number;
  onCancel: () => void; onDirect: () => void; onShootout: (w: "home" | "away") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-black">Chiudere la partita?</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <div className="text-center text-3xl font-black tabular-nums mb-1">{homeScore} - {awayScore}</div>
          <div className="text-center text-xs text-muted-foreground mb-4">{home} vs {away}</div>

          {tied ? (
            <>
              <div className="rounded-md bg-accent/10 border border-accent/30 p-3 mb-3 text-xs">
                Punteggio in parità: scegli il vincitore ai rigori.
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => onShootout("home")} className="bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm">Vince {home}</button>
                <button onClick={() => onShootout("away")} className="bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm">Vince {away}</button>
              </div>
            </>
          ) : (
            <button onClick={onDirect} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-4 h-4" /> Vittoria diretta
            </button>
          )}
          <button onClick={onCancel} className="w-full border py-2 rounded-lg text-sm font-semibold">Annulla</button>
        </div>
      </div>
    </div>
  );
}
