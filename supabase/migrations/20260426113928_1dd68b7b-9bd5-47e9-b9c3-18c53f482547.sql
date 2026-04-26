-- 1. Drop the over-permissive live feed policy
DROP POLICY IF EXISTS "Authenticated users can view live feed" ON public.game_history;

-- 2. Create a SECURITY DEFINER function to expose only anonymized recent bets
CREATE OR REPLACE FUNCTION public.get_live_bets_feed()
RETURNS TABLE (
  id uuid,
  game game_type,
  bet_amount numeric,
  multiplier numeric,
  payout numeric,
  won boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, game, bet_amount, multiplier, payout, won, created_at
  FROM public.game_history
  ORDER BY created_at DESC
  LIMIT 30;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_bets_feed() TO authenticated, anon;

-- 3. Create a view for realtime-friendly anonymized feed (no user_id, no seeds, no metadata)
CREATE OR REPLACE VIEW public.live_bets_feed
WITH (security_invoker=on) AS
SELECT id, game, bet_amount, multiplier, payout, won, created_at
FROM public.game_history;

GRANT SELECT ON public.live_bets_feed TO authenticated, anon;

-- 4. Lock down user_roles — block self-insert/update/delete; only admins via existing "Admins can manage roles" policy
CREATE POLICY "Block user role self-insert"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Block user role self-update"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Block user role self-delete"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Wallets — explicitly deny direct client mutations (edge functions use service role and bypass RLS)
CREATE POLICY "Deny direct wallet inserts"
  ON public.wallets FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny direct wallet updates"
  ON public.wallets FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny direct wallet deletes"
  ON public.wallets FOR DELETE
  TO authenticated
  USING (false);

-- 6. Transactions — explicitly deny direct client mutations
CREATE POLICY "Deny direct transaction inserts"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny direct transaction updates"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny direct transaction deletes"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (false);

-- 7. Game history — explicitly deny direct client mutations (edge functions write via service role)
CREATE POLICY "Deny direct game_history inserts"
  ON public.game_history FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny direct game_history updates"
  ON public.game_history FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny direct game_history deletes"
  ON public.game_history FOR DELETE
  TO authenticated
  USING (false);

-- 8. Profiles — deny deletes
CREATE POLICY "Deny profile deletes"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (false);

-- 9. Support chats — deny updates and deletes
CREATE POLICY "Deny support chat updates"
  ON public.support_chats FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny support chat deletes"
  ON public.support_chats FOR DELETE
  TO authenticated
  USING (false);