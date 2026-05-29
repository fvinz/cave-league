// Cave League — data layer (Supabase-backed)
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============= TYPES =============
export type PlayerRole   = "p" | "g" | "pres";
export type MatchStatus  = "scheduled" | "live" | "finished" | "locked";
export type MatchPhase   = "regular" | "quarter" | "semi" | "third" | "final";
export type MatchPeriod  = "first_half" | "second_half" | "shootout";
export type CurrentPhase = "first_half" | "half_time" | "second_half" | "shootout";
export type EventType    =
  | "goal" | "double_goal" | "own_goal"
  | "yellow_card" | "red_card"
  | "shootout_goal" | "shootout_miss";

export interface Player {
  id: string;
  name: string;
  teamId: string;
  role: PlayerRole;
  number: number;
}

export interface Team {
  id: string;
  slug: string | null;
  name: string;
  shortName: string;
  color: string;
  accent: string;
  isInChampionship: boolean;
}

export interface MatchEvent {
  id: string;
  minute: number;
  team: "home" | "away";
  type: EventType;
  playerId: string;
  weight: number;
  label?: string;
  period: MatchPeriod | null;
}

export interface Match {
  id: string;
  matchday: number;
  phase: MatchPhase;
  date: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel?: string;
  awayLabel?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  currentPhase: CurrentPhase | null;
  firstHalfStartedAt: string | null;
  firstHalfEndedAt: string | null;
  secondHalfStartedAt: string | null;
  secondHalfEndedAt: string | null;
  venue: string;
  highlight?: string;
  resultType: "direct" | "shootout" | null;
  shootoutWinner?: "home" | "away";
  events: MatchEvent[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;       // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  imageUrl?: string;  // external URL, optional
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

// ============= TOURNAMENT DATES =============
export const TOURNAMENT_TODAY = new Date("2026-06-09T21:30:00");
export const TOURNAMENT_START = new Date("2026-06-05T00:00:00");
export const TOURNAMENT_END   = new Date("2026-06-14T23:59:59");

// ============= MUTABLE STATE (populated from Supabase) =============
export let teams: Team[] = [];
export let players: Player[] = [];
export let matches: Match[] = [];
export let calendarEvents: CalendarEvent[] = [];

// ============= REACTIVE STORE =============
let version = 0;
const subscribers = new Set<() => void>();
function notify() { version++; subscribers.forEach(fn => fn()); }
function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
function getSnapshot() { return version; }
export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============= HELPERS =============
const TEAM_PALETTE = [
  { color: "#0f172a", accent: "#f1f5f9" }, { color: "#dc2626", accent: "#fef2f2" },
  { color: "#9333ea", accent: "#faf5ff" }, { color: "#0284c7", accent: "#f0f9ff" },
  { color: "#eab308", accent: "#fefce8" }, { color: "#b45309", accent: "#fffbeb" },
  { color: "#64748b", accent: "#f8fafc" }, { color: "#1e293b", accent: "#f1f5f9" },
  { color: "#ec4899", accent: "#fdf2f8" }, { color: "#0d9488", accent: "#f0fdfa" },
  { color: "#7c3aed", accent: "#faf5ff" }, { color: "#16a34a", accent: "#f0fdf4" },
];
function teamColor(idx: number) { return TEAM_PALETTE[idx % TEAM_PALETTE.length]; }
function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] ?? "")).toUpperCase().slice(0, 3);
  return name.slice(0, 3).toUpperCase();
}
function colorToAccent(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}${Math.round(g * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}${Math.round(b * 0.1 + 255 * 0.9).toString(16).padStart(2, "0")}`;
}

// Returns legible text color (dark or white) for any team background color.
// Uses NTSC perceived-luminance formula; threshold 160 gives safe contrast
// even on mid-range colors like yellow or amber.
export function teamTextColor(hex: string): string {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#ffffff";
}

const STAGE_TO_PHASE: Record<string, MatchPhase> = {
  regular: "regular", quarterfinal: "quarter", semifinal: "semi",
  third_place: "third", final: "final",
};
const PHASE_TO_STAGE: Record<MatchPhase, string> = {
  regular: "regular", quarter: "quarterfinal", semi: "semifinal",
  third: "third_place", final: "final",
};

let stageIdByCode: Record<string, string> = {};
let stageCodeById: Record<string, string> = {};
export function getStageIdByPhase(phase: MatchPhase): string | undefined {
  return stageIdByCode[PHASE_TO_STAGE[phase]];
}

function eventLabel(type: EventType): string {
  switch (type) {
    case "goal":          return "Goal";
    case "double_goal":   return "Goal ×2";
    case "own_goal":      return "Autogoal";
    case "yellow_card":   return "Giallo";
    case "red_card":      return "Rosso";
    case "shootout_goal": return "Rigore segnato";
    case "shootout_miss": return "Rigore sbagliato";
  }
}

// ============= LOAD =============
let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadAll(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [stagesRes, teamsRes, playersRes, matchdaysRes, matchesRes, eventsRes, calEventsRes] =
      await Promise.all([
        supabase.from("stages").select("*").order("sort_order"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("players").select("*"),
        supabase.from("matchdays").select("*").order("sort_order"),
        supabase.from("matches").select("*").order("scheduled_at"),
        supabase.from("match_events").select("*").order("event_order"),
        supabase.from("calendar_events").select("*").order("event_date"),
      ]);

    if (stagesRes.data) {
      stageIdByCode = {}; stageCodeById = {};
      for (const s of stagesRes.data) {
        stageIdByCode[s.code] = s.id;
        stageCodeById[s.id] = s.code;
      }
    }

    teams = (teamsRes.data ?? []).map((t, i) => {
      const pal = teamColor(i);
      const color = t.color ?? pal.color;
      return {
        id: t.id, slug: t.slug ?? null, name: t.name,
        shortName: t.short_name ?? deriveShortName(t.name),
        color, accent: t.color ? colorToAccent(t.color) : pal.accent,
        isInChampionship: t.is_in_championship ?? true,
      };
    });

    players = (playersRes.data ?? []).map(p => ({
      id: p.id, name: p.full_name, teamId: p.team_id,
      role: p.role as PlayerRole, number: p.jersey_number ?? 0,
    }));

    const mdById: Record<string, { sort_order: number; title: string; event_date: string }> = {};
    for (const md of matchdaysRes.data ?? []) mdById[md.id] = md;

    const eventsByMatch: Record<string, MatchEvent[]> = {};
    for (const e of eventsRes.data ?? []) {
      const list = eventsByMatch[e.match_id] ??= [];
      const m = (matchesRes.data ?? []).find(x => x.id === e.match_id);
      const side: "home" | "away" = m && e.team_id === m.away_team_id ? "away" : "home";
      const type = e.event_type as EventType;
      list.push({
        id: e.id, minute: e.minute ?? 0, team: side, type,
        playerId: e.player_id, weight: type === "double_goal" ? 2 : 1,
        label: eventLabel(type),
        period: (e.period as MatchPeriod) ?? null,
      });
    }

    matches = (matchesRes.data ?? []).map(m => {
      const phase = STAGE_TO_PHASE[stageCodeById[m.stage_id] ?? "regular"] ?? "regular";
      const md = m.matchday_id ? mdById[m.matchday_id] : undefined;
      const isScheduled = m.status === "scheduled" && (m.home_score ?? 0) === 0 && (m.away_score ?? 0) === 0;
      return {
        id: m.id,
        matchday: md?.sort_order ?? 0,
        phase,
        date: m.scheduled_at,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        homeLabel: m.home_placeholder ?? undefined,
        awayLabel: m.away_placeholder ?? undefined,
        homeScore: isScheduled ? null : m.home_score,
        awayScore: isScheduled ? null : m.away_score,
        status: m.status as MatchStatus,
        currentPhase: (m.current_phase as CurrentPhase) ?? null,
        firstHalfStartedAt: m.first_half_started_at ?? null,
        firstHalfEndedAt: m.first_half_ended_at ?? null,
        secondHalfStartedAt: m.second_half_started_at ?? null,
        secondHalfEndedAt: m.second_half_ended_at ?? null,
        venue: m.venue ?? "",
        highlight: m.notes ?? undefined,
        resultType: (m.result_type as "direct" | "shootout") ?? null,
        shootoutWinner:
          m.result_type === "shootout" && m.winner_team_id
            ? m.winner_team_id === m.home_team_id ? "home" : "away"
            : undefined,
        events: eventsByMatch[m.id] ?? [],
      };
    });

    calendarEvents = (calEventsRes.data ?? []).map(e => ({
      id: e.id, title: e.title,
      description: e.description ?? undefined,
      date: e.event_date,
      startTime: e.start_time ?? undefined,
      imageUrl: e.image_url ?? undefined,
    }));

    loaded = true;
    notify();
  })();
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function isLoaded() { return loaded; }
export async function reloadAll() { loaded = false; await loadAll(); }

// ============= REALTIME =============
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
export function startRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("cave-league-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" },       () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "match_events" },  () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "teams" },         () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "players" },       () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "matchdays" },     () => reloadAll())
    .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => reloadAll())
    .subscribe();
}
export function stopRealtime() {
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
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
export function getMatch(id: string): Match | undefined { return matches.find(m => m.id === id); }

// ============= DERIVED: STANDINGS =============
export function computeStandings(): Standing[] {
  const map = new Map<string, Standing>();
  // Only championship teams appear in standings; matches involving non-championship
  // teams are automatically skipped by the `!h || !a` guard below.
  teams.filter(t => t.isInChampionship).forEach(t => map.set(t.id, {
    teamId: t.id, played: 0, winsReg: 0, winsShoot: 0,
    lossesShoot: 0, lossesReg: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
  matches
    .filter(m =>
      m.phase === "regular" && (m.status === "finished" || m.status === "locked") &&
      m.homeTeamId && m.awayTeamId
    )
    .forEach(m => {
      const h = map.get(m.homeTeamId!); const a = map.get(m.awayTeamId!);
      if (!h || !a) return;
      const hs = m.homeScore ?? 0; const as_ = m.awayScore ?? 0;
      h.played++; a.played++;
      h.goalsFor += hs; h.goalsAgainst += as_;
      a.goalsFor += as_; a.goalsAgainst += hs;
      // Use result_type to determine outcome, not raw score (shootout_goals shift the score)
      if (m.resultType === "shootout") {
        const homeWon = m.shootoutWinner === "home";
        if (homeWon) { h.winsShoot++; h.points += 2; a.lossesShoot++; a.points += 1; }
        else         { a.winsShoot++; a.points += 2; h.lossesShoot++; h.points += 1; }
      } else {
        if (hs > as_)      { h.winsReg++; h.points += 3; a.lossesReg++; }
        else if (as_ > hs) { a.winsReg++; a.points += 3; h.lossesReg++; }
      }
    });
  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const dA = a.goalsFor - a.goalsAgainst; const dB = b.goalsFor - b.goalsAgainst;
    if (dB !== dA) return dB - dA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return (getTeam(a.teamId)?.name ?? "").localeCompare(getTeam(b.teamId)?.name ?? "");
  });
}

// Returns true when both teams in a match are in the championship.
// Used to exclude event/exhibition matches from standings and player stats.
function isChampionshipMatch(m: Match): boolean {
  const home = getTeam(m.homeTeamId);
  const away = getTeam(m.awayTeamId);
  return (home?.isInChampionship ?? false) && (away?.isInChampionship ?? false);
}

// ============= DERIVED: PLAYER STATS =============
export interface PlayerStats {
  appearances: number;
  goals: number;
  ownGoals: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
}

export function getPlayerStats(playerId: string): PlayerStats {
  const player = players.find(p => p.id === playerId);
  if (!player) return { appearances: 0, goals: 0, ownGoals: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 };

  const teamMatches = matches.filter(
    m => (m.homeTeamId === player.teamId || m.awayTeamId === player.teamId) &&
         (m.status === "finished" || m.status === "live" || m.status === "locked") &&
         isChampionshipMatch(m)
  );

  let goals = 0, ownGoals = 0, cleanSheets = 0, yellowCards = 0, redCards = 0;
  for (const m of matches) {
    if (m.status !== "finished" && m.status !== "locked") continue;
    if (!isChampionshipMatch(m)) continue;
    for (const ev of m.events) {
      if (ev.playerId !== playerId) continue;
      if (ev.type === "goal" || ev.type === "double_goal" || ev.type === "shootout_goal") goals++;
      else if (ev.type === "own_goal")    ownGoals++;
      else if (ev.type === "yellow_card") yellowCards++;
      else if (ev.type === "red_card")    redCards++;
    }
    if (player.role === "p") {
      const isHome = m.homeTeamId === player.teamId;
      const isAway = m.awayTeamId === player.teamId;
      if (isHome && (m.awayScore ?? 1) === 0) cleanSheets++;
      if (isAway && (m.homeScore ?? 1) === 0) cleanSheets++;
    }
  }
  return { appearances: teamMatches.length, goals, ownGoals, cleanSheets, yellowCards, redCards };
}

// ============= DERIVED: TEAM AGGREGATES =============
export interface TeamAggregate {
  goalsFor: number; goalsAgainst: number; played: number;
  wins: number; draws: number; losses: number; cleanSheets: number;
  topScorer?: { playerId: string; goals: number };
}

export function getTeamAggregate(teamId: string): TeamAggregate {
  const finished = matches.filter(
    m => (m.status === "finished" || m.status === "locked") &&
         (m.homeTeamId === teamId || m.awayTeamId === teamId)
  );
  let goalsFor = 0, goalsAgainst = 0, wins = 0, draws = 0, losses = 0, cleanSheets = 0;
  for (const m of finished) {
    const isHome = m.homeTeamId === teamId;
    const my  = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const opp = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    goalsFor += my; goalsAgainst += opp;
    if (my > opp) wins++;
    else if (my < opp) losses++;
    else draws++;
    if (opp === 0) cleanSheets++;
  }
  let topScorer: { playerId: string; goals: number } | undefined;
  for (const p of getTeamPlayers(teamId)) {
    const s = getPlayerStats(p.id);
    if (s.goals > 0 && (!topScorer || s.goals > topScorer.goals))
      topScorer = { playerId: p.id, goals: s.goals };
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
  return matches.filter(m => new Date(m.date).toDateString() === date.toDateString());
}

// ============= PHASE LABELS =============
export const phaseLabel: Record<MatchPhase, string> = {
  regular: "Regular season", quarter: "Quarti di finale",
  semi: "Semifinale", third: "Finale 3° posto", final: "Finale",
};
export const phaseShort: Record<MatchPhase, string> = {
  regular: "RS", quarter: "QF", semi: "SF", third: "3°", final: "F",
};

// ============= GUARD =============
function ensureEditable(m: Match): string | null {
  if (m.status === "locked") return "Partita bloccata: nessuna modifica consentita.";
  if (!m.homeTeamId || !m.awayTeamId) return "Squadre non ancora definite.";
  return null;
}

// ============= MATCH PHASE TRANSITIONS =============
export async function startFirstHalf(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.status === "locked") return { ok: false, error: "Partita bloccata." };
  if (m.currentPhase) return { ok: false, error: "Partita già avviata." };
  const { error } = await supabase.from("matches").update({
    status: "live",
    current_phase: "first_half",
    first_half_started_at: new Date().toISOString(),
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

export async function endFirstHalf(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.currentPhase !== "first_half") return { ok: false, error: "Non è in corso il primo tempo." };
  const { error } = await supabase.from("matches").update({
    current_phase: "half_time",
    first_half_ended_at: new Date().toISOString(),
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

export async function startSecondHalf(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.currentPhase !== "half_time") return { ok: false, error: "Fine il primo tempo prima di avviare il secondo." };
  const { error } = await supabase.from("matches").update({
    current_phase: "second_half",
    second_half_started_at: new Date().toISOString(),
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

export async function endSecondHalf(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.currentPhase !== "second_half") return { ok: false, error: "Non è in corso il secondo tempo." };
  const { error } = await supabase.from("matches").update({
    current_phase: null,
    second_half_ended_at: new Date().toISOString(),
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

export async function startShootout(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.status === "locked") return { ok: false, error: "Partita bloccata." };
  if (!m.secondHalfEndedAt) return { ok: false, error: "Fine il secondo tempo prima di avviare i rigori." };
  if (m.currentPhase === "shootout") return { ok: false, error: "Shootout già in corso." };
  const { error } = await supabase.from("matches").update({ current_phase: "shootout" }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

// ============= MATCH EVENTS =============
export async function addMatchEvent(matchId: string, input: {
  team: "home" | "away";
  type: EventType;
  playerId: string;
  weight?: 1 | 2;
  minute: number;
  period: MatchPeriod;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  const err = ensureEditable(m);
  if (err) return { ok: false, error: err };
  if (m.status === "finished") return { ok: false, error: "Partita già conclusa: riaprila per modificare." };

  const teamId = input.team === "home" ? m.homeTeamId! : m.awayTeamId!;
  let eventType: string = input.type;
  if (input.type === "goal" && input.weight === 2) eventType = "double_goal";

  const { error } = await supabase.from("match_events").insert({
    match_id:    matchId,
    team_id:     teamId,
    player_id:   input.playerId,
    event_type:  eventType,
    event_order: m.events.length + 1,
    minute:      input.minute,
    period:      input.period,
  });
  if (error) return { ok: false, error: error.message };
  await reloadAll();
  return { ok: true };
}

export async function undoLastEvent(matchId: string): Promise<boolean> {
  const m = getMatch(matchId);
  if (!m || m.status === "locked" || m.events.length === 0) return false;
  const last = m.events[m.events.length - 1]; // highest event_order = newest
  const { error } = await supabase.from("match_events").delete().eq("id", last.id);
  if (error) return false;
  await reloadAll();
  return true;
}

export async function setMatchStatus(matchId: string, status: MatchStatus): Promise<boolean> {
  const m = getMatch(matchId);
  if (!m) return false;
  if (m.status === "locked" && status !== "locked") return false;
  const clearResult = status !== "finished" && status !== "locked";
  const patch = clearResult ? { status, result_type: null, winner_team_id: null } : { status };
  const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
  if (error) return false;
  await reloadAll();
  return true;
}

export async function reopenMatch(matchId: string): Promise<boolean> {
  const m = getMatch(matchId);
  if (!m || m.status === "locked") return false;
  const { error } = await supabase.from("matches").update({
    status: "live", result_type: null, winner_team_id: null,
    current_phase: null,
  }).eq("id", matchId);
  if (error) return false;
  await reloadAll();
  return true;
}

export async function resetMatch(matchId: string): Promise<boolean> {
  const m = getMatch(matchId);
  if (!m || m.status === "locked") return false;
  await supabase.from("match_events").delete().eq("match_id", matchId);
  await supabase.from("matches").update({
    status: "scheduled", result_type: null, winner_team_id: null,
    home_score: 0, away_score: 0,
    current_phase: null,
    first_half_started_at: null, first_half_ended_at: null,
    second_half_started_at: null, second_half_ended_at: null,
  }).eq("id", matchId);
  await reloadAll();
  return true;
}

export async function finalizeMatch(
  matchId: string,
  outcome: { type: "direct" } | { type: "shootout"; winner: "home" | "away" },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getMatch(matchId);
  if (!m) return { ok: false, error: "Partita non trovata." };
  if (m.status === "locked") return { ok: false, error: "Partita bloccata." };

  // For direct, the score must not be tied (at regulation end, before any shootout goals)
  // We can't easily re-compute the regulation score here, so we trust the admin's choice
  const winner_team_id =
    outcome.type === "shootout"
      ? (outcome.winner === "home" ? m.homeTeamId : m.awayTeamId)
      : ((m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.homeTeamId : m.awayTeamId);

  const { error } = await supabase.from("matches").update({
    status: "finished",
    result_type: outcome.type,
    winner_team_id,
    current_phase: null,
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  await reloadAll();
  return { ok: true };
}

export async function lockMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase.from("matches").update({ status: "locked" }).eq("id", matchId);
  if (error) return false;
  await reloadAll();
  return true;
}

export async function unlockMatch(matchId: string): Promise<boolean> {
  const m = getMatch(matchId);
  if (!m || m.status !== "locked") return false;
  const { error } = await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);
  if (error) return false;
  await reloadAll();
  return true;
}

export async function recomputeAll(): Promise<void> {
  await supabase.rpc("recalculate_all_matches");
  await reloadAll();
}

// ============= MATCHDAY HELPERS =============
async function ensureMatchday(matchdayNumber: number, eventDate: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("matchdays").select("id").eq("sort_order", matchdayNumber).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("matchdays")
    .insert({ sort_order: matchdayNumber, title: `Giornata ${matchdayNumber}`, event_date: eventDate })
    .select("id").single();
  if (error) return null;
  return created.id;
}

// ============= MATCH CRUD (admin) =============
export interface MatchUpsertInput {
  id?: string; phase: MatchPhase; matchday: number; date: string;
  homeTeamId: string | null; awayTeamId: string | null;
  homeLabel?: string; awayLabel?: string; venue: string; status: MatchStatus;
}

export async function upsertMatch(input: MatchUpsertInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const stageId = getStageIdByPhase(input.phase);
  if (!stageId) return { ok: false, error: "Fase sconosciuta." };
  const matchdayId = await ensureMatchday(input.matchday, input.date.slice(0, 10));
  const payload = {
    stage_id: stageId, matchday_id: matchdayId, scheduled_at: input.date,
    home_team_id: input.homeTeamId, away_team_id: input.awayTeamId,
    home_placeholder: input.homeTeamId ? null : (input.homeLabel ?? null),
    away_placeholder: input.awayTeamId ? null : (input.awayLabel ?? null),
    venue: input.venue, status: input.status,
  };
  if (input.id) {
    const { error } = await supabase.from("matches").update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("matches").insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  await reloadAll();
  return { ok: true };
}

export async function deleteMatch(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await supabase.from("match_events").delete().eq("match_id", id);
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll();
  return { ok: true };
}

// ============= TEAM/PLAYER UPSERT (CSV import) =============
export async function upsertTeams(rows: { name: string; slug?: string | null }[]) {
  const { error } = await supabase.from("teams").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  await reloadAll();
}
export async function upsertPlayers(rows: { full_name: string; team_id: string; role: PlayerRole; jersey_number?: number | null }[]) {
  const { error } = await supabase.from("players").upsert(rows, { onConflict: "team_id,full_name" });
  if (error) throw error;
  await reloadAll();
}

// ============= TEAM CRUD =============
export async function createTeam(data: { name: string; slug?: string | null; short_name?: string | null; color?: string | null; is_in_championship?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("teams").insert(data);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}
export async function updateTeam(id: string, patch: { name?: string; slug?: string | null; short_name?: string | null; color?: string | null; is_in_championship?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("teams").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}
export async function deleteTeam(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

// ============= PLAYER CRUD =============
export async function createPlayer(data: { full_name: string; team_id: string; role: PlayerRole; jersey_number?: number | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("players").insert(data);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esiste già un giocatore con questo nome in questa squadra" };
    return { ok: false, error: error.message };
  }
  await reloadAll(); return { ok: true };
}
export async function updatePlayer(id: string, patch: { full_name?: string; team_id?: string; role?: PlayerRole; jersey_number?: number | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("players").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esiste già un giocatore con questo nome nella squadra di destinazione" };
    return { ok: false, error: error.message };
  }
  await reloadAll(); return { ok: true };
}
export async function deletePlayer(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}

// ============= CALENDAR EVENTS CRUD =============
export async function createCalendarEvent(data: {
  title: string; description?: string; event_date: string; start_time?: string; image_url?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("calendar_events").insert({
    title: data.title,
    description: data.description ?? null,
    event_date: data.event_date,
    start_time: data.start_time ?? null,
    image_url: data.image_url ?? null,
  });
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}
export async function updateCalendarEvent(id: string, patch: {
  title?: string; description?: string | null; event_date?: string; start_time?: string | null; image_url?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("calendar_events").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}
export async function deleteCalendarEvent(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await reloadAll(); return { ok: true };
}
