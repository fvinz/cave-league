
-- Lock down SECURITY DEFINER functions: revoke from public/authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_match_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_events_recalc() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_all_matches() FROM PUBLIC, anon;

-- Allow authenticated users to call recalculate_all_matches (RLS check inside enforces admin)
GRANT EXECUTE ON FUNCTION public.recalculate_all_matches() TO authenticated;

-- Set search_path on remaining non-DEFINER functions
ALTER FUNCTION public.trg_events_block_locked() SET search_path = public;
ALTER FUNCTION public.trg_matches_validate() SET search_path = public;
