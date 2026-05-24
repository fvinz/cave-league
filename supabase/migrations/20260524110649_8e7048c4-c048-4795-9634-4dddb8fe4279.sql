
-- =========================================================
-- CAVE LEAGUE — Initial schema, RLS, triggers, views
-- =========================================================

-- ---------- TABLES ----------

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('p','g','pres')),
  jersey_number int,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, full_name)
);
CREATE INDEX idx_players_team ON public.players(team_id);

CREATE TABLE public.matchdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_matchdays_date ON public.matchdays(event_date);

CREATE TABLE public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL
);

INSERT INTO public.stages (code, label, sort_order) VALUES
  ('regular','Regular Season',1),
  ('quarterfinal','Quarti di finale',2),
  ('semifinal','Semifinale',3),
  ('third_place','Finale 3°/4° posto',4),
  ('final','Finale',5);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday_id uuid REFERENCES public.matchdays(id) ON DELETE SET NULL,
  stage_id uuid NOT NULL REFERENCES public.stages(id),
  home_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  home_placeholder text,
  away_placeholder text,
  scheduled_at timestamptz NOT NULL,
  venue text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished','locked')),
  result_type text CHECK (result_type IN ('direct','shootout')),
  winner_team_id uuid REFERENCES public.teams(id),
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_distinct_teams CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id)
);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_matchday ON public.matches(matchday_id);
CREATE INDEX idx_matches_stage ON public.matches(stage_id);
CREATE INDEX idx_matches_home ON public.matches(home_team_id);
CREATE INDEX idx_matches_away ON public.matches(away_team_id);

CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  event_type text NOT NULL CHECK (event_type IN ('goal','double_goal','own_goal')),
  event_order int NOT NULL DEFAULT 0,
  minute int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_match ON public.match_events(match_id, event_order);
CREATE INDEX idx_events_player ON public.match_events(player_id);
CREATE INDEX idx_events_team ON public.match_events(team_id);

CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- HELPER FUNCTIONS ----------

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = _user_id)
$$;

-- Recompute home_score/away_score from match_events for a single match
CREATE OR REPLACE FUNCTION public.recalculate_match_score(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  hs int := 0;
  as_ int := 0;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = _match_id;
  IF m.id IS NULL THEN RETURN; END IF;
  IF m.status = 'locked' THEN RETURN; END IF;

  -- Goals/double goals attributed to the scoring team
  SELECT COALESCE(SUM(CASE WHEN event_type='goal' THEN 1 WHEN event_type='double_goal' THEN 2 ELSE 0 END),0)
    INTO hs FROM public.match_events
    WHERE match_id = _match_id AND team_id = m.home_team_id AND event_type IN ('goal','double_goal');
  SELECT COALESCE(SUM(CASE WHEN event_type='goal' THEN 1 WHEN event_type='double_goal' THEN 2 ELSE 0 END),0)
    INTO as_ FROM public.match_events
    WHERE match_id = _match_id AND team_id = m.away_team_id AND event_type IN ('goal','double_goal');

  -- Own goals add 1 to the opponent
  hs := hs + COALESCE((SELECT COUNT(*) FROM public.match_events WHERE match_id=_match_id AND team_id=m.away_team_id AND event_type='own_goal'),0);
  as_ := as_ + COALESCE((SELECT COUNT(*) FROM public.match_events WHERE match_id=_match_id AND team_id=m.home_team_id AND event_type='own_goal'),0);

  UPDATE public.matches SET home_score = hs, away_score = as_ WHERE id = _match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_all_matches()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR r IN SELECT id FROM public.matches WHERE status <> 'locked' LOOP
    PERFORM public.recalculate_match_score(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Trigger: recompute scores when events change
CREATE OR REPLACE FUNCTION public.trg_events_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_match_score(OLD.match_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_match_score(NEW.match_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER match_events_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.trg_events_recalc();

-- Trigger: block writes when match is locked
CREATE OR REPLACE FUNCTION public.trg_events_block_locked()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM public.matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
  IF st = 'locked' THEN
    RAISE EXCEPTION 'match is locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER match_events_block_locked
BEFORE INSERT OR UPDATE OR DELETE ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.trg_events_block_locked();

-- Trigger: validate match finalization
CREATE OR REPLACE FUNCTION public.trg_matches_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('finished','locked') THEN
    IF NEW.home_score = NEW.away_score AND NEW.result_type IS DISTINCT FROM 'shootout' THEN
      RAISE EXCEPTION 'finished tied match requires result_type=shootout';
    END IF;
    IF NEW.home_score <> NEW.away_score AND NEW.result_type IS DISTINCT FROM 'direct' AND NEW.result_type IS DISTINCT FROM 'shootout' THEN
      NEW.result_type := 'direct';
    END IF;
    IF NEW.winner_team_id IS NULL THEN
      IF NEW.home_score > NEW.away_score THEN NEW.winner_team_id := NEW.home_team_id;
      ELSIF NEW.away_score > NEW.home_score THEN NEW.winner_team_id := NEW.away_team_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_validate
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.trg_matches_validate();

-- Auto-add authorized admin email on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'cave.lab2024@gmail.com' THEN
    INSERT INTO public.admins (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();

-- ---------- RLS ----------

ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchdays    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins       ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public read teams"     ON public.teams        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read players"   ON public.players      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read matchdays" ON public.matchdays    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read stages"    ON public.stages       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read matches"   ON public.matches      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read events"    ON public.match_events FOR SELECT TO anon, authenticated USING (true);

-- Admin write
CREATE POLICY "admin write teams"     ON public.teams        FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin write players"   ON public.players      FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin write matchdays" ON public.matchdays    FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin write matches"   ON public.matches      FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin write events"    ON public.match_events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Admins table: only self-row readable to the authenticated user matching it
CREATE POLICY "admin read self" ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------- VIEWS ----------

-- Standings (regular season only)
CREATE OR REPLACE VIEW public.v_standings
WITH (security_invoker=on) AS
WITH reg AS (
  SELECT m.* FROM public.matches m
  JOIN public.stages s ON s.id = m.stage_id
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
  COALESCE(SUM(CASE WHEN r.outcome='win_so' THEN 1 ELSE 0 END),0)::int AS w_so,
  COALESCE(SUM(CASE WHEN r.outcome='loss_so' THEN 1 ELSE 0 END),0)::int AS l_so,
  COALESCE(SUM(CASE WHEN r.outcome='loss_direct' THEN 1 ELSE 0 END),0)::int AS l,
  COALESCE(SUM(r.gf),0)::int AS gf,
  COALESCE(SUM(r.gs),0)::int AS gs,
  COALESCE(SUM(r.gf - r.gs),0)::int AS gd,
  COALESCE(SUM(CASE r.outcome
       WHEN 'win_direct' THEN 3
       WHEN 'win_so' THEN 2
       WHEN 'loss_so' THEN 1
       ELSE 0 END),0)::int AS points
FROM public.teams t
LEFT JOIN rows r ON r.team_id = t.id
GROUP BY t.id, t.name
ORDER BY points DESC, gd DESC, gf DESC, name ASC;

-- Top scorers
CREATE OR REPLACE VIEW public.v_top_scorers
WITH (security_invoker=on) AS
SELECT p.id AS player_id, p.full_name, p.team_id, t.name AS team_name,
       COUNT(e.*)::int AS goals
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.match_events e
  ON e.player_id = p.id AND e.event_type IN ('goal','double_goal')
GROUP BY p.id, p.full_name, p.team_id, t.name
ORDER BY goals DESC, p.full_name ASC;

-- Player stats
CREATE OR REPLACE VIEW public.v_player_stats
WITH (security_invoker=on) AS
WITH played AS (
  SELECT p.id AS player_id, p.team_id, COUNT(m.*)::int AS appearances
  FROM public.players p
  LEFT JOIN public.matches m
    ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
   AND m.status IN ('finished','locked')
  GROUP BY p.id, p.team_id
),
goals AS (
  SELECT player_id,
         COUNT(*) FILTER (WHERE event_type IN ('goal','double_goal'))::int AS goals,
         COUNT(*) FILTER (WHERE event_type = 'own_goal')::int AS own_goals
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
       COALESCE(played.appearances,0) AS appearances,
       COALESCE(goals.goals,0) AS goals,
       COALESCE(goals.own_goals,0) AS own_goals,
       COALESCE(cs.clean_sheets,0) AS clean_sheets
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
LEFT JOIN played ON played.player_id = p.id
LEFT JOIN goals ON goals.player_id = p.id
LEFT JOIN cs ON cs.player_id = p.id;

-- Top clean sheets (goalkeepers only)
CREATE OR REPLACE VIEW public.v_top_clean_sheets
WITH (security_invoker=on) AS
SELECT player_id, full_name, team_id, team_name, clean_sheets
FROM public.v_player_stats
WHERE role = 'p'
ORDER BY clean_sheets DESC, full_name ASC;

-- Team aggregate
CREATE OR REPLACE VIEW public.v_team_aggregate
WITH (security_invoker=on) AS
SELECT team_id, name, played, w, w_so, l_so, l, gf, gs, gd, points
FROM public.v_standings;
