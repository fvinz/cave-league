-- =========================================================
-- Add is_in_championship flag to teams.
-- Teams with is_in_championship = false can exist in the
-- system and participate in event/exhibition matches, but
-- those matches do not count toward standings or player stats.
-- =========================================================

-- Drop all views that (may) reference is_in_championship first,
-- so the subsequent ALTER TABLE needs no CASCADE.
DROP VIEW IF EXISTS public.v_team_aggregate;
DROP VIEW IF EXISTS public.v_top_clean_sheets;
DROP VIEW IF EXISTS public.v_player_stats;
DROP VIEW IF EXISTS public.v_top_scorers;
DROP VIEW IF EXISTS public.v_standings;

-- All existing teams get is_in_championship = true (the default).
ALTER TABLE public.teams DROP COLUMN IF EXISTS is_in_championship;
ALTER TABLE public.teams ADD COLUMN is_in_championship boolean NOT NULL DEFAULT true;

-- ── Standings view ────────────────────────────────────────
-- Regular-season matches where BOTH teams are in the championship.
-- Only championship teams appear in the output.
CREATE OR REPLACE VIEW public.v_standings
WITH (security_invoker=on) AS
WITH reg AS (
  SELECT m.* FROM public.matches m
  JOIN public.stages s ON s.id = m.stage_id
  JOIN public.teams ht  ON ht.id  = m.home_team_id AND ht.is_in_championship
  JOIN public.teams at2 ON at2.id = m.away_team_id AND at2.is_in_championship
  WHERE s.code = 'regular' AND m.status IN ('finished','locked')
    AND m.home_team_id IS NOT NULL AND m.away_team_id IS NOT NULL
),
rows AS (
  SELECT home_team_id AS team_id, home_score AS gf, away_score AS gs, result_type,
         CASE WHEN home_score > away_score THEN 'win_direct'
              WHEN home_score < away_score THEN 'loss_direct'
              WHEN result_type='shootout' AND winner_team_id = home_team_id THEN 'win_so'
              WHEN result_type='shootout' AND winner_team_id IS NOT NULL AND winner_team_id <> home_team_id THEN 'loss_so'
              ELSE 'draw' END AS outcome
  FROM reg
  UNION ALL
  SELECT away_team_id AS team_id, away_score AS gf, home_score AS gs, result_type,
         CASE WHEN away_score > home_score THEN 'win_direct'
              WHEN away_score < home_score THEN 'loss_direct'
              WHEN result_type='shootout' AND winner_team_id = away_team_id THEN 'win_so'
              WHEN result_type='shootout' AND winner_team_id IS NOT NULL AND winner_team_id <> away_team_id THEN 'loss_so'
              ELSE 'draw' END AS outcome
  FROM reg
)
SELECT
  t.id AS team_id,
  t.name,
  COUNT(r.*)::int AS played,
  COALESCE(SUM(CASE WHEN r.outcome='win_direct' THEN 1 ELSE 0 END),0)::int AS w,
  COALESCE(SUM(CASE WHEN r.outcome='win_so'     THEN 1 ELSE 0 END),0)::int AS w_so,
  COALESCE(SUM(CASE WHEN r.outcome='loss_so'    THEN 1 ELSE 0 END),0)::int AS l_so,
  COALESCE(SUM(CASE WHEN r.outcome='loss_direct' THEN 1 ELSE 0 END),0)::int AS l,
  COALESCE(SUM(r.gf),0)::int AS gf,
  COALESCE(SUM(r.gs),0)::int AS gs,
  COALESCE(SUM(r.gf - r.gs),0)::int AS gd,
  COALESCE(SUM(CASE r.outcome
       WHEN 'win_direct' THEN 3
       WHEN 'win_so'     THEN 2
       WHEN 'loss_so'    THEN 1
       ELSE 0 END),0)::int AS points
FROM public.teams t
LEFT JOIN rows r ON r.team_id = t.id
WHERE t.is_in_championship
GROUP BY t.id, t.name
ORDER BY points DESC, gd DESC, gf DESC, name ASC;

-- ── Top-scorers view ──────────────────────────────────────
-- Goals only from matches where both teams are in the championship.
CREATE OR REPLACE VIEW public.v_top_scorers
WITH (security_invoker=on) AS
SELECT p.id AS player_id, p.full_name, p.team_id, t.name AS team_name,
       COUNT(e.*)::int AS goals
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN (
  SELECT e.*
  FROM public.match_events e
  JOIN public.matches m  ON m.id  = e.match_id
  JOIN public.teams  ht  ON ht.id  = m.home_team_id AND ht.is_in_championship
  JOIN public.teams  at2 ON at2.id = m.away_team_id AND at2.is_in_championship
  WHERE e.event_type IN ('goal','double_goal')
) e ON e.player_id = p.id
GROUP BY p.id, p.full_name, p.team_id, t.name
ORDER BY goals DESC, p.full_name ASC;

-- ── Player-stats view ─────────────────────────────────────
-- Appearances and goals only count for championship matches.
CREATE OR REPLACE VIEW public.v_player_stats
WITH (security_invoker=on) AS
WITH champ_matches AS (
  SELECT m.*
  FROM public.matches m
  JOIN public.teams ht  ON ht.id  = m.home_team_id AND ht.is_in_championship
  JOIN public.teams at2 ON at2.id = m.away_team_id AND at2.is_in_championship
  WHERE m.status IN ('finished','locked')
),
played AS (
  SELECT p.id AS player_id, p.team_id, COUNT(m.*)::int AS appearances
  FROM public.players p
  LEFT JOIN champ_matches m
    ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
  GROUP BY p.id, p.team_id
),
goals AS (
  SELECT e.player_id,
         COUNT(*) FILTER (WHERE e.event_type IN ('goal','double_goal'))::int AS goals,
         COUNT(*) FILTER (WHERE e.event_type = 'own_goal')::int AS own_goals
  FROM public.match_events e
  JOIN champ_matches m ON m.id = e.match_id
  GROUP BY e.player_id
),
cs AS (
  SELECT p.id AS player_id, COUNT(*)::int AS clean_sheets
  FROM public.players p
  JOIN champ_matches m
    ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
  WHERE p.role = 'p'
    AND ((m.home_team_id = p.team_id AND m.away_score = 0)
      OR (m.away_team_id = p.team_id AND m.home_score = 0))
  GROUP BY p.id
)
SELECT p.id AS player_id, p.full_name, p.team_id, t.name AS team_name, p.role,
       COALESCE(played.appearances,0) AS appearances,
       COALESCE(goals.goals,0)        AS goals,
       COALESCE(goals.own_goals,0)    AS own_goals,
       COALESCE(cs.clean_sheets,0)    AS clean_sheets
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN played ON played.player_id = p.id
LEFT JOIN goals  ON goals.player_id  = p.id
LEFT JOIN cs     ON cs.player_id     = p.id;

-- ── Dependent views ───────────────────────────────────────
CREATE OR REPLACE VIEW public.v_top_clean_sheets
WITH (security_invoker=on) AS
SELECT player_id, full_name, team_id, team_name, clean_sheets
FROM public.v_player_stats
WHERE role = 'p'
ORDER BY clean_sheets DESC, full_name ASC;

CREATE OR REPLACE VIEW public.v_team_aggregate
WITH (security_invoker=on) AS
SELECT team_id, name, played, w, w_so, l_so, l, gf, gs, gd, points
FROM public.v_standings;
