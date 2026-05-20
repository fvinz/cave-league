import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
  head: () => ({ meta: [{ title: "Import CSV — Admin" }] }),
});

const templates = [
  { name: "squadre.csv", fields: "id, nome, short_name, color" },
  { name: "giocatori.csv", fields: "id, nome, team_id, ruolo (p|g|pres), numero" },
  { name: "calendario.csv", fields: "id, giornata, data_iso, home_id, away_id, venue" },
];

function ImportPage() {
  const [type, setType] = useState(templates[0].name);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <AdminShell>
      <h1 className="text-2xl font-black mb-1">Import CSV</h1>
      <p className="text-sm text-muted-foreground mb-6">Carica i dati del torneo da file CSV. (Mock — non collegato)</p>

      <div className="rounded-xl border bg-card p-5 mb-6">
        <label className="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tipo import</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full bg-background border rounded-lg px-3 py-2 text-sm mb-4"
        >
          {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

        <div className="text-xs text-muted-foreground mb-4">
          <span className="font-semibold text-foreground">Campi attesi: </span>
          {templates.find(t => t.name === type)?.fields}
        </div>

        <label className="block">
          <input
            type="file"
            accept=".csv"
            onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
            className="hidden"
          />
          <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <div className="text-sm font-semibold">{fileName ?? "Clicca per selezionare un file CSV"}</div>
            <div className="text-xs text-muted-foreground mt-1">Massimo 5MB</div>
          </div>
        </label>

        <button
          disabled={!fileName}
          className="mt-4 w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Importa {fileName ?? ""}
        </button>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Template disponibili</h2>
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.name} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground truncate">{t.fields}</div>
            </div>
            <button className="text-xs font-semibold text-primary hover:underline">Scarica</button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4 flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold">Validazione automatica</div>
          <div className="text-muted-foreground text-xs mt-0.5">I CSV verranno validati riga per riga prima dell'import.</div>
        </div>
      </div>
    </AdminShell>
  );
}
