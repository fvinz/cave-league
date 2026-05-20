import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeamBadge } from "@/components/TeamBadge";
import { computeStandings, getTeam } from "@/lib/mockData";

export const Route = createFileRoute("/classifica")({
  component: ClassificaPage,
  head: () => ({ meta: [{ title: "Classifica — Cave League" }] }),
});

function ClassificaPage() {
  const standings = computeStandings();

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-1">Classifica</h1>
      <p className="text-sm text-muted-foreground mb-4">3 punti vittoria · 2 vittoria ai rigori · 1 sconfitta ai rigori</p>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold">#</th>
              <th className="text-left px-2 py-2.5 font-semibold">Squadra</th>
              <th className="text-right px-2 py-2.5 font-semibold">PT</th>
              <th className="text-right px-2 py-2.5 font-semibold">PG</th>
              <th className="text-right px-2 py-2.5 font-semibold hidden sm:table-cell">VD</th>
              <th className="text-right px-2 py-2.5 font-semibold hidden sm:table-cell">VS</th>
              <th className="text-right px-2 py-2.5 font-semibold hidden sm:table-cell">SS</th>
              <th className="text-right px-2 py-2.5 font-semibold hidden sm:table-cell">SD</th>
              <th className="text-right px-2 py-2.5 font-semibold">GF</th>
              <th className="text-right px-2 py-2.5 font-semibold">GS</th>
              <th className="text-right px-2 py-2.5 font-semibold pr-3">DR</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const t = getTeam(s.teamId)!;
              const dr = s.goalsFor - s.goalsAgainst;
              return (
                <tr key={s.teamId} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                      i < 4 ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}>{i + 1}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <Link to="/squadre/$teamId" params={{ teamId: t.id }} className="flex items-center gap-2 min-w-0 hover:text-primary">
                      <TeamBadge teamId={t.id} size={26} />
                      <span className="font-semibold truncate">{t.name}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold tabular-nums text-primary">{s.points}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.played}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums hidden sm:table-cell">{s.winsReg}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums hidden sm:table-cell">{s.winsShoot}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums hidden sm:table-cell">{s.lossesShoot}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums hidden sm:table-cell">{s.lossesReg}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.goalsFor}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.goalsAgainst}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums pr-3 font-semibold">{dr > 0 ? `+${dr}` : dr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
        <Legend code="PG" label="Partite giocate" />
        <Legend code="VD" label="Vittorie tempi reg." />
        <Legend code="VS" label="Vittorie rigori" />
        <Legend code="SS" label="Sconfitte rigori" />
        <Legend code="SD" label="Sconfitte tempi reg." />
        <Legend code="GF" label="Gol fatti" />
        <Legend code="GS" label="Gol subiti" />
        <Legend code="DR" label="Differenza reti" />
      </div>
    </AppShell>
  );
}

function Legend({ code, label }: { code: string; label: string }) {
  return <div><span className="font-bold text-foreground">{code}</span> {label}</div>;
}
