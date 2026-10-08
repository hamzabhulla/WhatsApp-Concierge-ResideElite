# RESI D'ELITE — Admin Dashboard

Web dashboard for the RESI D'ELITE WhatsApp booking bot. Built with React 18, Vite, Tailwind and Supabase.
It lets the owner/admins:

| Page | What you do there |
|------|-------------------|
| **Overview** | Live numbers and charts: leads, status split, top destinations, conversation steps, WhatsApp link status |
| **Leads** | Search, filter, add, edit and close booking enquiries captured by the bot |
| **Conversations** | See every guest chat state, pause/resume the AI per guest, mark VIPs, resolve escalations |
| **Training** | Review the questions the bot could not answer, approve answers (dual approval), bulk-train, manage AI API keys |
| **Properties** | Manage the property catalogue the bot recommends from (availability, prices, guest limits) |
| **Connection** | Link the bot's WhatsApp number (QR code or pairing code), disconnect, wipe the session |
| **Settings** | AI provider and API keys, lead-forwarding number |

The dashboard talks **directly to your Supabase project**. There is no separate server.

---

## ⚡ Roman Urdu quick start (5 steps)

1. **Supabase → SQL Editor**: `supabase/setup.sql` ko poora paste karke **Run** karein (ye tables, indexes aur security lagata hai; dobara chalana bhi safe hai).
2. **Supabase → Authentication → Users → Add user** se apna e-mail + password banayein (*Auto Confirm User* tick karein). Phir `supabase/make-admin.sql` mein `you@example.com` ki jagah apna e-mail likh kar **Run** karein. Isi step se aap admin bante hain.
3. **Supabase → Authentication → Sign In / Providers → "Allow new users to sign up" OFF** karein.
4. Dashboard ki do values (**Project URL** aur **anon key**, Supabase → Project Settings → API) hosting par `VITE_SUPABASE_URL` aur `VITE_SUPABASE_ANON_KEY` ke naam se daalein (Vercel: Settings → Environment Variables), phir deploy karein.
5. Dashboard kholein, login karein. Agar **"Access denied"** aaye to step 2 dobara dekhein aur "Check again" dabayein.

> ⚠️ **Service-role / secret key kabhi dashboard mein na daalein.** Sirf *anon* key. `VITE_` se shuru hone wali har cheez har visitor ke browser mein download hoti hai.

---

## Requirements

* Node.js **20 or newer** (`node -v`)
* A Supabase project (free tier is fine)
* The WhatsApp bot (`resi-bot`) running against the **same** Supabase project

---

## 1. Database setup (Supabase)

Open **Supabase → SQL Editor → New query** and run these files **in this order**:

| Order | File | Purpose |
|------:|------|---------|
| 1 | `supabase/setup.sql` | Creates any missing tables (same structure the bot uses), indexes, seeds the two single-row tables, and turns on **Row Level Security** so that only dashboard admins can read or write anything. |
| 2 | `supabase/make-admin.sql` | Marks *your* login as an admin (edit the e-mail first). Run it again for every extra admin. |

Notes

* `setup.sql` is **safe to re-run** and safe on a database the bot has been using for months — it never deletes or changes existing rows.
* It also **removes older "any signed-in user" policies** (policies are OR-ed together, so a single leftover permissive policy would keep the data open).
* The **bot is not affected**: it connects with the service-role / secret key, which bypasses Row Level Security.
* If you previously ran the bot's `schema.sql` / `rls.sql`, you do **not** need them any more — `setup.sql` covers both.

### Check that it worked

```sql
-- every table must show rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
-- one policy per table, named dashboard_admin_all
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY 1;
```

and from a terminal, using **only** the public anon key (replace the placeholders):

```bash
curl "https://<project-ref>.supabase.co/rest/v1/bot_settings?select=*" \
     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
```

This must answer `[]` or `permission denied`. If it returns your API keys, the setup did not apply.

### Auth settings

* **Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".** Create admins manually (*Users → Add user*).
* The dashboard signs in with **e-mail + password**. Keep the *Email* provider enabled.

---

## 2. Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

```ini
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both values are in **Supabase → Project Settings → API**. Use the **anon / publishable** key.

If either value is missing the app shows a "Dashboard is not configured" screen instead of a blank page.

---

## 3. Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## 4. Deploy

The app is a static site (`npm run build` → `dist/`). `vercel.json` already contains the SPA rewrite and security headers.

**Vercel** — import the repo, framework preset *Vite*, add the two `VITE_…` environment variables, deploy.
**Netlify / Cloudflare Pages** — build command `npm run build`, publish directory `dist`, add the same variables, and add a rule that rewrites every path to `/index.html`. Copy the headers from `vercel.json` into your host's header settings.

Environment variables are read **at build time**: after changing them, redeploy.

After the first deploy, **delete any older deployments** of this project in your hosting dashboard — old builds can still be served and cached.

---

## Security model (how it protects your data)

* **Real protection is in the database.** Row Level Security allows only users whose token carries `app_metadata.role = "admin"`. That field can only be set from the Supabase SQL editor / service key, so a user cannot grant it to themselves. A normal signed-in user, or someone holding just the public anon key, sees nothing and can change nothing.
* The dashboard mirrors that rule in the browser and shows **Access denied** to non-admins. This is a convenience; the database is what enforces it.
* **Sensitive actions re-check your password.** Saving AI API keys / forwarding number asks for your *login* password and verifies it with Supabase (it is **not** stored or compared in the page's code).
* **The WhatsApp login QR is drawn in your browser** and is never sent to any third-party site.
* API keys you enter are stored in the `bot_settings` table (admin-only) and are read by the bot from there. Anyone who is an admin can see them in the Settings page — only make people admins who should have that access.
* Never put secrets in `VITE_*` variables: they are public by design.

### Everyday operations

| Task | How |
|------|-----|
| Add an admin | Create the user in Supabase (*Authentication → Users*), then run `make-admin.sql` with their e-mail |
| Remove an admin | `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role' WHERE lower(email) = lower('x@example.com');` |
| Rotate an AI key | Rotate it at Google/Groq, then paste the new one in **Settings** |
| Rotate the Supabase keys | Supabase → Project Settings → API; update `VITE_SUPABASE_ANON_KEY` on the host and the bot's `.env`, redeploy |

---

## Tests

```bash
npm test
```

46 automated tests (Vitest + Testing Library, no network or real database needed) covering: input focus in the edit forms, search-filter safety, timestamp handling, > 1000-row totals, the admin gate, password re-check, API-key saving, QR rendering, error reporting and every main page rendering.

## Project structure

```
src/
  App.jsx                routes, admin gate, lazy-loaded pages
  context/               AuthContext (session + isAdmin), ThemeContext
  hooks/useDashboardData.js   data hooks (errors, race-safe, paginated totals)
  lib/
    supabase.js          client + "is configured" flag
    auth.js              server-side password re-check
    utils.js             search sanitising, UTC timestamps, pagination, phone digits
    overviewStats.js     pure function behind the Overview numbers
  components/            Layout, Sidebar, WhatsAppConnect, QrCode, ErrorBoundary, ...
  pages/                 Overview, Leads, Conversations, Training, Properties, Connection, Settings, Login
supabase/
  setup.sql              tables + indexes + admin-only security   (run first)
  make-admin.sql         promote a login to admin                 (run second)
tests/                   unit + component tests
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| **"Dashboard is not configured"** | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing on the host. Add them and **redeploy**. |
| **Login says "Invalid login credentials"** | Wrong e-mail/password, or the user was never created / not confirmed (*Auto Confirm User*). |
| **"Access denied" after login** | The account is not an admin yet. Run `make-admin.sql` for that exact e-mail, then press **Check again** (or sign out and in). |
| **Pages are empty / red "permission denied" box** | Same as above — RLS is blocking a non-admin session. The message names the fix. |
| **Pages empty right after deploy, but admin is set** | The browser holds an old token. Sign out and sign in once. |
| **Overview numbers look 5 hours off** | Fixed: database times are UTC and are converted to your browser's timezone. Hard-refresh to load the new build. |
| **QR code does not appear** | The bot must be running and set to *Initialize Connection*. The QR is drawn from the `whatsapp_connection` table; check the bot logs. |
| **Settings "Incorrect password"** | Enter the password you **log in** with (not a separate security password). |
| **Changes to `.env` have no effect** | Vite reads `.env` at build/start time. Restart `npm run dev` or redeploy. |

## Known limitations

* The dashboard does not auto-refresh lists; use the *Refresh* buttons (the WhatsApp status polls every 3 s while the tab is visible).
* Overview totals read every row (in pages of 1,000, up to 20,000 per table) — fine for thousands of leads; for very large datasets a database view/function would be better.
* The *Repeated FAQ Cache* tab is optional and stays empty unless the bot's FAQ cache feature is enabled.
* No Content-Security-Policy header is set (it must be tuned to your Supabase domain and could not be browser-tested here).
