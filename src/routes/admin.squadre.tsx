import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  teams,
  players,
  createTeam,
  updateTeam,
  deleteTeam,
  useStoreVersion,
  type Team,
} from "@/lib/mockData";
import { Plus, Pencil, Trash2, X, Save, Users } from "lucide-react";

export const Route = createFileRoute("/admin/squadre")({
  component: AdminSquadre,
  head: () => ({ meta: [{ title: "Gestione squadre — Admin" }] }),
});

interface Draft {
  id: string;
  name: string;
  slug: string;
  short_name: string;
  color: string;
  is_in_championship: boolean;
}

function emptyDraft(): Draft {
  return { id: "", name: "", slug: "", short_name: "", color: "#0f172a", is_in_championship: true };
}

function teamToDraft(t: Team): Draft {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug ?? "",
    short_name: t.shortName,
    color: t.color,
    is_in_championship: t.isInChampionship,
  };
}

function AdminSquadre() {
  useStoreVersion();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const playerCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of players) counts[p.teamId] = (counts[p.teamId] ?? 0) + 1;
    return counts;
  }, [players]);

  const openCreate = () => setEditor({ mode: "create", draft: emptyDraft() });
  const openEdit = (t: Team) => setEditor({ mode: "edit", draft: teamToDraft(t) });

  const save = async () => {
    if (!editor) return;
    const { id, name, slug, short_name, color } = editor.draft;
    if (!name.trim()) return toast.error("Il nome è obbligatorio");
    if (short_name.trim().length > 4) return toast.error("Lo short name può avere al massimo 4 caratteri");
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return toast.error("Colore non valido (formato #rrggbb)");

    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: slug.trim() || null,
      short_name: short_name.trim() || null,
      color: color || null,
      is_in_championship: editor.draft.is_in_championship,
    };
    const res = editor.mode === "create"
      ? await createTeam(payload)
      : await updateTeam(id, payload);
    setSaving(false);

    if (!res.ok) return toast.error(res.error);
    toast.success(editor.mode === "create" ? "Squadra creata" : "Squadra aggiornata");
    setEditor(null);
  };

  const remove = async (t: Team) => {
    const res = await deleteTeam(t.id);
    setConfirmDelete(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Squadra eliminata");
  };

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">Gestione squadre</h1>
          <p className="text-sm text-muted-foreground">{teams.length} squadre registrate</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuova
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessuna squadra. Usa il pulsante "Nuova" o l'Import CSV.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {sorted.map(t => (
            <TeamRow
              key={t.id}
              team={t}
              playerCount={playerCount[t.id] ?? 0}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
      )}

      {editor && (
        <EditorDrawer
          editor={editor}
          setEditor={setEditor}
          onSave={save}
          saving={saving}
        />
      )}
      {confirmDelete && (
        <DeleteDialog
          team={confirmDelete}
          playerCount={playerCount[confirmDelete.id] ?? 0}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </AdminShell>
  );
}

function TeamRow({
  team, playerCount, onEdit, onDelete,
}: {
  team: Team;
  playerCount: number;
  onEdit: (t: Team) => void;
  onDelete: (t: Team) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-secondary/30">
      <TeamBadge teamId={team.id} size={32} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{team.name}</span>
          {!team.isInChampionship && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground rounded px-1.5 py-0.5">
              Evento
            </span>
          )}
          <span
            className="shrink-0 inline-flex items-center justify-center text-[10px] font-black rounded px-1.5 py-0.5"
            style={{ background: team.color, color: team.accent }}
          >
            {team.shortName}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
          {team.slug ? `slug: ${team.slug}` : <span className="italic">nessun slug</span>}
        </div>
      </div>
      <div
        className="w-5 h-5 rounded border border-border shrink-0"
        style={{ background: team.color }}
        title={team.color}
      />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>{playerCount}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onEdit(team)}
          aria-label="Modifica"
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(team)}
          aria-label="Elimina"
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EditorDrawer({
  editor, setEditor, onSave, saving,
}: {
  editor: { mode: "create" | "edit"; draft: Draft };
  setEditor: (e: { mode: "create" | "edit"; draft: Draft } | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const d = editor.draft;
  const update = (patch: Partial<Draft>) => setEditor({ ...editor, draft: { ...d, ...patch } });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={() => setEditor(null)}
    >
      <div
        className="w-full sm:max-w-md bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-black text-lg">
            {editor.mode === "create" ? "Nuova squadra" : "Modifica squadra"}
          </h3>
          <button onClick={() => setEditor(null)} className="p-1.5 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Field label="Nome *">
            <input
              autoFocus
              value={d.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="es. Black Wolves"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Short name (max 4 car.)">
              <input
                value={d.short_name}
                onChange={e => update({ short_name: e.target.value.toUpperCase().slice(0, 4) })}
                placeholder="es. BWV"
                maxLength={4}
                className="input font-mono"
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                value={d.slug}
                onChange={e => update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="es. black-wolves"
                className="input"
              />
            </Field>
          </div>

          <Field label="Colore principale">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={d.color}
                onChange={e => update({ color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-border p-0.5 bg-background"
              />
              <input
                value={d.color}
                onChange={e => update({ color: e.target.value })}
                placeholder="#0f172a"
                maxLength={7}
                className="input font-mono flex-1"
              />
              {/* live preview badge */}
              <span
                className="shrink-0 inline-flex items-center justify-center text-xs font-black rounded px-2 py-1 border"
                style={{
                  background: /^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color : "#0f172a",
                  color: "#ffffff",
                }}
              >
                {d.short_name || "ABC"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Il colore di contrasto per i badge viene calcolato automaticamente.
            </p>
          </Field>

          {/* Championship toggle */}
          <button
            type="button"
            onClick={() => update({ is_in_championship: !d.is_in_championship })}
            className={`w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              d.is_in_championship
                ? "border-primary/40 bg-primary/6 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">
                {d.is_in_championship ? "Squadra in campionato" : "Squadra fuori campionato"}
              </div>
              <div className="text-[11px] mt-0.5">
                {d.is_in_championship
                  ? "Conta in classifica e nelle statistiche."
                  : "Solo partite evento — non altera classifica né statistiche."}
              </div>
            </div>
            <div
              className={`w-10 h-6 rounded-full flex items-center shrink-0 transition-colors px-0.5 ${
                d.is_in_championship ? "bg-primary justify-end" : "bg-muted-foreground/30 justify-start"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow" />
            </div>
          </button>
        </div>

        <div className="sticky bottom-0 bg-card border-t p-3 flex gap-2">
          <button
            onClick={() => setEditor(null)}
            className="flex-1 py-2.5 rounded-lg border font-semibold text-sm"
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--background);border:1px solid var(--border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function DeleteDialog({
  team, playerCount, onCancel, onConfirm,
}: {
  team: Team;
  playerCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-card border rounded-xl p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-lg mb-1">Eliminare la squadra?</h3>
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-semibold text-foreground">{team.name}</span> verrà rimossa in modo
          permanente.
        </p>
        {playerCount > 0 && (
          <p className="text-sm text-destructive mb-3">
            Attenzione: verranno eliminati anche {playerCount} giocator
            {playerCount === 1 ? "e" : "i"} associat{playerCount === 1 ? "o" : "i"} (CASCADE).
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 border py-2 rounded-lg font-semibold text-sm">
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg font-semibold text-sm"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
