// Cave League 2026 — data layer
//
// Il database Supabase originale del torneo è sparito (progetto rimosso,
// verificato via DNS a settembre 2026). Non esiste un backup dei dati
// completi (12 squadre, 158 giocatori, 32 partite con relativi eventi),
// quindi l'app si limita a una sola pagina — la home — con solo i fatti
// che siamo riusciti a recuperare da una sessione precedente: podio
// finale e primi 5 marcatori. Tutto ciò che avrebbe richiesto dati
// parziali (classifica di 5 squadre su 12, rose sparse, calendario
// vuoto) è stato rimosso: meglio niente che una pagina a metà.

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  accent: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
}

// ============= SQUADRE CONOSCIUTE =============
// Colori di Real Madrink, La Pizzicata e Atletico Giglietto sono quelli
// reali usati nel teaser della home di Cave Lab (src/content.js). Per le
// altre tre squadre — comparse solo nella classifica/marcatori recuperati,
// mai nel teaser — non abbiamo un colore verificato: sono assegnazioni
// di comodo, non brand ufficiali.
function colorToAccent(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}${Math.round(g * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}${Math.round(b * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}`;
}

const KNOWN_TEAMS: Omit<Team, "accent">[] = [
  { id: "real-madrink",       name: "Real Madrink",       shortName: "RMD", color: "#CCFF00" },
  { id: "la-pizzicata",       name: "La Pizzicata",       shortName: "LAP", color: "#4169E1" },
  { id: "atletico-giglietto", name: "Atletico Giglietto", shortName: "ATG", color: "#98FF98" },
  { id: "ocho-ar-mocho",      name: "Ocho Ar Mocho",      shortName: "OAM", color: "#DC2626" },
  { id: "fc-banda",           name: "F.C. Banda",         shortName: "FCB", color: "#0284C7" },
  { id: "eden-parrucchieri",  name: "Eden Parrucchieri",  shortName: "EDP", color: "#EAB308" },
];

export const teams: Team[] = KNOWN_TEAMS.map(t => ({ ...t, accent: colorToAccent(t.color) }));

export function getTeam(id: string | null | undefined) {
  return id ? teams.find(t => t.id === id) : undefined;
}

// Returns legible text color (dark or white) for any team background color.
export function teamTextColor(hex: string): string {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#ffffff";
}

// ============= MARCATORI CONOSCIUTI =============
// Ultima "Top 5 marcatori" vista in app prima della perdita del database.
const KNOWN_SCORERS: { id: string; name: string; teamId: string; goals: number }[] = [
  { id: "francesco-di-santo", name: "Francesco di Santo", teamId: "ocho-ar-mocho",      goals: 28 },
  { id: "riccardo-macaluso",  name: "Riccardo Macaluso",  teamId: "atletico-giglietto", goals: 24 },
  { id: "vlad-parfene",       name: "Vlad Parfene",       teamId: "ocho-ar-mocho",      goals: 24 },
  { id: "daniele-mammetti",   name: "Daniele Mammetti",   teamId: "real-madrink",       goals: 17 },
  { id: "francesco-conti",    name: "Francesco Conti",    teamId: "eden-parrucchieri",  goals: 14 },
];

export interface ScorerRow { player: Player; goals: number; }

export function topScorers(limit = 5): ScorerRow[] {
  return KNOWN_SCORERS
    .slice()
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit)
    .map(s => ({ player: { id: s.id, name: s.name, teamId: s.teamId }, goals: s.goals }));
}

// ============= PODIO FINALE =============
export interface PodiumResult {
  champion: Team;
  runnerUp: Team;
  finalScore: string;
  third?: Team;
  fourth?: Team;
  thirdScore?: string;
}

// Risultato finale noto (Super Bowl Night, 14 giugno 2026): Real Madrink
// campione 5–2 su La Pizzicata, Atletico Giglietto terzo 13–9 su Ocho Ar
// Mocho. Fatto verificato, non un calcolo — non torna mai null: il
// torneo è concluso.
export function getFinalPodium(): PodiumResult | null {
  const champion = getTeam("real-madrink");
  const runnerUp = getTeam("la-pizzicata");
  if (!champion || !runnerUp) return null;
  return {
    champion, runnerUp, finalScore: "5–2",
    third: getTeam("atletico-giglietto"), fourth: getTeam("ocho-ar-mocho"),
    thirdScore: "13–9",
  };
}
