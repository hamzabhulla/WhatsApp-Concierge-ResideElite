-- ═══════════════════════════════════════════════════════════════════════════════
--  Make a dashboard login an ADMIN         (run AFTER setup.sql)
--
--  1. First create the user:  Supabase → Authentication → Users → "Add user" → "Create new user"
--     (e-mail + password, tick "Auto Confirm User").
--  2. Replace  you@example.com  below with that e-mail (keep the quotes), then Run.
--  3. In the dashboard: press "Check again" on the Access-denied screen, or sign out and sign in.
--
--  Only people marked here can see or change any data. Repeat for every extra admin.
--  Also switch OFF  Authentication → Sign In / Providers → "Allow new users to sign up".
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 WHERE lower(email) = lower('you@example.com');

-- Must show your e-mail with role = admin (0 rows = the e-mail does not exist yet):
SELECT email, raw_app_meta_data ->> 'role' AS role
  FROM auth.users
 WHERE raw_app_meta_data ->> 'role' = 'admin';

-- To REMOVE admin rights later:
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role'
--    WHERE lower(email) = lower('someone@example.com');
