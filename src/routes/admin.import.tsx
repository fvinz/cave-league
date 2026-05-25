import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import {
  teams, players, matches, getTeam,
  upsertTeams, upsertPlayers, upsertMatch,
  useStoreVersion,
  type PlayerRole, type MatchPhase,
} from "@/lib/mockData";
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Copy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
  head: () => ({ meta: [{ title: "Import CSV — Admin" }] }),
});

type ImportType = "squadre" | "giocatori" | "calendario";

interface Template {
  key: ImportType;
  name: string;
  fields: string[];
  required: string[];
  example: string;
  description: string;
}

const TEMPLATES: Record<ImportType, Template> = {
  squadre: {
    key: "squadre",
    name: "squadre.csv",
    fields: ["id", "nome", "short_name", "color"],
    required: ["id", "nome", "short_name"],
    description: "Anagrafica delle 12 squadre del torneo.",
    example: `id,nome,short_name,color
t1,Black Wolves,BWV,#0f172a
t2,Cave Roma,ROM,#dc2626`,
  },
  giocatori: {
    key: "giocatori",
    name: "giocatori.csv",
    fields: ["id", "nome", "team_id", "ruolo", "numero"],
    required: ["id", "nome", "team_id", "ruolo"],
    description: "Roster squadre. Ruoli ammessi: p (portiere), g (giocatore), pres (presidente).",
    example: `id,nome,team_id,ruolo,numero
t1-p0,Marco Rossi,t1,p,1
t1-p1,Luca Bianchi,t1,g,7
t1-p9,Andrea Verdi,t1,pres,99`,
  },
  calendario: {
    key: "calendario",
    name: "calendario.csv",
    fields: ["id", "giornata", "data_iso", "home_id", "away_id", "venue", "fase"],
    required: ["id", "giornata", "data_iso", "home_id", "away_id"],
    description:
      "Partite del torneo. Tutti gli accoppiamenti sono manuali, anche per quarti, semifinali, finale e terzo posto.",
    example: `id,giornata,data_iso,home_id,away_id,venue,fase
rs-1,1,2026-06-05T19:00,t1,t2,Campo Centrale,regular
qf-1,5,2026-06-13T18:00,t1,t8,Campo Centrale,quarter`,
  },
};

const ALLOWED_ROLES = ["p", "g", "pres"];
const ALLOWED_PHASES = ["regular", "quarter", "semi", "third", "final"];

type Severity = "error" | "warn";
interface Issue {
  row: number;
  field?: string;
  message: string;
  severity: Severity;
}

interface ParsedRow {
  index: number; // 1-based (data row, not header)
  data: Record<string, string>;
  issues: Issue[];
  duplicate?: "existing" | "in-csv";
}

interface ParsedResult {
  headers: string[];
  rows: ParsedRow[];
  fileIssues: Issue[];
}

// -------- CSV PARSER (minimal, handles quoted values) --------
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some(v => v.trim().length > 0)) out.push(row);
        row = [];
      } else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); if (row.some(v => v.trim().length > 0)) out.push(row); }
  return out;
}

function validate(type: ImportType, raw: string): ParsedResult {
  const tpl = TEMPLATES[type];
  const fileIssues: Issue[] = [];
  const rowsRaw = parseCsv(raw.trim());
  if (rowsRaw.length === 0) {
    return { headers: [], rows: [], fileIssues: [{ row: 0, message: "File vuoto.", severity: "error" }] };
  }
  const headers = rowsRaw[0].map(h => h.trim().toLowerCase());

  // Check required fields are present in header
  for (const req of tpl.required) {
    if (!headers.includes(req)) {
      fileIssues.push({ row: 0, field: req, message: `Colonna obbligatoria mancante: "${req}".`, severity: "error" });
    }
  }
  // Warn unknown columns
  for (const h of headers) {
    if (!tpl.fields.includes(h)) {
      fileIssues.push({ row: 0, field: h, message: `Colonna sconosciuta "${h}" — verrà ignorata.`, severity: "warn" });
    }
  }

  const teamIds = new Set(teams.map(t => t.id));
  const existingByType: Set<string> =
    type === "squadre" ? new Set(teams.map(t => t.id))
    : type === "giocatori" ? new Set(players.map(p => p.id))
    : new Set(matches.map(m => m.id));

  const seenIds = new Set<string>();
  const rows: ParsedRow[] = rowsRaw.slice(1).map((cells, idx) => {
    const data: Record<string, string> = {};
    headers.forEach((h, i) => { data[h] = (cells[i] ?? "").trim(); });
    const issues: Issue[] = [];

    // required fields
    for (const req of tpl.required) {
      if (!data[req]) issues.push({ row: idx + 1, field: req, message: `${req} mancante`, severity: "error" });
    }

    // per-type validation
    if (type === "squadre") {
      if (data.short_name && data.short_name.length > 4)
        issues.push({ row: idx + 1, field: "short_name", message: "max 4 caratteri", severity: "warn" });
      if (data.color && !/^#[0-9a-fA-F]{6}$/.test(data.color))
        issues.push({ row: idx + 1, field: "color", message: "formato colore non valido (#rrggbb)", severity: "warn" });
    }
    if (type === "giocatori") {
      if (data.ruolo && !ALLOWED_ROLES.includes(data.ruolo))
        issues.push({ row: idx + 1, field: "ruolo", message: `ruolo "${data.ruolo}" non ammesso (p, g, pres)`, severity: "error" });
      if (data.team_id && !teamIds.has(data.team_id))
        issues.push({ row: idx + 1, field: "team_id", message: `squadra "${data.team_id}" inesistente`, severity: "error" });
      if (data.numero && !/^\d+$/.test(data.numero))
        issues.push({ row: idx + 1, field: "numero", message: "deve essere un numero intero", severity: "warn" });
    }
    if (type === "calendario") {
      if (data.giornata && !/^\d+$/.test(data.giornata))
        issues.push({ row: idx + 1, field: "giornata", message: "deve essere un numero", severity: "error" });
      if (data.data_iso && isNaN(Date.parse(data.data_iso)))
        issues.push({ row: idx + 1, field: "data_iso", message: "data ISO non valida", severity: "error" });
      if (data.home_id && !teamIds.has(data.home_id))
        issues.push({ row: idx + 1, field: "home_id", message: `squadra "${data.home_id}" inesistente`, severity: "error" });
      if (data.away_id && !teamIds.has(data.away_id))
        issues.push({ row: idx + 1, field: "away_id", message: `squadra "${data.away_id}" inesistente`, severity: "error" });
      if (data.home_id && data.away_id && data.home_id === data.away_id)
        issues.push({ row: idx + 1, field: "away_id", message: "home e away non possono coincidere", severity: "error" });
      if (data.fase && !ALLOWED_PHASES.includes(data.fase))
        issues.push({ row: idx + 1, field: "fase", message: `fase "${data.fase}" non ammessa`, severity: "warn" });
    }

    // duplicates
    let duplicate: ParsedRow["duplicate"];
    if (data.id) {
      if (seenIds.has(data.id)) {
        duplicate = "in-csv";
        issues.push({ row: idx + 1, field: "id", message: `id "${data.id}" duplicato nel CSV`, severity: "error" });
      } else if (existingByType.has(data.id)) {
        duplicate = "existing";
        issues.push({ row: idx + 1, field: "id", message: `id "${data.id}" già presente — verrà aggiornato`, severity: "warn" });
      }
      seenIds.add(data.id);
    }

    return { index: idx + 1, data, issues, duplicate };
  });

  return { headers, rows, fileIssues };
}

function ImportPage() {
  useStoreVersion();
  const [type, setType] = useState<ImportType>("squadre");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);

  const tpl = TEMPLATES[type];
  const result = useMemo<ParsedResult | null>(() => (text.trim() ? validate(type, text) : null), [type, text]);

  const errorCount = (result?.fileIssues.filter(i => i.severity === "error").length ?? 0)
    + (result?.rows.reduce((n, r) => n + r.issues.filter(i => i.severity === "error").length, 0) ?? 0);
  const warnCount = (result?.fileIssues.filter(i => i.severity === "warn").length ?? 0)
    + (result?.rows.reduce((n, r) => n + r.issues.filter(i => i.severity === "warn").length, 0) ?? 0);
  const dupExisting = result?.rows.filter(r => r.duplicate === "existing").length ?? 0;
  const validRows = result?.rows.filter(r => r.issues.every(i => i.severity !== "error")).length ?? 0;

  const onFile = async (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    const t = await f.text();
    setText(t);
    toast.success(`File "${f.name}" caricato`);
  };

  const loadExample = () => {
    setText(tpl.example);
    setFileName(`esempio-${tpl.name}`);
    toast.info("Esempio caricato");
  };

  const clearAll = () => {
    setText("");
    setFileName(null);
  };

  const runImport = async () => {
    if (!result) return;
    if (errorCount > 0) {
      toast.error(`Impossibile importare: ${errorCount} errore/i da correggere`);
      return;
    }
    setImporting(true);
    try {
      const rows = result.rows.filter(r => r.issues.every(i => i.severity !== "error"));
      const fresh = skipDuplicates ? rows.filter(r => r.duplicate !== "existing") : rows;

      if (type === "squadre") {
        await upsertTeams(fresh.map(r => ({ name: r.data.nome, slug: r.data.id || null })));
      } else if (type === "giocatori") {
        const teamByCsvId: Record<string, string> = {};
        teams.forEach(t => { teamByCsvId[t.id] = t.id; });
        await upsertPlayers(fresh.map(r => ({
          full_name: r.data.nome,
          team_id: r.data.team_id,
          role: r.data.ruolo as PlayerRole,
          jersey_number: r.data.numero ? parseInt(r.data.numero) : null,
        })));
      } else {
        for (const r of fresh) {
          const phase = (r.data.fase || "regular") as MatchPhase;
          const res = await upsertMatch({
            phase,
            matchday: parseInt(r.data.giornata || "1"),
            date: new Date(r.data.data_iso).toISOString(),
            homeTeamId: r.data.home_id || null,
            awayTeamId: r.data.away_id || null,
            venue: r.data.venue || "Campo Centrale Cave",
            status: "scheduled",
          });
          if (!res.ok) throw new Error(res.error);
        }
      }
      toast.success(`Import completato · ${fresh.length} record`);
      setText("");
      setFileName(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      toast.error("Import fallito", { description: msg });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="text-2xl font-black mb-1">Import CSV</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Carica squadre, giocatori e calendario. Validazione e anteprima prima dell'import. <span className="italic">(Mock — nessuna scrittura backend)</span>
      </p>

      {/* Step 1: tipo */}
      <section className="rounded-xl border bg-card p-4 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">1 · Tipo di import</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TEMPLATES) as ImportType[]).map(k => (
            <button
              key={k}
              onClick={() => { setType(k); }}
              className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                type === k ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/50"
              }`}
            >
              {TEMPLATES[k].name.replace(".csv", "")}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{tpl.description}</p>
        <div className="text-[11px] text-muted-foreground mt-2 flex flex-wrap gap-1">
          {tpl.fields.map(f => (
            <span key={f} className={`px-1.5 py-0.5 rounded font-mono ${tpl.required.includes(f) ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
              {f}{tpl.required.includes(f) ? "*" : ""}
            </span>
          ))}
        </div>
      </section>

      {/* Step 2: file / paste */}
      <section className="rounded-xl border bg-card p-4 mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">2 · Sorgente dati</h2>
        <label className="block mb-3">
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
          <div className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/20 transition-colors">
            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-sm font-semibold">{fileName ?? "Carica file CSV"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">oppure incolla il contenuto qui sotto</div>
          </div>
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setFileName(prev => prev ?? "incollato"); }}
          placeholder={tpl.example}
          rows={6}
          className="w-full font-mono text-xs bg-background border rounded-lg px-3 py-2"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={loadExample} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <Copy className="w-3 h-3" /> Usa esempio
          </button>
          {text && (
            <button onClick={clearAll} className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 ml-auto">
              <Trash2 className="w-3 h-3" /> Svuota
            </button>
          )}
        </div>
      </section>

      {/* Step 3: preview */}
      {result && (
        <section className="rounded-xl border bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3 · Anteprima e validazione</h2>
            <div className="flex gap-2 text-[11px]">
              <Pill ok>{validRows} valide</Pill>
              {warnCount > 0 && <Pill warn>{warnCount} avvisi</Pill>}
              {errorCount > 0 && <Pill err>{errorCount} errori</Pill>}
            </div>
          </div>

          {result.fileIssues.length > 0 && (
            <div className="mb-3 space-y-1">
              {result.fileIssues.map((i, k) => <IssueLine key={k} issue={i} />)}
            </div>
          )}

          {result.rows.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-3">Nessuna riga dati.</div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-2 w-8">#</th>
                    {result.headers.map(h => (
                      <th key={h} className="py-2 pr-3 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                    <th className="py-2 pl-2">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 50).map(r => {
                    const hasErr = r.issues.some(i => i.severity === "error");
                    const hasWarn = r.issues.some(i => i.severity === "warn");
                    return (
                      <tr key={r.index} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-2 text-muted-foreground tabular-nums">{r.index}</td>
                        {result.headers.map(h => {
                          const issue = r.issues.find(i => i.field === h);
                          return (
                            <td key={h} className={`py-2 pr-3 font-mono ${issue?.severity === "error" ? "text-destructive" : issue?.severity === "warn" ? "text-accent-foreground" : ""}`}>
                              {h === "team_id" || h === "home_id" || h === "away_id"
                                ? <span className="flex items-center gap-1">{r.data[h]} <span className="text-muted-foreground">{getTeam(r.data[h])?.shortName ? `(${getTeam(r.data[h])?.shortName})` : ""}</span></span>
                                : r.data[h] || <span className="text-muted-foreground/60">—</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 pl-2">
                          {hasErr ? <span className="text-destructive flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />KO</span>
                            : hasWarn ? <span className="text-accent-foreground flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />OK*</span>
                            : <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />OK</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.rows.length > 50 && (
                <div className="text-[11px] text-muted-foreground italic py-2">+ altre {result.rows.length - 50} righe non mostrate</div>
              )}
            </div>
          )}

          {/* row-level issues panel */}
          {result.rows.some(r => r.issues.length > 0) && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">Dettaglio messaggi ({result.rows.reduce((n, r) => n + r.issues.length, 0)})</summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-auto">
                {result.rows.flatMap(r => r.issues.map((i, k) => <IssueLine key={`${r.index}-${k}`} issue={i} />))}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Step 4: action */}
      <section className="rounded-xl border bg-card p-4 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">4 · Strategia duplicati e import</h2>
        <div className="flex flex-col gap-2 mb-4">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="radio" name="dup" checked={skipDuplicates} onChange={() => setSkipDuplicates(true)} className="mt-1" />
            <span><span className="font-semibold">Salta i duplicati</span> <span className="text-muted-foreground text-xs block">gli id già presenti non vengono toccati ({dupExisting} record)</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="radio" name="dup" checked={!skipDuplicates} onChange={() => setSkipDuplicates(false)} className="mt-1" />
            <span><span className="font-semibold">Sovrascrivi</span> <span className="text-muted-foreground text-xs block">gli id già presenti vengono aggiornati ({dupExisting} record)</span></span>
          </label>
        </div>
        <button
          disabled={!result || errorCount > 0 || validRows === 0}
          onClick={runImport}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Importa {tpl.name} {result ? `(${skipDuplicates ? validRows - dupExisting : validRows} record)` : ""}
        </button>
      </section>

      {/* Templates */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Template disponibili</h2>
      <div className="space-y-2">
        {(Object.values(TEMPLATES) as Template[]).map(t => (
          <div key={t.name} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground truncate">{t.fields.join(", ")}</div>
            </div>
            <button
              onClick={() => { setType(t.key); setText(t.example); setFileName(`esempio-${t.name}`); }}
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              Carica esempio
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function Pill({ children, ok, warn, err }: { children: React.ReactNode; ok?: boolean; warn?: boolean; err?: boolean }) {
  const cls = err ? "bg-destructive/15 text-destructive"
    : warn ? "bg-accent/20 text-accent-foreground"
    : ok ? "bg-success/15 text-success"
    : "bg-secondary text-muted-foreground";
  return <span className={`px-2 py-0.5 rounded font-bold uppercase ${cls}`}>{children}</span>;
}

function IssueLine({ issue }: { issue: Issue }) {
  const Icon = issue.severity === "error" ? XCircle : AlertTriangle;
  const color = issue.severity === "error" ? "text-destructive" : "text-accent-foreground";
  return (
    <div className={`flex items-start gap-2 text-xs ${color}`}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        {issue.row > 0 && <span className="font-semibold">Riga {issue.row}{issue.field ? ` · ${issue.field}` : ""}: </span>}
        {issue.message}
      </span>
    </div>
  );
}
