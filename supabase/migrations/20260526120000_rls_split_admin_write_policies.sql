-- =========================================================
-- RLS: Split FOR ALL admin write policies into per-operation policies
--
-- Root cause: migration 20260524110704 revoked EXECUTE on
--   public.is_admin(uuid) from authenticated. All "admin write *"
--   policies call public.is_admin(auth.uid()) in the authenticated
--   role context → permission denied → every admin write returns 403.
--
-- Fix:
--   1. Restore EXECUTE on is_admin to authenticated (idempotent).
--   2. Drop the broad FOR ALL policies.
--   3. Replace with explicit INSERT / UPDATE / DELETE policies so
--      future policy changes are scoped correctly and auditable.
--   4. SELECT policies are unchanged (already correct FOR SELECT).
-- =========================================================

-- 1. Restore EXECUTE permission (idempotent; also done in 20260526083512)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 2. Drop the broad FOR ALL policies
DROP POLICY IF EXISTS "admin write teams"     ON public.teams;
DROP POLICY IF EXISTS "admin write players"   ON public.players;
DROP POLICY IF EXISTS "admin write matchdays" ON public.matchdays;
DROP POLICY IF EXISTS "admin write matches"   ON public.matches;
DROP POLICY IF EXISTS "admin write events"    ON public.match_events;

-- 3a. Teams — per-operation admin policies
CREATE POLICY "admin insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3b. Players — per-operation admin policies
CREATE POLICY "admin insert players"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update players"
  ON public.players FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete players"
  ON public.players FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3c. Matchdays — per-operation admin policies
CREATE POLICY "admin insert matchdays"
  ON public.matchdays FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update matchdays"
  ON public.matchdays FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete matchdays"
  ON public.matchdays FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3d. Matches — per-operation admin policies
CREATE POLICY "admin insert matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update matches"
  ON public.matches FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete matches"
  ON public.matches FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3e. Match events — per-operation admin policies
CREATE POLICY "admin insert events"
  ON public.match_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin update events"
  ON public.match_events FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete events"
  ON public.match_events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- =========================================================
-- Tables NOT touched (intentional):
--   public.stages   — seeded in migration, never written by UI
--   public.admins   — insert-only via handle_new_admin() trigger
--                     (SECURITY DEFINER, bypasses RLS)
--                     no UI writes directly to admins
-- =========================================================
