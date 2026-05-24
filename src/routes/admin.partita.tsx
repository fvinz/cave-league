import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  matches as allMatches,
  getTeam,
  getTeamPlayers,
  phaseLabel,
  phaseShort,
  useStoreVersion,
  addMatchEvent,
  undoLastEvent,
  setMatchStatus,
  reopenMatch,
  resetMatch,
  finalizeMatch,
  lockMatch,
  unlockMatch,
  recomputeAll,
  type MatchStatus,
} from "@/lib/mockData";
import {
  Play, Pause, Square, Plus, Undo2, Trophy, Goal, Shield,
  RotateCcw, Lock, Unlock, X, CheckCircle2, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/admin/partita")({
  component: AdminPartita,
  head: () => ({ meta: [{ title: "Gestione partita — Admin" }] }),
});

const QUICK = [
  { type: "goal" as const, label: "Goal", icon: Goal, weight: 1 as 1, color: "bg-primary text-primary-foreground" },
  { type: "goal" as const, label: "Goal x2", icon: Goal, weight: 2 as 2, color: "bg-accent text-accent-foreground" },
  { type: "own_goal" as const, label: "Autogoal", icon: Shield, weight: 1 as 1, color: "bg-destructive/90 text-destructive-foreground" },
];

function AdminPartita() {
  useStoreVersion(); // re-render on any store change

  // pool of selectable matches (con squadre definite, non lockate per default)
  const playable = useMemo(
    () => allMatches.filter(m => m.homeTeamId && m.awayTeamId),
    [],
  );
  const initial =
    playable.find(m => m.status === "live") ??
    playable.find(m => m.status === "scheduled") ??
    playable[0];

  const [selectedId, setSelectedId] = useState(initial.id);
  const match = playable.find(m => m.id === selectedId) ?? initial;

  const [activeSide, setActiveSide] = useState<"home" | "away">("home");
  const [clock, setClock] = useState<number>(match.status === "live" ? 25 : 0);
  const [pickerEvent, setPickerEvent] = useState<
    { side: "home" | "away"; type: "goal" | "own_goal"; weight: 1 | 2; label: string } | null
  >(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);

  const home = getTeam(match.homeTeamId)!;
  const away = getTeam(match.awayTeamId)!;
  const isLocked = match.status === "locked";
  const isFinished = match.status === "finished";
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const tied = homeScore === awayScore;

  const switchMatch = (id: string) => {
    setSelectedId(id);
    const m = playable.find(x => x.id === id)!;
    setClock(m.status === "live" ? 25 : 0);
  };

  const guard = (action: () => void) => {
    if (isLocked) { toast.error("Partita bloccata", { description: "Sbloccala per modificare." }); return; }
    action();
  };

  const start = () => guard(async () => {
    await setMatchStatus(match.id, "live");
    toast.success("Partita avviata", { description: `${home.shortName} vs ${away.shortName}` });
  });

  const togglePause = () => guard(async () => {
    await setMatchStatus(match.id, match.status === "live" ? "scheduled" : "live");
  });

  const doReset = () => guard(async () => {
    if (await resetMatch(match.id)) toast.info("Partita resettata");
  });

  const doReopen = () => guard(async () => {
    if (await reopenMatch(match.id)) toast.info("Partita riaperta");
  });

  const onPickPlayer = async (playerId: string) => {
    if (!pickerEvent) return;
    const res = await addMatchEvent(match.id, {
      team: pickerEvent.side,
      type: pickerEvent.type,
      playerId,
      weight: pickerEvent.weight,
      minute: clock || 1,
      label: pickerEvent.label,
    });
    if (!res.ok) toast.error(res.error);
    else toast.success(`${pickerEvent.label} registrato`, {
      description: `${(pickerEvent.side === "home" ? home : away).shortName} · ${getPlayerName(playerId)}`,
    });
    setPickerEvent(null);
  };

  const undo = async () => {
    if (await undoLastEvent(match.id)) toast.info("Ultima azione annullata");
  };

  const bumpClock = (delta: number) => setClock(c => Math.max(0, Math.min(50, c + delta)));

  const finishDirect = async () => {
    const res = await finalizeMatch(match.id, { type: "direct" });
    if (!res.ok) { toast.error(res.error); return; }
    setConfirmClose(false);
    toast.success("Partita chiusa", { description: `${homeScore} - ${awayScore}` });
  };

  const finishShootout = async (winner: "home" | "away") => {
    const res = await finalizeMatch(match.id, { type: "shootout", winner });
    if (!res.ok) { toast.error(res.error); return; }
    setConfirmClose(false);
    toast.success(`Vittoria ai rigori: ${winner === "home" ? home.shortName : away.shortName}`);
  };

  const doLock = async () => {
    if (await lockMatch(match.id)) toast.success("Partita bloccata", { description: "Risultato definitivo." });
    setConfirmLock(false);
  };

  const doUnlock = async () => {
    if (await unlockMatch(match.id)) toast.info("Partita sbloccata");
  };

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black">Gestione partita</h1>
          <p className="text-sm text-muted-foreground">Gli eventi aggiornano in tempo reale classifica, marcatori e statistiche.</p>
        </div>
        <button
          onClick={() => { recomputeAll(); toast.success("Tutti i dati derivati ricalcolati."); }}
          className="shrink-0 px-3 py-2 rounded-lg border bg-card text-xs font-bold flex items-center gap-1.5 hover:bg-secondary/50"
          title="Forza ricalcolo classifica e statistiche"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Ricalcola tutto
        </button>
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
              {phaseShort[m.phase]}{m.matchday} · {getTeam(m.homeTeamId)?.shortName} vs {getTeam(m.awayTeamId)?.shortName} · {new Date(m.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} · {statusLabel(m.status)}
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
          <StatusBadge status={match.status} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamColumn team={home} side="home" active={activeSide === "home"} onSelect={() => setActiveSide("home")} />
          <div className="flex items-end gap-2 text-5xl sm:text-6xl font-black tabular-nums">
            <span className={activeSide === "home" ? "text-primary" : ""}>{homeScore}</span>
            <span className="text-2xl text-muted-foreground mb-1.5">:</span>
            <span className={activeSide === "away" ? "text-primary" : ""}>{awayScore}</span>
          </div>
          <TeamColumn team={away} side="away" active={activeSide === "away"} onSelect={() => setActiveSide("away")} />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => bumpClock(-1)} className="w-8 h-8 rounded-md bg-secondary font-bold">-</button>
          <div className="px-4 py-1.5 rounded-md bg-background border text-center min-w-[80px]">
            <div className="text-[10px] uppercase text-muted-foreground font-bold">Minuto</div>
            <div className="text-lg font-black tabular-nums leading-none">{clock}'</div>
          </div>
          <button onClick={() => bumpClock(1)} className="w-8 h-8 rounded-md bg-secondary font-bold">+</button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {isLocked ? (
            <button onClick={doUnlock} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <Unlock className="w-4 h-4" /> Sblocca
            </button>
          ) : isFinished ? (
            <>
              <button onClick={doReopen} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Riapri
              </button>
              <button onClick={() => setConfirmLock(true)} className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Blocca risultato
              </button>
            </>
          ) : match.status === "live" ? (
            <button onClick={togglePause} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <Pause className="w-4 h-4" /> Pausa
            </button>
          ) : (
            <button onClick={start} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Avvia
            </button>
          )}

          {!isLocked && !isFinished && (
            <button onClick={doReset} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}

          <button onClick={undo} disabled={match.events.length === 0 || isLocked} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
            <Undo2 className="w-4 h-4" /> Undo
          </button>

          {!isFinished && !isLocked && (
            <button
              onClick={() => setConfirmClose(true)}
              className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold flex items-center gap-1.5"
            >
              <Square className="w-4 h-4" /> Chiudi
            </button>
          )}
        </div>
      </section>

      {/* Side switcher */}
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
            const disabled = isLocked || isFinished;
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
        {isLocked && (
          <p className="text-[11px] text-muted-foreground mt-2 px-1 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Partita bloccata: nessuna modifica consentita.
          </p>
        )}
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Timeline · {match.events.length} eventi</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          {match.events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Nessun evento registrato.</div>
          ) : match.events.map(ev => {
            const sideTeam = ev.team === "home" ? home : away;
            const isOwn = ev.type === "own_goal";
            return (
              <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
                <span className="w-10 text-center font-bold tabular-nums text-sm">{ev.minute}'</span>
                <TeamBadge teamId={sideTeam.id} size={20} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{getPlayerName(ev.playerId)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ev.label ?? (isOwn ? "Autogoal" : "Goal")}
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

      {isFinished && (
        <div className="mt-4 rounded-xl border border-success/40 bg-success/5 p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-success shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-bold">Partita chiusa: {homeScore} - {awayScore}</div>
            {match.shootoutWinner && (
              <div className="text-xs text-muted-foreground">Vittoria ai rigori: {(match.shootoutWinner === "home" ? home : away).name}</div>
            )}
          </div>
          {isLocked
            ? <Lock className="w-4 h-4 text-muted-foreground" />
            : <span className="text-[10px] uppercase font-bold text-muted-foreground">Modificabile</span>}
        </div>
      )}

      {pickerEvent && (
        <PlayerPicker
          teamId={pickerEvent.side === "home" ? home.id : away.id}
          title={`${pickerEvent.label} · ${pickerEvent.side === "home" ? home.shortName : away.shortName}`}
          subtitle={pickerEvent.type === "own_goal" ? `Autogoal — il punto va a ${(pickerEvent.side === "home" ? away : home).shortName}` : undefined}
          onCancel={() => setPickerEvent(null)}
          onPick={onPickPlayer}
        />
      )}

      {confirmClose && (
        <CloseDialog
          tied={tied}
          home={home.name}
          away={away.name}
          homeScore={homeScore}
          awayScore={awayScore}
          onCancel={() => setConfirmClose(false)}
          onDirect={finishDirect}
          onShootout={finishShootout}
        />
      )}

      {confirmLock && (
        <ConfirmLockDialog
          home={home.shortName} away={away.shortName}
          homeScore={homeScore} awayScore={awayScore}
          onCancel={() => setConfirmLock(false)}
          onConfirm={doLock}
        />
      )}
    </AdminShell>
  );
}

// ---------- helpers ----------

function getPlayerName(id: string) {
  return getTeamPlayers(id.split("-p")[0])?.find(p => p.id === id)?.name ?? id;
}

function statusLabel(s: MatchStatus) {
  return s === "live" ? "LIVE" : s === "finished" ? "Conclusa" : s === "locked" ? "Bloccata" : "Programmata";
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
  if (status === "locked") return <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Bloccata</span>;
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

function ConfirmLockDialog({
  home, away, homeScore, awayScore, onCancel, onConfirm,
}: {
  home: string; away: string; homeScore: number; awayScore: number;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-black flex items-center gap-2"><Lock className="w-4 h-4" /> Bloccare il risultato?</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <div className="text-center text-3xl font-black tabular-nums mb-1">{homeScore} - {awayScore}</div>
          <div className="text-center text-xs text-muted-foreground mb-4">{home} vs {away}</div>
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 mb-3 text-xs">
            Dopo il blocco non sarà più possibile modificare eventi o punteggio finché non sbloccata.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCancel} className="border py-2 rounded-lg text-sm font-semibold">Annulla</button>
            <button onClick={onConfirm} className="bg-foreground text-background py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4" /> Conferma blocco
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
