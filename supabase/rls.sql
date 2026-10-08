-- ═══════════════════════════════════════════════════════════════════════════════
--  Dashboard RLS policies  —  run ONCE in the Supabase SQL editor
--  (run resi-bot/supabase/schema.sql first)
--
--  WHAT THIS FIXES
--   * The old version covered only 4 of the 6 tables. bot_settings (API keys) and
--     whatsapp_connection (QR code + WIPE_SESSION / DISCONNECT command) stayed open to
--     everybody who has the public anon key.
--   * The old policies were USING (true): ANY signed-in user had full access, so with
--     public sign-ups enabled anybody could register and read/modify everything.
--
--  HOW ACCESS WORKS NOW
--   Only users whose JWT carries  app_metadata.role = 'admin'  can touch the tables.
--   app_metadata can only be changed from SQL / the service role - users cannot give
--   themselves this role (unlike user_metadata).
--
--  ┌─ STEP 0 — DO THIS FIRST or you will lock yourself out of the dashboard ─────────┐
--  │  Mark your own dashboard login as admin (replace the e-mail address):           │
--  │                                                                                 │
--  │    UPDATE auth.users                                                            │
--  │       SET raw_app_meta_data =                                                   │
--  │           COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb │
--  │     WHERE email IN ('you@example.com');                                         │
--  │                                                                                 │
--  │  Then SIGN OUT and sign in again on the dashboard (the role lives in the token).│
--  └─────────────────────────────────────────────────────────────────────────────────┘
--  STEP 2 — Supabase Dashboard → Authentication → Sign In / Providers:
--           turn OFF "Allow new users to sign up" and create admin users manually.
--  The bot is unaffected: it uses the service-role / secret key, which bypasses RLS.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

DO $$
DECLARE
  t   text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leads', 'chat_states', 'properties', 'training_data', 'bot_settings', 'whatsapp_connection'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping missing table %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Remove EVERY old dashboard_* policy. Policies are OR-ed together, so a leftover
    -- "USING (true)" policy would keep the table open no matter what we add below.
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'dashboard\_%'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY dashboard_admin_all ON public.%I FOR ALL TO authenticated '
      'USING (public.is_dashboard_admin()) WITH CHECK (public.is_dashboard_admin())', t);

    -- Defence in depth: the anonymous (public key) role gets no table privileges at all
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ── Verify (run these after the script) ─────────────────────────────────────────
--  1) every table must show rowsecurity = true:
--       SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--  2) exactly one policy "dashboard_admin_all" per table:
--       SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public';
--  3) from a terminal, with ONLY the public anon key - this must return [] or a permission error:
--       curl "https://<project>.supabase.co/rest/v1/bot_settings?select=*" \
--            -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
