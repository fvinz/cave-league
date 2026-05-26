-- The previous migration revoked EXECUTE on is_admin from authenticated, which
-- broke all RLS write policies that call public.is_admin(auth.uid()).
-- Restore EXECUTE so the RLS policies can evaluate the function.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
