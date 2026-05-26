-- =========================================================
-- Match phases, timer columns, extended event types,
-- calendar_events table, updated score function + views
-- =========================================================

-- 1. Extend match_events.event_type CHECK
--    Drop ANY existing check on event_type by introspection (name may vary).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.match_events'::regclass
      AND contype  = 'c'
      AND pg_get_constraintdef(oid) LIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.match_events DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN (
    'goal','double_goal','own_goal',
    'yellow_card','red_card',
    'shootout_goal','shootout_miss'
  ));

-- 2. Add period column to match_events (nullable → NULL = pre-migration / unknown)
ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS period text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_events'::regclass
      AND contype  = 'c'
      AND conname  = 'match_events_period_check'
  ) THEN
    ALTER TABLE public.match_events
      ADD CONSTRAINT match_events_period_check
      CHECK (period IN ('first_half','second_half','shootout'));
  END IF;
END;
$$;

-- 3. current_phase on matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS current_phase text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND contype  = 'c'
      AND conname  = 'matches_current_phase_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_current_phase_check
      CHECK (current_phase IN ('first_half','half_time','second_half','shootout'));
  END IF;
END;
$$;

-- 4. Timer timestamps on matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS first_half_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS first_half_ended_at    timestamptz,
  ADD COLUMN IF NOT EXISTS second_half_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS second_half_ended_at   timestamptz;

-- 5. Calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  event_date  date NOT NULL,
  start_time  time,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read calendar_events"    ON public.calendar_events;
DROP POLICY IF EXISTS "admin insert calendar_events"   ON public.calendar_events;
DROP POLICY IF EXISTS "admin update calendar_events"   ON public.calendar_events;
DROP POLICY IF EXISTS "admin delete calendar_events"   ON public.calendar_events;

CREATE POLICY "public read calendar_events"
  ON public.calendar_events FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin insert calendar_events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update calendar_events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete calendar_events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Update recalculate_match_score: shootout_goal counts toward score
CREATE OR REPLACE FUNCTION public.recalculate_match_score(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m   record;
  hs  int := 0;
  as_ int := 0;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = _match_id;
  IF m.id IS NULL THEN RETURN; END IF;
  IF m.status = 'locked' THEN RETURN; END IF;

  -- Regular + double + shootout goals for home team
  SELECT COALESCE(SUM(
    CASE event_type
      WHEN 'goal'          THEN 1
      WHEN 'double_goal'   THEN 2
      WHEN 'shootout_goal' THEN 1
      ELSE 0
    END),0)
  INTO hs
  FROM public.match_events
  WHERE match_id = _match_id
    AND team_id  = m.home_team_id
    AND event_type IN ('goal','double_goal','shootout_goal');

  -- Regular + double + shootout goals for away team
  SELECT COALESCE(SUM(
    CASE event_type
      WHEN 'goal'          THEN 1
      WHEN 'double_goal'   THEN 2
      WHEN 'shootout_goal' THEN 1
      ELSE 0
    END),0)
  INTO as_
  FROM public.match_events
  WHERE match_id = _match_id
    AND team_id  = m.away_team_id
    AND event_type IN ('goal','double_goal','shootout_goal');

  -- Own goals add 1 to the opponent
  hs  := hs  + COALESCE((SELECT COUNT(*) FROM public.match_events
    WHERE match_id=_match_id AND team_id=m.away_team_id AND event_type='own_goal'),0);
  as_ := as_ + COALESCE((SELECT COUNT(*) FROM public.match_events
    WHERE match_id=_match_id AND team_id=m.home_team_id AND event_type='own_goal'),0);

  UPDATE public.matches SET home_score = hs, away_score = as_ WHERE id = _match_id;
END;
$$;

-- 7. Update v_standings: use result_type to classify win_so vs win_direct
--    (shootout_goal shifts the raw score, so we can't rely on score comparison alone)
CREATE OR REPLACE VIEW public.v_standings
WITH (security_invoker=on) AS
WITH reg AS (
  SELECT m.* FROM public.matches m
  JOIN public.stages s ON s.id = m.stage_id
  WHERE s.code = 'regular' AND m.status IN ('finished','locked')
    AND m.home_team_id IS NOT NULL AND m.away_team_id IS NOT NULL
),
rows AS (
  SELECT home_team_id AS team_id,
         home_score   AS gf,
         away_score   AS gs,
         result_type,
         CASE
           WHEN result_type = 'shootout' AND winner_team_id  = home_team_id THEN 'win_so'
           WHEN result_type = 'shootout' AND winner_team_id != home_team_id THEN 'loss_so'
           WHEN home_score > away_score                                      THEN 'win_direct'
           WHEN home_score < away_score                                      THEN 'loss_direct'
           ELSE 'draw'
         END AS outcome
  FROM reg
  UNION ALL
  SELECT away_team_id AS team_id,
         away_score   AS gf,
         home_score   AS gs,
         result_type,
         CASE
           WHEN result_type = 'shootout' AND winner_team_id  = away_team_id THEN 'win_so'
           WHEN result_type = 'shootout' AND winner_team_id != away_team_id THEN 'loss_so'
           WHEN away_score > home_score                                      THEN 'win_direct'
           WHEN away_score < home_score                                      THEN 'loss_direct'
           ELSE 'draw'
         END AS outcome
  FROM reg
)
SELECT
  t.id   AS team_id,
  t.name,
  COUNT(r.*)::int AS played,
  COALESCE(SUM(CASE WHEN r.outcome='win_direct'  THEN 1 ELSE 0 END),0)::int AS w,
  COALESCE(SUM(CASE WHEN r.outcome='win_so'      THEN 1 ELSE 0 END),0)::int AS w_so,
  COALESCE(SUM(CASE WHEN r.outcome='loss_so'     THEN 1 ELSE 0 END),0)::int AS l_so,
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
GROUP BY t.id, t.name
ORDER BY points DESC, gd DESC, gf DESC, name ASC;

-- 8. Update v_top_scorers: include shootout_goal
CREATE OR REPLACE VIEW public.v_top_scorers
WITH (security_invoker=on) AS
SELECT p.id AS player_id, p.full_name, p.team_id, t.name AS team_name,
       COUNT(e.*)::int AS goals
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.match_events e
  ON e.player_id = p.id
  AND e.event_type IN ('goal','double_goal','shootout_goal')
GROUP BY p.id, p.full_name, p.team_id, t.name
ORDER BY goals DESC, p.full_name ASC;

-- 9. Update v_player_stats: include shootout_goal + cards
--    Must DROP v_player_stats (CASCADE also drops v_top_clean_sheets) then CREATE fresh.
--    CREATE OR REPLACE cannot change column order — that is the root cause of error 42P16.
DROP VIEW IF EXISTS public.v_player_stats CASCADE;

CREATE VIEW public.v_player_stats
WITH (security_invoker=on) AS
WITH played AS (
  SELECT p.id AS player_id, p.team_id, COUNT(m.*)::int AS appearances
  FROM public.players p
  LEFT JOIN public.matches m
    ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
   AND m.status IN ('finished','locked')
  GROUP BY p.id, p.team_id
),
evts AS (
  SELECT player_id,
    COUNT(*) FILTER (WHERE event_type IN ('goal','double_goal','shootout_goal'))::int AS goals,
    COUNT(*) FILTER (WHERE event_type = 'own_goal')::int    AS own_goals,
    COUNT(*) FILTER (WHERE event_type = 'yellow_card')::int AS yellow_cards,
    COUNT(*) FILTER (WHERE event_type = 'red_card')::int    AS red_cards
  FROM public.match_events
  GROUP BY player_id
),
cs AS (
  SELECT p.id AS player_id, COUNT(*)::int AS clean_sheets
  FROM public.players p
  JOIN public.matches m
    ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
   AND m.status IN ('finished','locked')
  WHERE p.role = 'p'
    AND ((m.home_team_id = p.team_id AND m.away_score = 0)
      OR (m.away_team_id = p.team_id AND m.home_score = 0))
  GROUP BY p.id
)
SELECT p.id AS player_id, p.full_name, p.team_id, t.name AS team_name, p.role,
       COALESCE(played.appearances,0)  AS appearances,
       COALESCE(evts.goals,0)          AS goals,
       COALESCE(evts.own_goals,0)      AS own_goals,
       COALESCE(evts.yellow_cards,0)   AS yellow_cards,
       COALESCE(evts.red_cards,0)      AS red_cards,
       COALESCE(cs.clean_sheets,0)     AS clean_sheets
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN played ON played.player_id = p.id
LEFT JOIN evts   ON evts.player_id   = p.id
LEFT JOIN cs     ON cs.player_id     = p.id;

-- Rebuild dependent view (was dropped by CASCADE above)
CREATE VIEW public.v_top_clean_sheets
WITH (security_invoker=on) AS
SELECT player_id, full_name, team_id, team_name, clean_sheets
FROM public.v_player_stats
WHERE role = 'p'
ORDER BY clean_sheets DESC, full_name ASC;
