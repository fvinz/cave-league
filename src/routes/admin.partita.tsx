import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  matches as allMatches,
  getTeam,
  getTeamPlayers,
  getPlayer,
  phaseLabel,
  phaseShort,
  useStoreVersion,
  startFirstHalf,
  endFirstHalf,
  startSecondHalf,
  endSecondHalf,
  startShootout,
  addMatchEvent,
  undoLastEvent,
  finalizeMatch,
  lockMatch,
  unlockMatch,
  resetMatch,
  reopenMatch,
  recomputeAll,
  type Match,
  type MatchStatus,
  type MatchPeriod,
  type EventType,
} from "@/lib/mockData";
import {
  Play, Square, Trophy, Shield, RotateCcw, Lock, Unlock, X,
  CheckCircle2, RefreshCw, Undo2, Goal, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/partita")({
  component: AdminPartita,
  head: () => ({ meta: [{ title: "Gestione partita — Admin" }] }),
});

type QuickEvent = {
  type: EventType;
  label: string;
  weight: 1 | 2;
  color: string;
  icon: React.ElementType;
};

const QUICK_REGULAR: QuickEvent[] = [
  { type: "goal",        label: "Goal",     weight: 1, color: "bg-primary text-primary-foreground",           icon: Goal },
  { type: "goal",        label: "Goal ×2",  weight: 2, color: "bg-violet-500 text-white",                     icon: Goal },
  { type: "own_goal",    label: "Autogoal", weight: 1, color: "bg-destructive/90 text-destructive-foreground", icon: Shield },
  { type: "yellow_card", label: "Giallo",   weight: 1, color: "bg-yellow-400 text-yellow-950",                 icon: AlertCircle },
  { type: "red_card",    label: "Rosso",    weight: 1, color: "bg-red-600 text-white",                         icon: AlertCircle },
];
const QUICK_SHOOTOUT: QuickEvent[] = [
  { type: "shootout_goal", label: "Rigore ✓",   weight: 1, color: "bg-emerald-500 text-white", icon: Goal },
  { type: "shootout_miss", label: "Sbagliato",  weight: 1, color: "bg-rose-500 text-white",    icon: Shield },
];

function statusLabel(s: MatchStatus) {
  if (s === "live")     return "LIVE";
  if (s === "finished") return "Conclusa";
  if (s === "locked")   return "Bloccata";
  return "Programmata";
}

function elapsedSeconds(from: string | null, to: string | null): number {
  if (!from) return 0;
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(from).getTime()) / 1000));
}
function fmtTimer(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}
function periodOf(phase: string | null): MatchPeriod {
  if (phase === "shootout")    return "shootout";
  if (phase === "second_half") return "second_half";
  return "first_half";
}

// ── main ──────────────────────────────────────────────────────────────────────
function AdminPartita() {
  const v = useStoreVersion();

  const playable = useMemo(
    () => allMatches.filter(m => m.homeTeamId && m.awayTeamId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v],
  );
  const initial =
    playable.find(m => m.status === "live") ??
    playable.find(m => m.status === "scheduled") ??
    playable[0];

  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const match = playable.find(m => m.id === selectedId) ?? initial ?? null;
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");
  const [pickerEvent, setPickerEvent] = useState<(QuickEvent & { side: "home" | "away" }) | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);

  // 1 Hz tick for the live timer display
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!match) {
    return (
      <AdminShell>
        <h1 className="text-2xl font-black mb-2">Gestione partita</h1>
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nessuna partita con squadre definite.{" "}
          <a href="/admin/calendario" className="text-primary font-semibold underline">Crea una partita</a>.
        </div>
      </AdminShell>
    );
  }

  const home = getTeam(match.homeTeamId)!;
  const away = getTeam(match.awayTeamId)!;
  const isLocked   = match.status === "locked";
  const isFinished = match.status === "finished";
  const isLive     = match.status === "live";
  const homeScore  = match.homeScore ?? 0;
  const awayScore  = match.awayScore ?? 0;
  const phase      = match.currentPhase;

  // shootout sub-totals (from events, not from total score)
  const homeSO = match.events.filter(e => e.period === "shootout" && e.team === "home" && e.type === "shootout_goal").length;
  const awaySO = match.events.filter(e => e.period === "shootout" && e.team === "away" && e.type === "shootout_goal").length;
  const regHome = homeScore - homeSO;
  const regAway = awayScore - awaySO;

  // live timer
  const timerSecs = (() => {
    void tick;
    if (phase === "first_half")  return elapsedSeconds(match.firstHalfStartedAt,  null);
    if (phase === "half_time")   return elapsedSeconds(match.firstHalfStartedAt,  match.firstHalfEndedAt);
    if (phase === "second_half") return elapsedSeconds(match.secondHalfStartedAt, null);
    if (phase === "shootout")    return elapsedSeconds(match.secondHalfEndedAt ?? match.secondHalfStartedAt, null);
    if (!phase && match.secondHalfEndedAt)
      return elapsedSeconds(match.secondHalfStartedAt, match.secondHalfEndedAt);
    return 0;
  })();
  const timerLabel =
    phase === "first_half"  ? "1° TEMPO" :
    phase === "half_time"   ? "INTERVALLO" :
    phase === "second_half" ? "2° TEMPO" :
    phase === "shootout"    ? "RIGORI" :
    match.secondHalfEndedAt ? "FINITA" : "—";

  const autoMinute = (() => {
    if (phase === "first_half")  return Math.min(20, Math.ceil(timerSecs / 60)) || 1;
    if (phase === "second_half") return Math.min(40, 20 + Math.ceil(timerSecs / 60)) || 21;
    if (phase === "shootout")    return match.events.filter(e => e.period === "shootout").length + 1;
    return 1;
  })();

  const canRegister  = isLive && phase !== "half_time" && !isFinished && !isLocked;
  const inShootout   = phase === "shootout";
  const quickButtons = inShootout ? QUICK_SHOOTOUT : QUICK_REGULAR;
  const secondHalfDone = !phase && !!match.secondHalfEndedAt;

  const guard = (fn: () => void) => {
    if (isLocked) { toast.error("Partita bloccata — sbloccala prima."); return; }
    fn();
  };

  const doStart1   = () => guard(async () => { const r = await startFirstHalf(match.id);  r.ok ? toast.success("1° tempo avviato") : toast.error(r.error); });
  const doEnd1     = () => guard(async () => { const r = await endFirstHalf(match.id);    r.ok ? toast.info("Intervallo") : toast.error(r.error); });
  const doStart2   = () => guard(async () => { const r = await startSecondHalf(match.id); r.ok ? toast.success("2° tempo avviato") : toast.error(r.error); });
  const doEnd2     = () => guard(async () => {
    const r = await endSecondHalf(match.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.info("Fine 2° tempo"); setConfirmClose(true);
  });
  const doSO       = () => guard(async () => { const r = await startShootout(match.id);   r.ok ? toast.success("Shootout avviato") : toast.error(r.error); });
  const doReset    = () => guard(async () => { if (await resetMatch(match.id))  toast.info("Partita resettata"); });
  const doReopen   = () => guard(async () => { if (await reopenMatch(match.id)) toast.info("Partita riaperta"); });
  const doUnlock   = async () => { if (await unlockMatch(match.id)) toast.info("Partita sbloccata"); };
  const doLock     = async () => { if (await lockMatch(match.id)) { toast.success("Bloccata"); setConfirmLock(false); } };
  const doUndo     = async () => { if (await undoLastEvent(match.id)) toast.info("Ultima azione annullata"); };

  const finishDirect = async () => {
    const r = await finalizeMatch(match.id, { type: "direct" });
    r.ok ? (setConfirmClose(false), toast.success(`Partita chiusa ${homeScore}–${awayScore}`)) : toast.error(r.error);
  };
  const finishShootout = async (winner: "home" | "away") => {
    const r = await finalizeMatch(match.id, { type: "shootout", winner });
    r.ok ? (setConfirmClose(false), toast.success(`Vittoria ai rigori: ${winner === "home" ? home.shortName : away.shortName}`)) : toast.error(r.error);
  };

  const onPickPlayer = async (playerId: string) => {
    if (!pickerEvent) return;
    const res = await addMatchEvent(match.id, {
      team: pickerEvent.side, type: pickerEvent.type,
      playerId, weight: pickerEvent.weight, minute: autoMinute,
      period: periodOf(match.currentPhase),
    });
    if (!res.ok) toast.error(res.error);
    else {
      const pName = getPlayer(playerId)?.name ?? "—";
      toast.success(`${pickerEvent.label} registrato`, { description: `${(pickerEvent.side === "home" ? home : away).shortName} · ${pName}` });
    }
    setPickerEvent(null);
  };

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black">Gestione partita</h1>
          <p className="text-sm text-muted-foreground">Classifica, marcatori e statistiche si aggiornano in tempo reale.</p>
        </div>
        <button
          onClick={() => { recomputeAll(); toast.success("Dati ricalcolati."); }}
          className="shrink-0 px-3 py-2 rounded-lg border bg-card text-xs font-bold flex items-center gap-1.5 hover:bg-secondary/50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Ricalcola
        </button>
      </div>

      {/* Match selector */}
      <label className="block mb-4">
        <span className="block text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Partita</span>
        <select
          value={selectedId ?? ""}
          onChange={e => setSelectedId(e.target.value)}
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
            {phaseLabel[match.phase]} · G{match.matchday}
          </span>
          <PhaseBadge status={match.status} phase={phase} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
          <TeamCol team={home} side="home" active={activeSide === "home"} onSelect={() => setActiveSide("home")} />
          <div className="text-center">
            <div className="flex items-end gap-1.5 text-5xl sm:text-6xl font-black tabular-nums justify-center">
              <span className={activeSide === "home" ? "text-primary" : ""}>{homeScore}</span>
              <span className="text-2xl text-muted-foreground mb-1.5">:</span>
              <span className={activeSide === "away" ? "text-primary" : ""}>{awayScore}</span>
            </div>
            {(homeSO > 0 || awaySO > 0) && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                reg. {regHome}–{regAway} · rig. {homeSO}–{awaySO}
              </div>
            )}
          </div>
          <TeamCol team={away} side="away" active={activeSide === "away"} onSelect={() => setActiveSide("away")} />
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-4">
          <div className="px-5 py-2 rounded-xl bg-background border text-center min-w-[130px]">
            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{timerLabel}</div>
            <div className="text-2xl font-black tabular-nums leading-none mt-0.5">{fmtTimer(timerSecs)}</div>
          </div>
        </div>

        {/* Phase buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
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
          ) : phase === null && !match.secondHalfEndedAt ? (
            <button onClick={doStart1} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Avvia 1° tempo
            </button>
          ) : phase === "first_half" ? (
            <button onClick={doEnd1} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <Square className="w-4 h-4" /> Fine 1° tempo
            </button>
          ) : phase === "half_time" ? (
            <button onClick={doStart2} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5">
              <Play className="w-4 h-4" /> Avvia 2° tempo
            </button>
          ) : phase === "second_half" ? (
            <button onClick={doEnd2} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
              <Square className="w-4 h-4" /> Fine 2° tempo
            </button>
          ) : phase === "shootout" ? (
            <button onClick={() => setConfirmClose(true)} className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Chiudi shootout
            </button>
          ) : secondHalfDone ? (
            <>
              <button onClick={() => setConfirmClose(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> Chiudi partita
              </button>
              {regHome === regAway && (
                <button onClick={doSO} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> Avvia rigori
                </button>
              )}
            </>
          ) : null}

          {!isLocked && !isFinished && (
            <>
              <button onClick={doReset} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={doUndo} disabled={match.events.length === 0} className="px-3 py-2 rounded-lg bg-secondary text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            </>
          )}
        </div>
      </section>

      {/* Side switcher */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["home", "away"] as const).map(side => {
          const t = side === "home" ? home : away;
          const isActive = activeSide === side;
          return (
            <button key={side} onClick={() => setActiveSide(side)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-colors ${isActive ? "border-primary bg-primary/5" : "border-transparent bg-card"}`}
            >
              <TeamBadge teamId={t.id} size={22} />
              <span className="text-sm font-bold truncate flex-1 text-left">{t.shortName}</span>
              {inShootout && (
                <span className="text-xs font-black tabular-nums text-primary">
                  {side === "home" ? homeSO : awaySO} rig.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Event buttons */}
      <section className="rounded-xl border bg-card p-3 mb-4">
        <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">
          {inShootout
            ? `Rigori · ${(activeSide === "home" ? home : away).shortName}`
            : `Evento · ${(activeSide === "home" ? home : away).name}`}
        </div>
        <div className={`grid gap-2 ${quickButtons.length <= 2 ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-5"}`}>
          {quickButtons.map(q => {
            const Icon = q.icon;
            return (
              <button key={q.label} disabled={!canRegister}
                onClick={() => setPickerEvent({ ...q, side: activeSide })}
                className={`flex flex-col items-center justify-center gap-1 py-4 rounded-lg font-semibold text-xs ${q.color} disabled:opacity-40 active:scale-[0.97] transition-transform`}
              >
                <Icon className="w-5 h-5" />
                {q.label}
              </button>
            );
          })}
        </div>
        {!canRegister && !isLocked && !isFinished && (
          <p className="text-[11px] text-muted-foreground mt-2 px-1">
            {phase === "half_time" ? "Intervallo — avvia il 2° tempo per registrare eventi." : "Avvia un tempo per registrare eventi."}
          </p>
        )}
        {isLocked && <p className="text-[11px] text-muted-foreground mt-2 px-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Partita bloccata.</p>}
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Timeline · {match.events.length} eventi
        </h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          {match.events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Nessun evento registrato.</div>
          ) : (
            <Timeline events={[...match.events].reverse()} home={home} away={away} />
          )}
        </div>
      </section>

      {isFinished && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-bold">Partita chiusa: {homeScore} – {awayScore}</div>
            {match.shootoutWinner && (
              <div className="text-xs text-muted-foreground">
                Vittoria ai rigori: {(match.shootoutWinner === "home" ? home : away).name}
              </div>
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
          home={home.name} away={away.name}
          homeScore={homeScore} awayScore={awayScore}
          homeSO={homeSO} awaySO={awaySO}
          inShootout={inShootout}
          onCancel={() => setConfirmClose(false)}
          onDirect={finishDirect}
          onShootout={finishShootout}
        />
      )}

      {confirmLock && (
        <LockDialog
          home={home.shortName} away={away.shortName}
          homeScore={homeScore} awayScore={awayScore}
          onCancel={() => setConfirmLock(false)}
          onConfirm={doLock}
        />
      )}
    </AdminShell>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function TeamCol({ team, side, active, onSelect }: {
  team: { id: string; shortName: string }; side: "home" | "away"; active: boolean; onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className={`flex flex-col items-center gap-2 p-2 rounded-lg ${active ? "bg-primary/5" : ""}`}>
      <TeamBadge teamId={team.id} size={52} />
      <div className="text-center">
        <div className="font-bold text-sm">{team.shortName}</div>
        <div className="text-[10px] uppercase text-muted-foreground">{side}</div>
      </div>
    </button>
  );
}

function PhaseBadge({ status, phase }: { status: MatchStatus; phase: Match["currentPhase"] }) {
  if (status === "live") {
    const label =
      phase === "first_half"  ? "1° TEMPO" :
      phase === "half_time"   ? "INTERVALLO" :
      phase === "second_half" ? "2° TEMPO" :
      phase === "shootout"    ? "RIGORI" : "LIVE";
    return (
      <span className="flex items-center gap-1.5 text-live text-xs font-bold uppercase">
        <span className="w-2 h-2 rounded-full bg-live live-pulse" /> {label}
      </span>
    );
  }
  if (status === "finished") return <span className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Finita</span>;
  if (status === "locked")   return <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Bloccata</span>;
  return <span className="text-xs font-bold text-muted-foreground uppercase">In attesa</span>;
}

const PERIOD_LABEL: Record<string, string> = {
  first_half: "— 1° Tempo —", second_half: "— 2° Tempo —", shootout: "— Rigori —",
};

function Timeline({ events, home, away }: {
  events: Match["events"];
  home: { id: string; shortName: string };
  away: { id: string; shortName: string };
}) {
  let lastPeriod: string | null | undefined = undefined;
  return (
    <>
      {events.map(ev => {
        const showSep = ev.period !== lastPeriod && ev.period != null;
        lastPeriod = ev.period;
        const sideTeam = ev.team === "home" ? home : away;
        const isCard = ev.type === "yellow_card" || ev.type === "red_card";
        const isMiss = ev.type === "shootout_miss";
        return (
          <div key={ev.id}>
            {showSep && (
              <div className="px-3 py-1 bg-secondary/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                {PERIOD_LABEL[ev.period!]}
              </div>
            )}
            <div className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
              <span className="w-10 text-center font-bold tabular-nums text-sm text-muted-foreground">{ev.minute}'</span>
              <TeamBadge teamId={sideTeam.id} size={20} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{getPlayer(ev.playerId)?.name ?? "—"}</div>
                <div className="text-[11px] text-muted-foreground">{ev.label}</div>
              </div>
              {ev.weight > 1 && (
                <span className="text-[10px] font-bold bg-violet-500/15 text-violet-600 px-1.5 py-0.5 rounded">×{ev.weight}</span>
              )}
              {isCard ? (
                <span className={`w-4 h-5 rounded-sm ${ev.type === "yellow_card" ? "bg-yellow-400" : "bg-red-600"}`} />
              ) : isMiss ? (
                <span className="text-xs font-black text-rose-500">✗</span>
              ) : (
                <Goal className={`w-4 h-4 ${ev.type === "own_goal" ? "text-destructive" : ev.type === "shootout_goal" ? "text-emerald-500" : "text-primary"}`} />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function PlayerPicker({ teamId, title, subtitle, onCancel, onPick }: {
  teamId: string; title: string; subtitle?: string; onCancel: () => void; onPick: (id: string) => void;
}) {
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
            <button key={p.id} onClick={() => onPick(p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 text-left"
            >
              <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold tabular-nums">{p.number || "—"}</span>
              <span className="flex-1 font-semibold text-sm">{p.name}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">{p.role === "p" ? "Portiere" : "Giocatore"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CloseDialog({ home, away, homeScore, awayScore, homeSO, awaySO, inShootout, onCancel, onDirect, onShootout }: {
  home: string; away: string; homeScore: number; awayScore: number;
  homeSO: number; awaySO: number; inShootout: boolean;
  onCancel: () => void; onDirect: () => void; onShootout: (w: "home" | "away") => void;
}) {
  const regHome = homeScore - homeSO;
  const regAway = awayScore - awaySO;
  const tiedInReg = regHome === regAway;
  const soWinner: "home" | "away" | null =
    inShootout ? (homeSO > awaySO ? "home" : awaySO > homeSO ? "away" : null) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border rounded-xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-black">Chiudere la partita?</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <div className="text-center text-3xl font-black tabular-nums mb-0.5">{homeScore} – {awayScore}</div>
          {(homeSO > 0 || awaySO > 0) && (
            <div className="text-center text-xs text-muted-foreground mb-1">reg. {regHome}–{regAway} · rig. {homeSO}–{awaySO}</div>
          )}
          <div className="text-center text-xs text-muted-foreground mb-4">{home} vs {away}</div>

          {inShootout ? (
            soWinner ? (
              <button onClick={() => onShootout(soWinner)} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-4 h-4" /> Vince {soWinner === "home" ? home : away} (rigori)
              </button>
            ) : (
              <>
                <div className="rounded-md bg-secondary/50 p-3 mb-3 text-xs">Rigori pari — scegli manualmente.</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => onShootout("home")} className="bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm">Vince {home}</button>
                  <button onClick={() => onShootout("away")} className="bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm">Vince {away}</button>
                </div>
              </>
            )
          ) : !tiedInReg ? (
            <button onClick={onDirect} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-4 h-4" /> Vittoria diretta
            </button>
          ) : (
            <>
              <div className="rounded-md bg-accent/10 border border-accent/30 p-3 mb-3 text-xs">
                Pari al 40' — usa "Avvia rigori" per lo shootout, oppure scegli il vincitore.
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => onShootout("home")} className="bg-secondary py-2.5 rounded-lg font-semibold text-sm">Vince {home}</button>
                <button onClick={() => onShootout("away")} className="bg-secondary py-2.5 rounded-lg font-semibold text-sm">Vince {away}</button>
              </div>
            </>
          )}
          <button onClick={onCancel} className="w-full border py-2 rounded-lg text-sm font-semibold">Annulla</button>
        </div>
      </div>
    </div>
  );
}

function LockDialog({ home, away, homeScore, awayScore, onCancel, onConfirm }: {
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
          <div className="text-center text-3xl font-black tabular-nums mb-1">{homeScore} – {awayScore}</div>
          <div className="text-center text-xs text-muted-foreground mb-4">{home} vs {away}</div>
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 mb-3 text-xs">
            Dopo il blocco non sarà possibile modificare eventi o punteggio.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCancel} className="border py-2 rounded-lg text-sm font-semibold">Annulla</button>
            <button onClick={onConfirm} className="bg-foreground text-background py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4" /> Conferma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
