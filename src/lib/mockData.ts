// Mock data for Cave League tournament (5-14 June 2026)

export type PlayerRole = "p" | "g" | "pres";

export interface Player {
  id: string;
  name: string;
  teamId: string;
  role: PlayerRole;
  number: number;
  appearances: number;
  goals: number;
  ownGoals: number;
  cleanSheets: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  accent: string;
  presidentId?: string;
}

export interface Match {
  id: string;
  matchday: number;
  date: string; // ISO
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  venue: string;
  highlight?: string;
}

export interface Standing {
  teamId: string;
  played: number;
  winsReg: number; // VD - vittoria nei tempi regolamentari
  winsShoot: number; // VS - vittoria ai rigori
  lossesShoot: number; // SS - sconfitta ai rigori
  lossesReg: number; // SD - sconfitta nei tempi
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export const teams: Team[] = [
  { id: "t1", name: "Cave Roma", shortName: "ROM", color: "#dc2626", accent: "#fef2f2" },
  { id: "t2", name: "Black Wolves", shortName: "BWV", color: "#0f172a", accent: "#f1f5f9" },
  { id: "t3", name: "Eagles Cave", shortName: "EGL", color: "#0284c7", accent: "#f0f9ff" },
  { id: "t4", name: "Furia Gialla", shortName: "FRG", color: "#eab308", accent: "#fefce8" },
  { id: "t5", name: "Verde Cave", shortName: "VRD", color: "#16a34a", accent: "#f0fdf4" },
  { id: "t6", name: "Tigri Bianche", shortName: "TGB", color: "#7c3aed", accent: "#faf5ff" },
];

const roster = (teamId: string, idx: number): Player[] => {
  const names = [
    "Marco Rossi", "Luca Bianchi", "Andrea Verdi", "Simone Neri",
    "Davide Galli", "Matteo Conti", "Federico Russo", "Giuseppe Marino",
    "Alessandro Bruno", "Stefano Greco", "Roberto Lombardi", "Antonio Ricci",
  ];
  return names.map((n, i) => ({
    id: `${teamId}-p${i}`,
    name: `${n} ${idx}`,
    teamId,
    role: (i === 0 ? "p" : i === 11 ? "pres" : "g") as PlayerRole,
    number: i + 1,
    appearances: Math.floor(Math.random() * 6) + 2,
    goals: i === 0 ? 0 : Math.floor(Math.random() * 7),
    ownGoals: Math.random() > 0.85 ? 1 : 0,
    cleanSheets: i === 0 ? Math.floor(Math.random() * 4) : 0,
  }));
};

export const players: Player[] = teams.flatMap((t, i) => roster(t.id, i + 1));

const today = new Date("2026-06-09T20:00:00");
const dayOffset = (d: number, h = 20) => {
  const date = new Date("2026-06-05T00:00:00");
  date.setDate(date.getDate() + d);
  date.setHours(h, 0, 0, 0);
  return date.toISOString();
};

export const matches: Match[] = [
  // Giornata 1 - 5 giugno
  { id: "m1", matchday: 1, date: dayOffset(0, 19), homeTeamId: "t1", awayTeamId: "t2", homeScore: 3, awayScore: 2, status: "finished", venue: "Campo Centrale" },
  { id: "m2", matchday: 1, date: dayOffset(0, 21), homeTeamId: "t3", awayTeamId: "t4", homeScore: 1, awayScore: 1, status: "finished", venue: "Campo Centrale" },
  { id: "m3", matchday: 1, date: dayOffset(1, 19), homeTeamId: "t5", awayTeamId: "t6", homeScore: 4, awayScore: 0, status: "finished", venue: "Campo Centrale" },
  // Giornata 2
  { id: "m4", matchday: 2, date: dayOffset(2, 19), homeTeamId: "t2", awayTeamId: "t3", homeScore: 2, awayScore: 2, status: "finished", venue: "Campo Centrale" },
  { id: "m5", matchday: 2, date: dayOffset(2, 21), homeTeamId: "t4", awayTeamId: "t5", homeScore: 1, awayScore: 3, status: "finished", venue: "Campo Centrale" },
  { id: "m6", matchday: 2, date: dayOffset(3, 20), homeTeamId: "t6", awayTeamId: "t1", homeScore: 0, awayScore: 2, status: "finished", venue: "Campo Centrale" },
  // Giornata 3 - oggi (9 giugno)
  { id: "m7", matchday: 3, date: dayOffset(4, 19), homeTeamId: "t1", awayTeamId: "t3", homeScore: 2, awayScore: 1, status: "finished", venue: "Campo Centrale", highlight: "Big match" },
  { id: "m8", matchday: 3, date: dayOffset(4, 21), homeTeamId: "t2", awayTeamId: "t5", homeScore: null, awayScore: null, status: "live", venue: "Campo Centrale" },
  { id: "m9", matchday: 3, date: dayOffset(5, 20), homeTeamId: "t4", awayTeamId: "t6", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale" },
  // Giornata 4
  { id: "m10", matchday: 4, date: dayOffset(6, 19), homeTeamId: "t3", awayTeamId: "t5", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale" },
  { id: "m11", matchday: 4, date: dayOffset(6, 21), homeTeamId: "t1", awayTeamId: "t4", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale" },
  { id: "m12", matchday: 4, date: dayOffset(7, 20), homeTeamId: "t2", awayTeamId: "t6", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale" },
  // Finals
  { id: "m13", matchday: 5, date: dayOffset(8, 20), homeTeamId: "t1", awayTeamId: "t5", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale", highlight: "Semifinale" },
  { id: "m14", matchday: 5, date: dayOffset(8, 22), homeTeamId: "t3", awayTeamId: "t2", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale", highlight: "Semifinale" },
  { id: "m15", matchday: 6, date: dayOffset(9, 21), homeTeamId: "t1", awayTeamId: "t3", homeScore: null, awayScore: null, status: "scheduled", venue: "Campo Centrale", highlight: "FINALE" },
];

export const TOURNAMENT_TODAY = today;

export function computeStandings(): Standing[] {
  const map = new Map<string, Standing>();
  teams.forEach(t => map.set(t.id, {
    teamId: t.id, played: 0, winsReg: 0, winsShoot: 0, lossesShoot: 0,
    lossesReg: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  matches.filter(m => m.status === "finished").forEach(m => {
    const h = map.get(m.homeTeamId)!;
    const a = map.get(m.awayTeamId)!;
    h.played++; a.played++;
    h.goalsFor += m.homeScore!; h.goalsAgainst += m.awayScore!;
    a.goalsFor += m.awayScore!; a.goalsAgainst += m.homeScore!;
    if (m.homeScore! > m.awayScore!) { h.winsReg++; h.points += 3; a.lossesReg++; }
    else if (m.homeScore! < m.awayScore!) { a.winsReg++; a.points += 3; h.lossesReg++; }
    else {
      // simulate shootout — alternate
      const homeWins = (m.id.charCodeAt(1) % 2) === 0;
      if (homeWins) { h.winsShoot++; h.points += 2; a.lossesShoot++; a.points += 1; }
      else { a.winsShoot++; a.points += 2; h.lossesShoot++; h.points += 1; }
    }
  });
  return [...map.values()].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );
}

export function getTeam(id: string) { return teams.find(t => t.id === id); }
export function getPlayer(id: string) { return players.find(p => p.id === id); }
export function getTeamPlayers(teamId: string) { return players.filter(p => p.teamId === teamId); }
export function getTeamMatches(teamId: string) {
  return matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
}
export function topScorers(limit = 10) {
  return [...players].sort((a, b) => b.goals - a.goals).slice(0, limit);
}
export function topCleanSheets(limit = 10) {
  return [...players].filter(p => p.role === "p").sort((a, b) => b.cleanSheets - a.cleanSheets).slice(0, limit);
}
export function matchesOnDay(date: Date) {
  return matches.filter(m => {
    const d = new Date(m.date);
    return d.toDateString() === date.toDateString();
  });
}
