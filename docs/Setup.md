# Setup guide

Everything needed to run your own copy of the dashboard. For a short version, see the [README](../README.md).

## Requirements

- Node.js 20 or later (`node -v`)
- A Supabase project (the free tier is fine)
- The WhatsApp bot (`resi-bot`) running against the **same** Supabase project

## 1. Database setup

Open **Supabase → SQL Editor → New query** and run these files in this order:

| Order | File | Purpose |
| ---: | --- | --- |
| 1 | `supabase/setup.sql` | Creates any missing tables (the same structure the bot uses), indexes, and the two single-row tables, and turns on Row Level Security so that only dashboard admins can read or write anything |
| 2 | `supabase/make-admin.sql` | Marks your login as an admin. Edit the e-mail first, and run it again for every extra admin |

Notes:

- `setup.sql` is safe to re-run, and safe on a database the bot has already been using: it never deletes or changes existing rows.
- It also removes older "any signed-in user" policies. Policies are OR-ed together, so a single leftover permissive policy would keep the data open.
- The bot is not affected. It connects with the service-role key, which bypasses Row Level Security.

### Check that it worked

```sql
-- every table must show rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;

-- one policy per table, named dashboard_admin_all
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY 1;
```

Then, from a terminal using **only** the public anon key:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/bot_settings?select=*" \
     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
```

This must answer `[]` or `permission denied`. If it returns your API keys, the setup did not apply.

### Auth settings

- Under **Authentication → Sign In / Providers**, turn **off** "Allow new users to sign up", and create admins manually (**Users → Add user**, with *Auto Confirm User* ticked).
- The dashboard signs in with e-mail and password, so keep the Email provider enabled.

## 2. Configuration

```bash
cp .env.example .env
```

```ini
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both values are in **Supabase → Project Settings → API**. Use the anon (publishable) key. If either value is missing, the app shows a "Dashboard is not configured" screen instead of a blank page.

## 3. Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 46 tests, no network or database needed
```

## 4. Deploy

The app is a static site (`npm run build` produces `dist/`). `vercel.json` already contains the single-page-app rewrite and the security headers.

- **Vercel:** import the repository, choose the Vite preset, add the two `VITE_` variables, and deploy.
- **Netlify or Cloudflare Pages:** use the build command `npm run build` and the publish directory `dist`, add the same variables, add a rule that rewrites every path to `/index.html`, and copy the headers from `vercel.json` into your host's header settings.

Environment variables are read at build time, so redeploy after changing them. After the first deploy, delete any older deployments of the project in your hosting dashboard, because old builds can stay cached or served.

## 5. Everyday operations

| Task | How |
| --- | --- |
| Add an admin | Create the user in Supabase (**Authentication → Users**), then run `make-admin.sql` with their e-mail |
| Remove an admin | `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role' WHERE lower(email) = lower('x@example.com');` |
| Rotate an AI key | Rotate it with the provider, then paste the new one in **Settings** |
| Rotate the Supabase keys | **Project Settings → API**; update `VITE_SUPABASE_ANON_KEY` on the host and the bot's `.env`, then redeploy |

[Back to the README](../README.md)
