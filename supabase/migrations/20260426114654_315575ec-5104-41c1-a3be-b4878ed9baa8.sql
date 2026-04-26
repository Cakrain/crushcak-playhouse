-- Fix handle_new_user: gen_random_bytes (pgcrypto) is not available.
-- Replace with gen_random_uuid()-based pseudo-random address generator.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fake_trx_address TEXT;
BEGIN
  -- Build a 34-char fake TRX address: 'T' + 33 chars derived from concatenated UUIDs.
  fake_trx_address := 'T' || substr(
    translate(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), '0', 'x'),
    1, 33
  );

  INSERT INTO public.profiles (
    user_id, email, first_name, last_name, national_id, date_of_birth, gender, phone, country, trx_deposit_address
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'national_id',
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::DATE,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    fake_trx_address
  );

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Ensure the trigger on auth.users exists and points to the function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();