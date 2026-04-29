-- =========================================================================
-- 1. WIPE EXISTING TEST USERS (pre-launch, starting fresh)
-- =========================================================================
-- Cascade through dependent tables first
DELETE FROM public.support_chats;
DELETE FROM public.game_history;
DELETE FROM public.transactions;
DELETE FROM public.wallets;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
-- Delete auth users last
DELETE FROM auth.users;

-- =========================================================================
-- 2. PROFILES: add username, is_banned, referred_by, avatar_url
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Unique username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username));

-- =========================================================================
-- 3. NOTIFICATIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL means broadcast (every user gets a copy via insert loop)
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete notifications" ON public.notifications;
CREATE POLICY "Admins delete notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 4. SITE SETTINGS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated reads settings" ON public.site_settings;
CREATE POLICY "Anyone authenticated reads settings" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins update settings" ON public.site_settings;
CREATE POLICY "Admins update settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed deposit addresses
INSERT INTO public.site_settings (key, value) VALUES
  ('deposit_addr_TRX',   'TGGBJFCj9Gsp6zEsUB48sYSQTPcC6yWVrS'),
  ('deposit_addr_USDT',  'TGGBJFCj9Gsp6zEsUB48sYSQTPcC6yWVrS'),
  ('deposit_addr_BTC',   'bc1q0zlpk8h2u3ncxxnmhfkaug3tea9dy59mauv0qr'),
  ('deposit_addr_ETH',   '0xdEa01f3c290C3CcB9849F6a2701Ae98A2b62d9E7'),
  ('deposit_addr_BNB',   '0xdEa01f3c290C3CcB9849F6a2701Ae98A2b62d9E7'),
  ('support_email',      'CrushCakSupport@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- =========================================================================
-- 5. TRANSACTIONS: add crypto, txid, admin_note, reviewed_by/at
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crypto_currency') THEN
    CREATE TYPE crypto_currency AS ENUM ('TRX','USDT','BTC','ETH','BNB');
  END IF;
END$$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS crypto crypto_currency NOT NULL DEFAULT 'TRX',
  ADD COLUMN IF NOT EXISTS txid TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Allow users to INSERT their own deposit/withdrawal *requests* (forced to pending)
DROP POLICY IF EXISTS "Deny direct transaction inserts" ON public.transactions;
CREATE POLICY "Users can submit own pending tx requests" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can update transactions (approve/reject)
DROP POLICY IF EXISTS "Deny direct transaction updates" ON public.transactions;
CREATE POLICY "Admins update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 6. UPDATE handle_new_user trigger to capture username + referral
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fake_trx_address TEXT;
  v_username TEXT;
BEGIN
  fake_trx_address := 'T' || substr(
    translate(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), '0', 'x'),
    1, 33
  );

  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );

  INSERT INTO public.profiles (
    user_id, email, username, first_name, last_name, national_id,
    date_of_birth, gender, phone, country, trx_deposit_address, referred_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'national_id',
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::DATE,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    fake_trx_address,
    NULLIF(NEW.raw_user_meta_data->>'referred_by', '')
  );

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 7. Helper: lookup email by username (for login-with-username)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.email_for_username(_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE LOWER(username) = LOWER(_username) LIMIT 1;
$$;

-- =========================================================================
-- 8. Helper: promote a user to admin by email (admin bootstrap)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.profiles WHERE email = _email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', _email;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- =========================================================================
-- 9. Helper: admin-side stats for dashboard
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_user_stats(_user_id UUID)
RETURNS TABLE(
  total_deposits NUMERIC,
  total_withdrawals NUMERIC,
  total_wagered NUMERIC,
  total_won NUMERIC,
  biggest_win NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id=_user_id AND type='deposit' AND status='completed'),0),
    COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id=_user_id AND type='withdrawal' AND status='completed'),0),
    COALESCE((SELECT SUM(bet_amount) FROM game_history WHERE user_id=_user_id),0),
    COALESCE((SELECT SUM(payout) FROM game_history WHERE user_id=_user_id),0),
    COALESCE((SELECT MAX(payout) FROM game_history WHERE user_id=_user_id),0);
$$;
