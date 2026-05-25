import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  matches as allMatches,
  teams,
  getTeam,
  phaseLabel,
  phaseShort,
  upsertMatch,
  deleteMatch,
  useStoreVersion,
  type Match,
  type MatchPhase,
  type MatchStatus,
} from "@/lib/mockData";
import { Plus, Pencil, Trash2, X, Save, Calendar as CalIcon, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/calendario")({
  component: AdminCalendario,
  head: () => ({ meta: [{ title: "Gestione calendario — Admin" }] }),
});

const PHASES: MatchPhase[] = ["regular", "quarter", "semi", "third", "final"];

interface Draft {
  id: string;
  phase: MatchPhase;
  matchday: number;
  date: string; // datetime-local
  homeTeamId: string | "";
  awayTeamId: string | "";
  homeLabel: string;
  awayLabel: string;
  venue: string;
  status: MatchStatus;
}

function emptyDraft(phase: MatchPhase = "regular", matchday = 1): Draft {
  return {
    id: "",
    phase,
    matchday,
    date: "",
    homeTeamId: "",
    awayTeamId: "",
    homeLabel: "",
    awayLabel: "",
    venue: "Campo Centrale Cave",
    status: "scheduled",
  };
}

function toLocalInput(iso: string): string {
  // Convert ISO to local datetime-local input value
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminCalendario() {
  useStoreVersion();
  const list = allMatches;
  const [phaseFilter, setPhaseFilter] = useState<"all" | MatchPhase>("all");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Match | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => list.filter(m => phaseFilter === "all" || m.phase === phaseFilter)
              .slice().sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [list, phaseFilter],
  );

  const grouped = useMemo(() => {
    const g = new Map<number, Match[]>();
    for (const m of filtered) {
      if (!g.has(m.matchday)) g.set(m.matchday, []);
      g.get(m.matchday)!.push(m);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const openCreate = (phase?: MatchPhase) => {
    const max = Math.max(0, ...list.filter(m => !phase || m.phase === phase).map(m => m.matchday));
    setEditor({ mode: "create", draft: emptyDraft(phase ?? "regular", max || 1) });
  };

  const openEdit = (m: Match) => {
    setEditor({
      mode: "edit",
      draft: {
        id: m.id,
        phase: m.phase,
        matchday: m.matchday || 1,
        date: toLocalInput(m.date),
        homeTeamId: m.homeTeamId ?? "",
        awayTeamId: m.awayTeamId ?? "",
        homeLabel: m.homeLabel ?? "",
        awayLabel: m.awayLabel ?? "",
        venue: m.venue,
        status: m.status,
      },
    });
  };

  const save = async () => {
    if (!editor) return;
    const d = editor.draft;
    if (!d.date) return toast.error("Data e ora obbligatorie");
    const hasHomeTeam = !!d.homeTeamId;
    const hasAwayTeam = !!d.awayTeamId;
    if (!hasHomeTeam && !d.homeLabel) return toast.error("Specifica squadra home o etichetta placeholder");
    if (!hasAwayTeam && !d.awayLabel) return toast.error("Specifica squadra away o etichetta placeholder");
    if (hasHomeTeam && hasAwayTeam && d.homeTeamId === d.awayTeamId) return toast.error("Le due squadre devono essere diverse");

    setSaving(true);
    const res = await upsertMatch({
      id: d.id || undefined,
      phase: d.phase,
      matchday: d.matchday,
      date: new Date(d.date).toISOString(),
      homeTeamId: hasHomeTeam ? d.homeTeamId : null,
      awayTeamId: hasAwayTeam ? d.awayTeamId : null,
      homeLabel: hasHomeTeam ? undefined : d.homeLabel,
      awayLabel: hasAwayTeam ? undefined : d.awayLabel,
      venue: d.venue,
      status: d.status,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(editor.mode === "create" ? "Partita creata" : "Partita aggiornata");
    setEditor(null);
  };

  const remove = async (m: Match) => {
    const res = await deleteMatch(m.id);
    setConfirmDelete(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Partita eliminata");
  };

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-black mb-1">Gestione calendario</h1>
          <p className="text-sm text-muted-foreground">{list.length} partite · accoppiamenti tutti manuali</p>
        </div>
        <button onClick={() => openCreate()} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Nuova
        </button>
      </div>

      <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs flex items-start gap-2 mb-5">
        <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
        <div>
          Nessuna generazione automatica. Tutti gli accoppiamenti — regular season, quarti, semifinali, finale, terzo posto — vengono inseriti a mano dall'admin.
        </div>
      </div>

      {/* Phase filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-1 px-1">
        <FilterChip active={phaseFilter === "all"} onClick={() => setPhaseFilter("all")}>Tutte</FilterChip>
        {PHASES.map(p => (
          <FilterChip key={p} active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
            {phaseLabel[p]}
            <span className="ml-1.5 text-[10px] opacity-60">{list.filter(m => m.phase === p).length}</span>
          </FilterChip>
        ))}
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessuna partita per questa fase.
        </div>
      ) : grouped.map(([md, ms]) => (
        <div key={md} className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Giornata {md} <span className="font-normal text-[10px]">· {ms.length} partite</span>
            </h2>
            <button
              onClick={() => openCreate(ms[0]?.phase)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> aggiungi
            </button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {ms.map(m => <MatchRow key={m.id} m={m} onEdit={openEdit} onDelete={setConfirmDelete} />)}
          </div>
        </div>
      ))}

      {editor && <EditorDrawer editor={editor} setEditor={setEditor} onSave={save} />}
      {confirmDelete && <DeleteDialog match={confirmDelete} onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />}
    </AdminShell>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/50 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MatchRow({ m, onEdit, onDelete }: { m: Match; onEdit: (m: Match) => void; onDelete: (m: Match) => void }) {
  const date = new Date(m.date);
  const homeName = m.homeTeamId ? getTeam(m.homeTeamId)?.shortName : (m.homeLabel ?? "—");
  const awayName = m.awayTeamId ? getTeam(m.awayTeamId)?.shortName : (m.awayLabel ?? "—");
  return (
    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_140px_100px_auto] items-center gap-3 px-3 py-3 hover:bg-secondary/30">
      <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums">{phaseShort[m.phase]}{m.matchday}</span>
      <div className="flex items-center gap-2 min-w-0">
        {m.homeTeamId ? <TeamBadge teamId={m.homeTeamId} size={22} /> : <span className="w-[22px] h-[22px] rounded bg-secondary border border-dashed" />}
        <span className="text-sm font-semibold truncate">{homeName}</span>
        <span className="text-muted-foreground text-xs">vs</span>
        <span className="text-sm font-semibold truncate">{awayName}</span>
        {m.awayTeamId ? <TeamBadge teamId={m.awayTeamId} size={22} /> : <span className="w-[22px] h-[22px] rounded bg-secondary border border-dashed" />}
      </div>
      <div className="hidden sm:block text-xs text-muted-foreground tabular-nums">
        {date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} · {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="hidden sm:block"><StatusBadge status={m.status} /></div>
      <div className="flex items-center gap-0.5 justify-end">
        <button onClick={() => onEdit(m)} aria-label="Modifica" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(m)} aria-label="Elimina" className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="sm:hidden col-span-3 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums -mt-1">
        <CalIcon className="w-3 h-3" />
        {date.toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        <span className="ml-auto"><StatusBadge status={m.status} /></span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, { label: string; cls: string }> = {
    scheduled: { label: "Programmata", cls: "bg-secondary text-muted-foreground" },
    live: { label: "LIVE", cls: "bg-live text-live-foreground live-pulse" },
    finished: { label: "Finita", cls: "bg-success/15 text-success" },
    locked: { label: "Bloccata", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status];
  return <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>;
}

function EditorDrawer({
  editor,
  setEditor,
  onSave,
}: {
  editor: { mode: "create" | "edit"; draft: Draft };
  setEditor: (e: { mode: "create" | "edit"; draft: Draft } | null) => void;
  onSave: () => void;
}) {
  const d = editor.draft;
  const update = (patch: Partial<Draft>) => setEditor({ ...editor, draft: { ...d, ...patch } });
  const isKnockout = d.phase !== "regular";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setEditor(null)}>
      <div
        className="w-full sm:max-w-lg bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-black text-lg">{editor.mode === "create" ? "Nuova partita" : "Modifica partita"}</h3>
          <button onClick={() => setEditor(null)} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <Field label="Fase">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PHASES.map(p => (
                <button
                  key={p}
                  onClick={() => update({ phase: p })}
                  className={`px-2 py-2 rounded-md text-xs font-semibold border ${d.phase === p ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/50"}`}
                >
                  {phaseLabel[p]}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Giornata">
              <input type="number" min={1} value={d.matchday} onChange={e => update({ matchday: parseInt(e.target.value || "1") })} className="input" />
            </Field>
            <Field label="Stato">
              <select value={d.status} onChange={e => update({ status: e.target.value as MatchStatus })} className="input">
                <option value="scheduled">Programmata</option>
                <option value="live">Live</option>
                <option value="finished">Finita</option>
                <option value="locked">Bloccata</option>
              </select>
            </Field>
          </div>

          <Field label="Data e ora">
            <input type="datetime-local" value={d.date} onChange={e => update({ date: e.target.value })} className="input" />
          </Field>

          {/* Home */}
          <TeamPicker
            label="Squadra HOME"
            teamId={d.homeTeamId}
            placeholder={d.homeLabel}
            allowPlaceholder={isKnockout}
            onTeamChange={v => update({ homeTeamId: v, homeLabel: v ? "" : d.homeLabel })}
            onPlaceholderChange={v => update({ homeLabel: v })}
          />

          {/* Away */}
          <TeamPicker
            label="Squadra AWAY"
            teamId={d.awayTeamId}
            placeholder={d.awayLabel}
            allowPlaceholder={isKnockout}
            onTeamChange={v => update({ awayTeamId: v, awayLabel: v ? "" : d.awayLabel })}
            onPlaceholderChange={v => update({ awayLabel: v })}
          />

          <Field label="Sede">
            <input value={d.venue} onChange={e => update({ venue: e.target.value })} className="input" />
          </Field>
        </div>

        <div className="sticky bottom-0 bg-card border-t p-3 flex gap-2">
          <button onClick={() => setEditor(null)} className="flex-1 py-2.5 rounded-lg border font-semibold text-sm">Annulla</button>
          <button onClick={onSave} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5">
            <Save className="w-4 h-4" /> Salva
          </button>
        </div>
      </div>

      <style>{`.input{width:100%;background:var(--background);border:1px solid var(--border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function TeamPicker({
  label, teamId, placeholder, allowPlaceholder, onTeamChange, onPlaceholderChange,
}: {
  label: string;
  teamId: string;
  placeholder: string;
  allowPlaceholder: boolean;
  onTeamChange: (v: string) => void;
  onPlaceholderChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={teamId} onChange={e => onTeamChange(e.target.value)} className="input">
        <option value="">{allowPlaceholder ? "— usa etichetta placeholder —" : "— seleziona squadra —"}</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>)}
      </select>
      {allowPlaceholder && !teamId && (
        <input
          value={placeholder}
          onChange={e => onPlaceholderChange(e.target.value)}
          placeholder="es. Vincente QF1, 1° regular season"
          className="input mt-2"
        />
      )}
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function DeleteDialog({ match, onCancel, onConfirm }: { match: Match; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border rounded-xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-1">Eliminare la partita?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {phaseLabel[match.phase]} · giornata {match.matchday}. L'azione non può essere annullata.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border py-2 rounded-lg font-semibold text-sm">Annulla</button>
          <button onClick={onConfirm} className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg font-semibold text-sm">Elimina</button>
        </div>
      </div>
    </div>
  );
}
