REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_user_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_user_stats(UUID) TO authenticated;
-- email_for_username MUST be callable by anon (used pre-login)
GRANT  EXECUTE ON FUNCTION public.email_for_username(TEXT) TO anon, authenticated;