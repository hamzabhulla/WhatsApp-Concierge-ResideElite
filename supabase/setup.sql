-- ═══════════════════════════════════════════════════════════════════════════════
--  RESI D'ELITE — Supabase setup  (tables + security)  —  ONE file, run ONCE
--
--  HOW TO RUN
--    1. Supabase → SQL Editor → New query → paste this whole file → Run.
--    2. Then run  make-admin.sql  (it marks YOUR login as the dashboard admin).
--       Skip step 2 and the dashboard will show "Access denied".
--
--  SAFE TO RE-RUN: every statement is idempotent. It works on a brand-new project and on a
--  database the bot has been using for months (existing rows are never touched).
--
--  WHAT IT DOES
--    * creates any missing table the bot / dashboard need (same structure as the bot's schema.sql)
--    * adds indexes the dashboard's sorting needs
--    * turns Row Level Security ON for every table and allows ONLY dashboard admins
--      (JWT app_metadata.role = 'admin') to read/write them. The public "anon" key - which is
--      embedded in the dashboard's JavaScript - can no longer read anything.
--    * removes older "allow every signed-in user" policies (policies are OR-ed together, so one
--      leftover permissive policy would keep the data open)
--
--  The WhatsApp bot is NOT affected: it connects with the service-role / secret key, which
--  bypasses Row Level Security.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: leads
--  Stores all completed booking enquiries captured by the bot.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_number        TEXT      NOT NULL,
  name             TEXT,
  contact          TEXT,
  destination      TEXT,
  checkin_date     DATE,
  checkout_date    DATE,
  guests_count     INTEGER,
  property_interest TEXT,
  status           TEXT      DEFAULT 'new',
  language         TEXT      DEFAULT 'en',
  visit_count      INTEGER   DEFAULT 1,
  created_at       TIMESTAMP DEFAULT now(),
  forwarded_at     TIMESTAMP,
  follow_up_sent   TIMESTAMP,
  review_sent      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_wa_number  ON leads(wa_number);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: chat_states
--  Per-guest conversation state persisted to Supabase.
--  Primary source of truth for flow step, booking data, and AI active flag.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_states (
  wa_number      TEXT    PRIMARY KEY,
  flow_step      TEXT    DEFAULT 'welcome',
  flow_data      JSONB   DEFAULT '{}',
  ai_active      BOOLEAN DEFAULT true,
  admin_override TEXT,
  is_vip         BOOLEAN DEFAULT false,
  last_activity  TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_states_flow_step     ON chat_states(flow_step);
CREATE INDEX IF NOT EXISTS idx_chat_states_ai_active     ON chat_states(ai_active);
CREATE INDEX IF NOT EXISTS idx_chat_states_last_activity ON chat_states(last_activity);

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: properties
--  Live property catalogue synced from Supabase every 15 minutes.
--  Hardcoded properties.js values serve as fallback if this table is empty.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT    UNIQUE NOT NULL,
  name           TEXT    NOT NULL,
  city           TEXT,
  region         TEXT,
  location       TEXT,
  catalogue_link TEXT,
  price_from     INTEGER,
  price_to       INTEGER,
  max_guests     INTEGER,
  min_guests     INTEGER DEFAULT 1,
  bedrooms       INTEGER DEFAULT 0,
  is_available   BOOLEAN DEFAULT true,
  is_budget      BOOLEAN DEFAULT false,
  updated_at     TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_slug      ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_region    ON properties(region);
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(is_available);

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: training_data
--  Stores unknown questions captured by the bot for admin review.
--  Dual-admin approval pipeline: approved_admin1 + approved_admin2 required.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_data (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT    NOT NULL,
  answer          TEXT,
  approved_admin1 BOOLEAN DEFAULT false,
  approved_admin2 BOOLEAN DEFAULT false,
  is_violation    BOOLEAN DEFAULT false,
  wa_number       TEXT,
  created_at      TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_data_approved   ON training_data(approved_admin1, approved_admin2);
CREATE INDEX IF NOT EXISTS idx_training_data_created_at ON training_data(created_at);
CREATE INDEX IF NOT EXISTS idx_training_data_violation  ON training_data(is_violation);


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: bot_settings
--  Single-row configuration table. API keys are stored here and take
--  precedence over .env values. Change via Supabase dashboard.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_settings (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  gemini_api_key       TEXT,
  gemini_api_key_2     TEXT,
  gemini_api_key_3     TEXT,
  groq_api_key         TEXT,
  active_provider      TEXT    DEFAULT 'gemini',
  hybrid_config        TEXT    DEFAULT 'all',
  brand_forward_number TEXT,
  api_errors           JSONB   DEFAULT '{}',
  updated_at           TIMESTAMP DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed with empty values (override from dashboard or .env)
INSERT INTO bot_settings (id, active_provider, hybrid_config)
VALUES (1, 'gemini', 'all')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: whatsapp_connection
--  Single-row WA connection state. Dashboard reads/writes here to control
--  the bot remotely (CONNECT / DISCONNECT / PAIR / WIPE_SESSION commands).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_connection (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  status        TEXT    DEFAULT 'DISCONNECTED',
  qr_code       TEXT,
  pairing_code  TEXT,
  pairing_phone TEXT,
  command       TEXT,
  updated_at    TIMESTAMP DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO whatsapp_connection (id, status)
VALUES (1, 'DISCONNECTED')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
--  Extra indexes (dashboard lists are sorted / filtered by these columns)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_created_at          ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status              ON leads(status);
CREATE INDEX IF NOT EXISTS idx_chat_states_last_activity ON chat_states(last_activity DESC);

-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE: qa_cache   (optional "Repeated FAQ cache" tab in the dashboard)
--  The current bot does not fill it; it exists so that tab loads without an error.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_cache (
  id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_question TEXT      NOT NULL UNIQUE,
  original_question   TEXT      NOT NULL,
  answer              TEXT      NOT NULL,
  ask_count           INTEGER   DEFAULT 1,
  created_at          TIMESTAMP DEFAULT now(),
  updated_at          TIMESTAMP DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
--  SECURITY: Row Level Security, admin-only
-- ═══════════════════════════════════════════════════════════════════════════════

-- true only when the signed-in user's token carries app_metadata.role = 'admin'.
-- app_metadata can only be changed from SQL / with the service-role key, so users cannot
-- promote themselves (user_metadata, which they CAN edit, is deliberately ignored).
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
    'leads', 'chat_states', 'properties', 'training_data',
    'bot_settings', 'whatsapp_connection', 'qa_cache'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping missing table %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Remove EVERY earlier dashboard_* policy (e.g. the old "USING (true)" ones).
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND policyname LIKE 'dashboard\_%'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY dashboard_admin_all ON public.%I FOR ALL TO authenticated '
      'USING (public.is_dashboard_admin()) WITH CHECK (public.is_dashboard_admin())', t);

    -- Defence in depth: the public (anon) role gets no table privileges at all.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
--  VERIFY (run these separately after the script)
--
--  1) every table must show rowsecurity = true:
--       SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
--
--  2) exactly one policy per table, named dashboard_admin_all:
--       SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY 1;
--
--  3) from a terminal using ONLY the public anon key this must return [] or "permission denied"
--     (if it returns your data, the setup did not apply):
--       curl "https://<project-ref>.supabase.co/rest/v1/bot_settings?select=*" \
--            -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
-- ═══════════════════════════════════════════════════════════════════════════════
