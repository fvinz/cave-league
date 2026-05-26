import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { TeamBadge } from "@/components/TeamBadge";
import {
  teams,
  players,
  createPlayer,
  updatePlayer,
  deletePlayer,
  useStoreVersion,
  type Player,
  type PlayerRole,
} from "@/lib/mockData";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

export const Route = createFileRoute("/admin/giocatori")({
  component: AdminGiocatori,
  head: () => ({ meta: [{ title: "Gestione giocatori — Admin" }] }),
});

const ROLE_LABEL: Record<PlayerRole, string> = {
  p: "Portiere",
  g: "Giocatore",
  pres: "Presidente",
};

const ROLE_BADGE: Record<PlayerRole, string> = {
  p: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  g: "bg-green-500/15 text-green-600 dark:text-green-400",
  pres: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

interface Draft {
  id: string;
  full_name: string;
  team_id: string;
  role: PlayerRole;
  jersey_number: string;
}

function emptyDraft(defaultTeamId = ""): Draft {
  return { id: "", full_name: "", team_id: defaultTeamId, role: "g", jersey_number: "" };
}

function playerToDraft(p: Player): Draft {
  return {
    id: p.id,
    full_name: p.name,
    team_id: p.teamId,
    role: p.role,
    jersey_number: p.number > 0 ? String(p.number) : "",
  };
}

function AdminGiocatori() {
  useStoreVersion();
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; draft: Draft } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const filtered = useMemo(() => {
    const list = teamFilter === "all" ? players : players.filter(p => p.teamId === teamFilter);
    return [...list].sort((a, b) => {
      const ta = teams.find(t => t.id === a.teamId)?.name ?? "";
      const tb = teams.find(t => t.id === b.teamId)?.name ?? "";
      return ta.localeCompare(tb) || a.name.localeCompare(b.name);
    });
  }, [players, teamFilter, teams]);

  const openCreate = () => setEditor({ mode: "create", draft: emptyDraft(teamFilter !== "all" ? teamFilter : "") });
  const openEdit = (p: Player) => setEditor({ mode: "edit", draft: playerToDraft(p) });

  const save = async () => {
    if (!editor) return;
    const { id, full_name, team_id, role, jersey_number } = editor.draft;
    if (!full_name.trim()) return toast.error("Il nome è obbligatorio");
    if (!team_id) return toast.error("Seleziona una squadra");

    const numRaw = jersey_number.trim();
    if (numRaw && !/^\d+$/.test(numRaw)) return toast.error("Numero maglia deve essere intero");

    // Pre-check: same name already in target team (different player)
    const nameTrimmed = full_name.trim();
    const conflict = players.find(
      p => p.teamId === team_id && p.name === nameTrimmed && p.id !== id,
    );
    if (conflict) {
      const teamName = teams.find(t => t.id === team_id)?.name ?? "questa squadra";
      return toast.error(`"${nameTrimmed}" è già presente in ${teamName}`);
    }

    setSaving(true);
    const payload = {
      full_name: full_name.trim(),
      team_id,
      role,
      jersey_number: numRaw ? parseInt(numRaw, 10) : null,
    };
    const res = editor.mode === "create"
      ? await createPlayer(payload)
      : await updatePlayer(id, payload);
    setSaving(false);

    if (!res.ok) return toast.error(res.error);
    toast.success(editor.mode === "create" ? "Giocatore creato" : "Giocatore aggiornato");
    setEditor(null);
  };

  const remove = async (p: Player) => {
    const res = await deletePlayer(p.id);
    setConfirmDelete(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Giocatore eliminato");
  };

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black mb-1">Gestione giocatori</h1>
          <p className="text-sm text-muted-foreground">{players.length} giocatori totali</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuovo
        </button>
      </div>

      {/* Team filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-1 px-1">
        <FilterChip active={teamFilter === "all"} onClick={() => setTeamFilter("all")}>
          Tutti
          <span className="ml-1.5 text-[10px] opacity-60">{players.length}</span>
        </FilterChip>
        {sortedTeams.map(t => {
          const count = players.filter(p => p.teamId === t.id).length;
          return (
            <FilterChip key={t.id} active={teamFilter === t.id} onClick={() => setTeamFilter(t.id)}>
              {t.shortName}
              <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
            </FilterChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessun giocatore. Usa il pulsante "Nuovo" o l'Import CSV.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {filtered.map(p => (
            <PlayerRow key={p.id} player={p} onEdit={openEdit} onDelete={setConfirmDelete} />
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
          player={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </AdminShell>
  );
}

function FilterChip({
  children, active, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border shrink-0 transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:bg-secondary/50 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PlayerRow({
  player, onEdit, onDelete,
}: {
  player: Player;
  onEdit: (p: Player) => void;
  onDelete: (p: Player) => void;
}) {
  const team = teams.find(t => t.id === player.teamId);
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-secondary/30">
      <TeamBadge teamId={player.teamId} size={28} />
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{player.name}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {team?.name ?? "—"}
          {player.number > 0 && <span className="ml-2 font-mono">#{player.number}</span>}
        </div>
      </div>
      <span className={`hidden sm:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ROLE_BADGE[player.role]}`}>
        {ROLE_LABEL[player.role]}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onEdit(player)}
          aria-label="Modifica"
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(player)}
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
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

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
            {editor.mode === "create" ? "Nuovo giocatore" : "Modifica giocatore"}
          </h3>
          <button onClick={() => setEditor(null)} className="p-1.5 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Field label="Nome e cognome *">
            <input
              autoFocus
              value={d.full_name}
              onChange={e => update({ full_name: e.target.value })}
              placeholder="es. Marco Rossi"
              className="input"
            />
          </Field>

          <Field label="Squadra *">
            <select
              value={d.team_id}
              onChange={e => update({ team_id: e.target.value })}
              className="input"
            >
              <option value="">— seleziona squadra —</option>
              {sortedTeams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ruolo *">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ROLE_LABEL) as PlayerRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => update({ role: r })}
                  className={`px-2 py-2 rounded-md text-xs font-semibold border transition-colors ${
                    d.role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary/50"
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Numero maglia">
            <input
              type="number"
              min={0}
              max={99}
              value={d.jersey_number}
              onChange={e => update({ jersey_number: e.target.value })}
              placeholder="es. 7"
              className="input"
            />
          </Field>
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
  player, onCancel, onConfirm,
}: {
  player: Player;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const team = teams.find(t => t.id === player.teamId);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-card border rounded-xl p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-lg mb-1">Eliminare il giocatore?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-semibold text-foreground">{player.name}</span>
          {team && <span> ({team.name})</span>} verrà rimosso in modo permanente.
        </p>
        <div className="flex gap-2">
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
