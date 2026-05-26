import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  matches as allMatches,
  calendarEvents as allCalEvents,
  teams,
  getTeam,
  phaseLabel,
  phaseShort,
  upsertMatch,
  deleteMatch,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  useStoreVersion,
  type Match,
  type MatchPhase,
  type MatchStatus,
  type CalendarEvent,
} from "@/lib/mockData";
import {
  Plus, Pencil, Trash2, X, Save, Calendar as CalIcon, AlertTriangle, Star,
} from "lucide-react";

export const Route = createFileRoute("/admin/calendario")({
  component: AdminCalendario,
  head: () => ({ meta: [{ title: "Gestione calendario — Admin" }] }),
});

const PHASES: MatchPhase[] = ["regular", "quarter", "semi", "third", "final"];

// ── match draft ───────────────────────────────────────────────────────────────
interface MatchDraft {
  id: string; phase: MatchPhase; matchday: number; date: string;
  homeTeamId: string; awayTeamId: string; homeLabel: string; awayLabel: string;
  venue: string; status: MatchStatus;
}
function emptyMatchDraft(phase: MatchPhase = "regular", matchday = 1): MatchDraft {
  return { id: "", phase, matchday, date: "", homeTeamId: "", awayTeamId: "", homeLabel: "", awayLabel: "", venue: "Anfiteatro Cave", status: "scheduled" };
}
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── event draft ───────────────────────────────────────────────────────────────
interface EventDraft {
  id: string; title: string; description: string; event_date: string; start_time: string;
}
function emptyEventDraft(): EventDraft {
  return { id: "", title: "", description: "", event_date: "", start_time: "" };
}
function calEventToDraft(e: CalendarEvent): EventDraft {
  return { id: e.id, title: e.title, description: e.description ?? "", event_date: e.date, start_time: e.startTime ?? "" };
}

// ── component ─────────────────────────────────────────────────────────────────
type Tab = "matches" | "events";

function AdminCalendario() {
  useStoreVersion();
  const [tab, setTab] = useState<Tab>("matches");
  const [phaseFilter, setPhaseFilter] = useState<"all" | MatchPhase>("all");
  const [matchEditor, setMatchEditor] = useState<{ mode: "create" | "edit"; draft: MatchDraft } | null>(null);
  const [eventEditor, setEventEditor] = useState<{ mode: "create" | "edit"; draft: EventDraft } | null>(null);
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState<Match | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // Matches tab
  const filteredMatches = useMemo(
    () => allMatches
      .filter(m => phaseFilter === "all" || m.phase === phaseFilter)
      .slice().sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [allMatches, phaseFilter],
  );
  const groupedMatches = useMemo(() => {
    const g = new Map<number, Match[]>();
    for (const m of filteredMatches) {
      if (!g.has(m.matchday)) g.set(m.matchday, []);
      g.get(m.matchday)!.push(m);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [filteredMatches]);

  const openCreateMatch = (phase?: MatchPhase) => {
    const max = Math.max(0, ...allMatches.filter(m => !phase || m.phase === phase).map(m => m.matchday));
    setMatchEditor({ mode: "create", draft: emptyMatchDraft(phase ?? "regular", max || 1) });
  };
  const openEditMatch = (m: Match) => setMatchEditor({
    mode: "edit",
    draft: { id: m.id, phase: m.phase, matchday: m.matchday || 1, date: toLocalInput(m.date), homeTeamId: m.homeTeamId ?? "", awayTeamId: m.awayTeamId ?? "", homeLabel: m.homeLabel ?? "", awayLabel: m.awayLabel ?? "", venue: m.venue, status: m.status },
  });

  const saveMatch = async () => {
    if (!matchEditor) return;
    const d = matchEditor.draft;
    if (!d.date) return toast.error("Data e ora obbligatorie");
    const hasHome = !!d.homeTeamId; const hasAway = !!d.awayTeamId;
    if (hasHome && hasAway && d.homeTeamId === d.awayTeamId) return toast.error("Stessa squadra!");
    setSaving(true);
    const res = await upsertMatch({
      id: d.id || undefined, phase: d.phase, matchday: d.matchday,
      date: new Date(d.date).toISOString(),
      homeTeamId: hasHome ? d.homeTeamId : null, awayTeamId: hasAway ? d.awayTeamId : null,
      homeLabel: hasHome ? undefined : d.homeLabel, awayLabel: hasAway ? undefined : d.awayLabel,
      venue: d.venue, status: d.status,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(matchEditor.mode === "create" ? "Partita creata" : "Partita aggiornata");
    setMatchEditor(null);
  };
  const removeMatch = async (m: Match) => {
    const res = await deleteMatch(m.id);
    setConfirmDeleteMatch(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Partita eliminata");
  };

  // Events tab
  const sortedEvents = useMemo(
    () => [...allCalEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [allCalEvents],
  );
  const openCreateEvent = () => setEventEditor({ mode: "create", draft: emptyEventDraft() });
  const openEditEvent = (e: CalendarEvent) => setEventEditor({ mode: "edit", draft: calEventToDraft(e) });

  const saveEvent = async () => {
    if (!eventEditor) return;
    const d = eventEditor.draft;
    if (!d.title.trim()) return toast.error("Il titolo è obbligatorio");
    if (!d.event_date) return toast.error("La data è obbligatoria");
    setSaving(true);
    const payload = {
      title: d.title.trim(),
      description: d.description.trim() || undefined,
      event_date: d.event_date,
      start_time: d.start_time || undefined,
    };
    const res = eventEditor.mode === "create"
      ? await createCalendarEvent(payload)
      : await updateCalendarEvent(eventEditor.draft.id, payload);
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(eventEditor.mode === "create" ? "Evento creato" : "Evento aggiornato");
    setEventEditor(null);
  };
  const removeEvent = async (e: CalendarEvent) => {
    const res = await deleteCalendarEvent(e.id);
    setConfirmDeleteEvent(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Evento eliminato");
  };

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black mb-1">Gestione calendario</h1>
          <p className="text-sm text-muted-foreground">
            {allMatches.length} partite · {allCalEvents.length} altri eventi
          </p>
        </div>
        <button
          onClick={() => tab === "matches" ? openCreateMatch() : openCreateEvent()}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuovo
        </button>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex bg-secondary rounded-lg p-1 mb-5">
        <TabBtn active={tab === "matches"} onClick={() => setTab("matches")}>Partite</TabBtn>
        <TabBtn active={tab === "events"}  onClick={() => setTab("events")}>Altri eventi</TabBtn>
      </div>

      {/* ── MATCHES TAB ── */}
      {tab === "matches" && (
        <>
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
            <span>Tutti gli accoppiamenti — regular season, quarti, semifinali, finale, terzo posto — vengono inseriti a mano.</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-1 px-1">
            <FilterChip active={phaseFilter === "all"} onClick={() => setPhaseFilter("all")}>Tutte</FilterChip>
            {PHASES.map(p => (
              <FilterChip key={p} active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
                {phaseLabel[p]}
                <span className="ml-1.5 text-[10px] opacity-60">{allMatches.filter(m => m.phase === p).length}</span>
              </FilterChip>
            ))}
          </div>

          {groupedMatches.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Nessuna partita.</div>
          ) : groupedMatches.map(([md, ms]) => (
            <div key={md} className="mb-5">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Giornata {md} <span className="font-normal text-[10px]">· {ms.length} partite</span>
                </h2>
                <button onClick={() => openCreateMatch(ms[0]?.phase)} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> aggiungi
                </button>
              </div>
              <div className="rounded-xl border bg-card overflow-hidden divide-y">
                {ms.map(m => <MatchRow key={m.id} m={m} onEdit={openEditMatch} onDelete={setConfirmDeleteMatch} />)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── EVENTS TAB ── */}
      {tab === "events" && (
        sortedEvents.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nessun evento. Usa il pulsante "Nuovo".
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {sortedEvents.map(e => (
              <EventRow key={e.id} event={e} onEdit={openEditEvent} onDelete={setConfirmDeleteEvent} />
            ))}
          </div>
        )
      )}

      {/* Editors */}
      {matchEditor && (
        <MatchEditorDrawer editor={matchEditor} setEditor={setMatchEditor} onSave={saveMatch} saving={saving} />
      )}
      {eventEditor && (
        <EventEditorDrawer editor={eventEditor} setEditor={setEventEditor} onSave={saveEvent} saving={saving} />
      )}

      {/* Delete dialogs */}
      {confirmDeleteMatch && (
        <DeleteDialog
          title="Eliminare la partita?"
          body={`${phaseLabel[confirmDeleteMatch.phase]} · giornata ${confirmDeleteMatch.matchday}. L'azione non può essere annullata.`}
          onCancel={() => setConfirmDeleteMatch(null)}
          onConfirm={() => removeMatch(confirmDeleteMatch)}
        />
      )}
      {confirmDeleteEvent && (
        <DeleteDialog
          title="Eliminare l'evento?"
          body={`"${confirmDeleteEvent.title}" verrà rimosso in modo permanente.`}
          onCancel={() => setConfirmDeleteEvent(null)}
          onConfirm={() => removeEvent(confirmDeleteEvent)}
        />
      )}
    </AdminShell>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/50 text-muted-foreground"}`}
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
      <div className="hidden sm:block"><MatchStatusBadge status={m.status} /></div>
      <div className="flex items-center gap-0.5 justify-end">
        <button onClick={() => onEdit(m)} aria-label="Modifica" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(m)} aria-label="Elimina" className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="sm:hidden col-span-3 flex items-center gap-2 text-[11px] text-muted-foreground -mt-1">
        <CalIcon className="w-3 h-3" />
        {date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        <span className="ml-auto"><MatchStatusBadge status={m.status} /></span>
      </div>
    </div>
  );
}

function EventRow({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void; onDelete: (e: CalendarEvent) => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 hover:bg-secondary/30">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Star className="w-3.5 h-3.5 text-accent-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{event.title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(event.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          {event.startTime && <span className="ml-2">{event.startTime}</span>}
          {event.description && <span className="ml-2 italic truncate">{event.description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onEdit(event)} aria-label="Modifica" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(event)} aria-label="Elimina" className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, { label: string; cls: string }> = {
    scheduled: { label: "Programmata", cls: "bg-secondary text-muted-foreground" },
    live:      { label: "LIVE",        cls: "bg-live text-live-foreground live-pulse" },
    finished:  { label: "Finita",      cls: "bg-success/15 text-success" },
    locked:    { label: "Bloccata",    cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status];
  return <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.cls}`}>{s.label}</span>;
}

// ── Match editor drawer ───────────────────────────────────────────────────────
function MatchEditorDrawer({
  editor, setEditor, onSave, saving,
}: {
  editor: { mode: "create" | "edit"; draft: MatchDraft };
  setEditor: (e: { mode: "create" | "edit"; draft: MatchDraft } | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const d = editor.draft;
  const update = (patch: Partial<MatchDraft>) => setEditor({ ...editor, draft: { ...d, ...patch } });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setEditor(null)}>
      <div className="w-full sm:max-w-lg bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-black text-lg">{editor.mode === "create" ? "Nuova partita" : "Modifica partita"}</h3>
          <button onClick={() => setEditor(null)} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Fase">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PHASES.map(p => (
                <button key={p} onClick={() => update({ phase: p })}
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
          <TeamPicker label="Squadra HOME" teamId={d.homeTeamId} placeholder={d.homeLabel}
            onTeamChange={v => update({ homeTeamId: v, homeLabel: v ? "" : d.homeLabel })}
            onPlaceholderChange={v => update({ homeLabel: v })} />
          <TeamPicker label="Squadra AWAY" teamId={d.awayTeamId} placeholder={d.awayLabel}
            onTeamChange={v => update({ awayTeamId: v, awayLabel: v ? "" : d.awayLabel })}
            onPlaceholderChange={v => update({ awayLabel: v })} />
          <Field label="Sede">
            <input value={d.venue} onChange={e => update({ venue: e.target.value })} className="input" />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-card border-t p-3 flex gap-2">
          <button onClick={() => setEditor(null)} className="flex-1 py-2.5 rounded-lg border font-semibold text-sm">Annulla</button>
          <button onClick={onSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--background);border:1px solid var(--border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

// ── Event editor drawer ───────────────────────────────────────────────────────
function EventEditorDrawer({
  editor, setEditor, onSave, saving,
}: {
  editor: { mode: "create" | "edit"; draft: EventDraft };
  setEditor: (e: { mode: "create" | "edit"; draft: EventDraft } | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const d = editor.draft;
  const update = (patch: Partial<EventDraft>) => setEditor({ ...editor, draft: { ...d, ...patch } });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setEditor(null)}>
      <div className="w-full sm:max-w-md bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-black text-lg">{editor.mode === "create" ? "Nuovo evento" : "Modifica evento"}</h3>
          <button onClick={() => setEditor(null)} className="p-1.5 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="Titolo *">
            <input autoFocus value={d.title} onChange={e => update({ title: e.target.value })} placeholder="es. Cerimonia di apertura" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data *">
              <input type="date" value={d.event_date} onChange={e => update({ event_date: e.target.value })} className="input" />
            </Field>
            <Field label="Orario">
              <input type="time" value={d.start_time} onChange={e => update({ start_time: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Descrizione">
            <textarea value={d.description} onChange={e => update({ description: e.target.value })} rows={3} placeholder="Descrizione opzionale…" className="input resize-none" />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-card border-t p-3 flex gap-2">
          <button onClick={() => setEditor(null)} className="flex-1 py-2.5 rounded-lg border font-semibold text-sm">Annulla</button>
          <button onClick={onSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--background);border:1px solid var(--border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function TeamPicker({ label, teamId, placeholder, onTeamChange, onPlaceholderChange }: {
  label: string; teamId: string; placeholder: string;
  onTeamChange: (v: string) => void; onPlaceholderChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={teamId} onChange={e => onTeamChange(e.target.value)} className="input">
        <option value="">— da definire —</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>)}
      </select>
      {!teamId && (
        <input value={placeholder} onChange={e => onPlaceholderChange(e.target.value)} placeholder="Etichetta opzionale (es. Vincente QF1)" className="input mt-2" />
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

function DeleteDialog({ title, body, onCancel, onConfirm }: {
  title: string; body: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border rounded-xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{body}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border py-2 rounded-lg font-semibold text-sm">Annulla</button>
          <button onClick={onConfirm} className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg font-semibold text-sm">Elimina</button>
        </div>
      </div>
    </div>
  );
}
