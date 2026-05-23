// Mock data for Cave League tournament (5-14 June 2026)
// 12 squadre · regular season parziale (ogni squadra gioca 4 partite)
// passano le prime 8 → quarti → semifinali → finale (+ terzo posto opzionale)

export type PlayerRole = "p" | "g" | "pres";
export type MatchStatus = "scheduled" | "live" | "finished" | "locked";
export type MatchPhase = "regular" | "quarter" | "semi" | "third" | "final";

export interface Player {
  id: string;
  name: string;
  teamId: string;
  role: PlayerRole;
  number: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  accent: string;
}

export interface MatchEvent {
  id: string;
  minute: number;
  team: "home" | "away";
  type: "goal" | "own_goal";
  playerId: string;
  weight: number; // 1 = goal normale / autogoal · 2 = goal doppio
  label?: string;
}

export interface Match {
  id: string;
  matchday: number;
  phase: MatchPhase;
  date: string;
  homeTeamId: string | null; // null when locked (es. quarti non ancora definiti)
  awayTeamId: string | null;
  homeLabel?: string; // placeholder per knockout: "1° regular season"
  awayLabel?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  venue: string;
  highlight?: string;
  shootoutWinner?: "home" | "away"; // se pareggio tempi reg.
  events: MatchEvent[];
}

export interface Standing {
  teamId: string;
  played: number;
  winsReg: number;
  winsShoot: number;
  lossesShoot: number;
  lossesReg: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

// ============= TEAMS (12) =============
export const teams: Team[] = [
  { id: "t1",  name: "Black Wolves",   shortName: "BWV", color: "#0f172a", accent: "#f1f5f9" },
  { id: "t2",  name: "Cave Roma",      shortName: "ROM", color: "#dc2626", accent: "#fef2f2" },
  { id: "t3",  name: "Drago Cave",     shortName: "DRG", color: "#9333ea", accent: "#faf5ff" },
  { id: "t4",  name: "Eagles Cave",    shortName: "EGL", color: "#0284c7", accent: "#f0f9ff" },
  { id: "t5",  name: "Furia Gialla",   shortName: "FRG", color: "#eab308", accent: "#fefce8" },
  { id: "t6",  name: "Gladiatori",     shortName: "GLD", color: "#b45309", accent: "#fffbeb" },
  { id: "t7",  name: "Lupi Argento",   shortName: "LPA", color: "#64748b", accent: "#f8fafc" },
  { id: "t8",  name: "Orsi Neri",      shortName: "ORS", color: "#1e293b", accent: "#f1f5f9" },
  { id: "t9",  name: "Pantere Rosa",   shortName: "PNT", color: "#ec4899", accent: "#fdf2f8" },
  { id: "t10", name: "Sparta Cave",    shortName: "SPC", color: "#0d9488", accent: "#f0fdfa" },
  { id: "t11", name: "Tigri Bianche",  shortName: "TGB", color: "#7c3aed", accent: "#faf5ff" },
  { id: "t12", name: "Verde Cave",     shortName: "VRD", color: "#16a34a", accent: "#f0fdf4" },
];

// ============= PLAYERS =============
const surnames = [
  "Rossi", "Bianchi", "Verdi", "Neri", "Galli", "Conti", "Russo", "Marino",
  "Bruno", "Greco",
];
const firstnames = [
  "Marco", "Luca", "Andrea", "Simone", "Davide", "Matteo", "Federico", "Giuseppe",
  "Alessandro", "Stefano",
];
// 10 giocatori per squadra: 1 portiere, 8 giocatori, 1 presidente
const buildRoster = (team: Team, teamIdx: number): Player[] =>
  Array.from({ length: 10 }, (_, i) => {
    const role: PlayerRole = i === 0 ? "p" : i === 9 ? "pres" : "g";
    return {
      id: `${team.id}-p${i}`,
      name: `${firstnames[i]} ${surnames[(i + teamIdx) % surnames.length]}`,
      teamId: team.id,
      role,
      number: i === 0 ? 1 : i === 9 ? 99 : i + 1,
    };
  });

export const players: Player[] = teams.flatMap((t, i) => buildRoster(t, i));

// ============= MATCHES =============
const startDay = new Date("2026-06-05T00:00:00");
const dayOffset = (d: number, h = 20, min = 0) => {
  const date = new Date(startDay);
  date.setDate(date.getDate() + d);
  date.setHours(h, min, 0, 0);
  return date.toISOString();
};

// helper: scorers deterministici dal roster (solo giocatori "g")
const teamScorers = (teamId: string) =>
  players.filter(p => p.teamId === teamId && p.role === "g");

const genEvents = (homeId: string, awayId: string, hs: number, as: number, seed: number): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  const hScorers = teamScorers(homeId);
  const aScorers = teamScorers(awayId);
  for (let i = 0; i < hs; i++) {
    ev.push({
      id: `seed-${seed}-h${i}`,
      minute: ((seed * 7 + i * 13) % 40) + 1,
      team: "home",
      type: "goal",
      playerId: hScorers[(seed + i) % hScorers.length].id,
      weight: 1,
      label: "Goal",
    });
  }
  for (let i = 0; i < as; i++) {
    ev.push({
      id: `seed-${seed}-a${i}`,
      minute: ((seed * 11 + i * 17) % 40) + 1,
      team: "away",
      type: "goal",
      playerId: aScorers[(seed + i + 2) % aScorers.length].id,
      weight: 1,
      label: "Goal",
    });
  }
  return ev.sort((a, b) => a.minute - b.minute);
};

interface RegSpec {
  matchday: number;
  day: number; // offset from 5 giugno
  hour: number;
  homeId: string;
  awayId: string;
  hs: number | null;
  as: number | null;
  status: MatchStatus;
  shoot?: "home" | "away";
  highlight?: string;
}

// 12 squadre, 4 giornate, 6 partite per giornata (24 totali)
// circle method: ogni squadra gioca 4 avversarie distinte
const regSpecs: RegSpec[] = [
  // ===== Giornata 1 (5-6 giugno) — TUTTE CONCLUSE =====
  { matchday: 1, day: 0, hour: 19, homeId: "t1",  awayId: "t2",  hs: 2, as: 3, status: "finished" },
  { matchday: 1, day: 0, hour: 21, homeId: "t12", awayId: "t3",  hs: 1, as: 1, status: "finished", shoot: "home" },
  { matchday: 1, day: 1, hour: 18, homeId: "t11", awayId: "t4",  hs: 0, as: 2, status: "finished" },
  { matchday: 1, day: 1, hour: 20, homeId: "t10", awayId: "t5",  hs: 3, as: 1, status: "finished" },
  { matchday: 1, day: 1, hour: 22, homeId: "t9",  awayId: "t6",  hs: 2, as: 2, status: "finished", shoot: "away" },
  { matchday: 1, day: 2, hour: 19, homeId: "t8",  awayId: "t7",  hs: 1, as: 4, status: "finished" },
  // ===== Giornata 2 (7-8 giugno) — CONCLUSE =====
  { matchday: 2, day: 2, hour: 21, homeId: "t1",  awayId: "t3",  hs: 3, as: 0, status: "finished" },
  { matchday: 2, day: 3, hour: 18, homeId: "t2",  awayId: "t4",  hs: 4, as: 2, status: "finished", highlight: "Big match" },
  { matchday: 2, day: 3, hour: 20, homeId: "t12", awayId: "t5",  hs: 2, as: 2, status: "finished", shoot: "home" },
  { matchday: 2, day: 3, hour: 22, homeId: "t11", awayId: "t6",  hs: 1, as: 0, status: "finished" },
  { matchday: 2, day: 4, hour: 19, homeId: "t10", awayId: "t7",  hs: 2, as: 1, status: "finished" },
  { matchday: 2, day: 4, hour: 21, homeId: "t9",  awayId: "t8",  hs: 0, as: 3, status: "finished" },
  // ===== Giornata 3 (9-10 giugno) — oggi è il 9 =====
  { matchday: 3, day: 4, hour: 18, homeId: "t1",  awayId: "t4",  hs: 2, as: 1, status: "finished" },
  { matchday: 3, day: 4, hour: 20, homeId: "t3",  awayId: "t5",  hs: 1, as: 3, status: "finished" },
  { matchday: 3, day: 4, hour: 22, homeId: "t2",  awayId: "t6",  hs: 2, as: 1, status: "live", highlight: "Derby" },
  { matchday: 3, day: 5, hour: 19, homeId: "t12", awayId: "t7",  hs: null, as: null, status: "scheduled" },
  { matchday: 3, day: 5, hour: 21, homeId: "t11", awayId: "t8",  hs: null, as: null, status: "scheduled" },
  { matchday: 3, day: 6, hour: 20, homeId: "t10", awayId: "t9",  hs: null, as: null, status: "scheduled" },
  // ===== Giornata 4 (11-12 giugno) =====
  { matchday: 4, day: 6, hour: 22, homeId: "t1",  awayId: "t5",  hs: null, as: null, status: "scheduled" },
  { matchday: 4, day: 7, hour: 19, homeId: "t4",  awayId: "t6",  hs: null, as: null, status: "scheduled" },
  { matchday: 4, day: 7, hour: 21, homeId: "t3",  awayId: "t7",  hs: null, as: null, status: "scheduled" },
  { matchday: 4, day: 7, hour: 22, homeId: "t2",  awayId: "t8",  hs: null, as: null, status: "scheduled" },
  { matchday: 4, day: 8, hour: 19, homeId: "t12", awayId: "t9",  hs: null, as: null, status: "scheduled" },
  { matchday: 4, day: 8, hour: 21, homeId: "t11", awayId: "t10", hs: null, as: null, status: "scheduled" },
];

const regularMatches: Match[] = regSpecs.map((s, i) => ({
  id: `rs-${i + 1}`,
  matchday: s.matchday,
  phase: "regular",
  date: dayOffset(s.day, s.hour),
  homeTeamId: s.homeId,
  awayTeamId: s.awayId,
  homeScore: s.hs,
  awayScore: s.as,
  status: s.status,
  venue: "Campo Centrale Cave",
  highlight: s.highlight,
  shootoutWinner: s.shoot,
  events: s.status === "finished" && s.hs !== null && s.as !== null
    ? genEvents(s.homeId, s.awayId, s.hs, s.as, i + 1)
    : [],
}));

// ===== Knockout (tutti "locked": accoppiamenti non definiti finché regular non finisce) =====
const knockout: Match[] = [
  // Quarti — 13 giugno
  ...[1, 2, 3, 4].map<Match>((n, i) => ({
    id: `qf-${n}`,
    matchday: 5,
    phase: "quarter",
    date: dayOffset(8, 18 + i * 1),
    homeTeamId: null, awayTeamId: null,
    homeLabel: `${n}° regular season`,
    awayLabel: `${9 - n}° regular season`,
    homeScore: null, awayScore: null,
    status: "locked",
    venue: "Campo Centrale Cave",
    highlight: "Quarti di finale",
    events: [],
  })),
  // Semifinali — 14 giugno pomeriggio
  ...[1, 2].map<Match>((n) => ({
    id: `sf-${n}`,
    matchday: 6,
    phase: "semi",
    date: dayOffset(9, 17 + (n - 1) * 2),
    homeTeamId: null, awayTeamId: null,
    homeLabel: `Vincente QF${n * 2 - 1}`,
    awayLabel: `Vincente QF${n * 2}`,
    homeScore: null, awayScore: null,
    status: "locked",
    venue: "Campo Centrale Cave",
    highlight: "Semifinale",
    events: [],
  })),
  // Finale 3° posto — 14 giugno sera
  {
    id: "tp-1",
    matchday: 7,
    phase: "third",
    date: dayOffset(9, 20),
    homeTeamId: null, awayTeamId: null,
    homeLabel: "Perdente SF1",
    awayLabel: "Perdente SF2",
    homeScore: null, awayScore: null,
    status: "locked",
    venue: "Campo Centrale Cave",
    highlight: "Finale 3°/4° posto",
    events: [],
  },
  // Finale — 14 giugno
  {
    id: "ff-1",
    matchday: 7,
    phase: "final",
    date: dayOffset(9, 22),
    homeTeamId: null, awayTeamId: null,
    homeLabel: "Vincente SF1",
    awayLabel: "Vincente SF2",
    homeScore: null, awayScore: null,
    status: "locked",
    venue: "Campo Centrale Cave",
    highlight: "FINALE",
    events: [],
  },
];

export const matches: Match[] = [...regularMatches, ...knockout];

export const TOURNAMENT_TODAY = new Date("2026-06-09T21:30:00");
export const TOURNAMENT_START = new Date("2026-06-05T00:00:00");
export const TOURNAMENT_END = new Date("2026-06-14T23:59:59");

// ============= DERIVED: STANDINGS =============
export function computeStandings(): Standing[] {
  const map = new Map<string, Standing>();
  teams.forEach(t => map.set(t.id, {
    teamId: t.id, played: 0, winsReg: 0, winsShoot: 0, lossesShoot: 0,
    lossesReg: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  matches
    .filter(m => m.phase === "regular" && m.status === "finished" && m.homeTeamId && m.awayTeamId)
    .forEach(m => {
      const h = map.get(m.homeTeamId!)!;
      const a = map.get(m.awayTeamId!)!;
      const hs = m.homeScore!, as = m.awayScore!;
      h.played++; a.played++;
      h.goalsFor += hs; h.goalsAgainst += as;
      a.goalsFor += as; a.goalsAgainst += hs;
      if (hs > as) { h.winsReg++; h.points += 3; a.lossesReg++; }
      else if (hs < as) { a.winsReg++; a.points += 3; h.lossesReg++; }
      else {
        const w = m.shootoutWinner ?? "home";
        if (w === "home") { h.winsShoot++; h.points += 2; a.lossesShoot++; a.points += 1; }
        else              { a.winsShoot++; a.points += 2; h.lossesShoot++; h.points += 1; }
      }
    });
  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const dA = a.goalsFor - a.goalsAgainst;
    const dB = b.goalsFor - b.goalsAgainst;
    if (dB !== dA) return dB - dA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return getTeam(a.teamId)!.name.localeCompare(getTeam(b.teamId)!.name);
  });
}

// ============= DERIVED: PLAYER STATS =============
export interface PlayerStats {
  appearances: number;
  goals: number;
  ownGoals: number;
  cleanSheets: number;
}

export function getPlayerStats(playerId: string): PlayerStats {
  const player = players.find(p => p.id === playerId);
  if (!player) return { appearances: 0, goals: 0, ownGoals: 0, cleanSheets: 0 };

  const teamMatches = matches.filter(
    m => (m.homeTeamId === player.teamId || m.awayTeamId === player.teamId) &&
         (m.status === "finished" || m.status === "live")
  );
  // presenze = numero partite della squadra (regular + eventuali knockout giocati)
  const appearances = teamMatches.length;

  let goals = 0, ownGoals = 0, cleanSheets = 0;
  for (const m of matches) {
    if (m.status !== "finished") continue;
    for (const ev of m.events) {
      if (ev.playerId === playerId) {
        if (ev.type === "goal") goals++;
        else if (ev.type === "own_goal") ownGoals++;
      }
    }
    // clean sheet: assegnata a tutti i portieri della squadra se l'avversario non ha segnato
    if (player.role === "p") {
      const isHome = m.homeTeamId === player.teamId;
      const isAway = m.awayTeamId === player.teamId;
      if (isHome && m.awayScore === 0) cleanSheets++;
      if (isAway && m.homeScore === 0) cleanSheets++;
    }
  }
  return { appearances, goals, ownGoals, cleanSheets };
}

// ============= LOOKUPS =============
export function getTeam(id: string | null | undefined) {
  return id ? teams.find(t => t.id === id) : undefined;
}
export function getPlayer(id: string) { return players.find(p => p.id === id); }
export function getTeamPlayers(teamId: string) { return players.filter(p => p.teamId === teamId); }
export function getTeamMatches(teamId: string) {
  return matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
}

// ============= DERIVED: TEAM AGGREGATES =============
export interface TeamAggregate {
  goalsFor: number;
  goalsAgainst: number;
  played: number;
  wins: number;
  draws: number; // pareggi nei tempi reg. (decisi ai rigori)
  losses: number;
  cleanSheets: number;
  topScorer?: { playerId: string; goals: number };
}

export function getTeamAggregate(teamId: string): TeamAggregate {
  const finished = matches.filter(
    m => m.status === "finished" &&
         (m.homeTeamId === teamId || m.awayTeamId === teamId)
  );
  let goalsFor = 0, goalsAgainst = 0, wins = 0, draws = 0, losses = 0, cleanSheets = 0;
  for (const m of finished) {
    const isHome = m.homeTeamId === teamId;
    const my = isHome ? m.homeScore! : m.awayScore!;
    const opp = isHome ? m.awayScore! : m.homeScore!;
    goalsFor += my; goalsAgainst += opp;
    if (my > opp) wins++;
    else if (my < opp) losses++;
    else draws++;
    if (opp === 0) cleanSheets++;
  }
  // top scorer
  let topScorer: { playerId: string; goals: number } | undefined;
  for (const p of getTeamPlayers(teamId)) {
    const s = getPlayerStats(p.id);
    if (s.goals > 0 && (!topScorer || s.goals > topScorer.goals)) {
      topScorer = { playerId: p.id, goals: s.goals };
    }
  }
  return { goalsFor, goalsAgainst, played: finished.length, wins, draws, losses, cleanSheets, topScorer };
}

// ============= DERIVED: LEADERBOARDS =============
export interface ScorerRow { player: Player; goals: number; }
export interface CleanSheetRow { player: Player; cleanSheets: number; }

export function topScorers(limit = 10): ScorerRow[] {
  return players
    .map(p => ({ player: p, goals: getPlayerStats(p.id).goals }))
    .filter(r => r.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.player.name.localeCompare(b.player.name))
    .slice(0, limit);
}

export function topCleanSheets(limit = 10): CleanSheetRow[] {
  return players
    .filter(p => p.role === "p")
    .map(p => ({ player: p, cleanSheets: getPlayerStats(p.id).cleanSheets }))
    .sort((a, b) => b.cleanSheets - a.cleanSheets || a.player.name.localeCompare(b.player.name))
    .slice(0, limit);
}

export function matchesOnDay(date: Date) {
  return matches.filter(m => {
    const d = new Date(m.date);
    return d.toDateString() === date.toDateString();
  });
}

// ============= PHASE LABELS =============
export const phaseLabel: Record<MatchPhase, string> = {
  regular: "Regular season",
  quarter: "Quarti di finale",
  semi: "Semifinale",
  third: "Finale 3° posto",
  final: "Finale",
};
export const phaseShort: Record<MatchPhase, string> = {
  regular: "RS",
  quarter: "QF",
  semi: "SF",
  third: "3°",
  final: "F",
};
