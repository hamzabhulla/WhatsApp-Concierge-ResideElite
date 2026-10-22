# Security model

How the dashboard protects data, how to verify it, and what it does not cover.

## How data is protected

- **The database is the real protection.** Row Level Security allows only users whose token carries `app_metadata.role = "admin"`. That field can only be set from the Supabase SQL editor or with the service key, so a user cannot grant it to themselves. A normal signed-in user, or someone holding only the public anon key, can see nothing and change nothing.
- **The browser mirrors the rule.** The dashboard shows "Access denied" to non-admins. This is a convenience; the database enforces the rule.
- **`user_metadata` is ignored.** Users can edit their own `user_metadata`, so it is never used to decide access.
- **No table privileges for `anon`.** In addition to the policies, the public role has all privileges revoked on the dashboard tables.
- **Sensitive actions re-check your password.** Saving AI API keys or the forwarding number asks for your login password and verifies it with Supabase. The password isn't stored or compared in the page's code.
- **The WhatsApp login QR is drawn in your browser** and is never sent to a third-party site.
- **API keys** you enter are stored in the `bot_settings` table (admin-only) and are read by the bot from there. Any admin can see them on the Settings page, so only make people admins who should have that access.
- **Never put secrets in `VITE_` variables.** They are compiled into the JavaScript that every visitor downloads.

## Security headers

`vercel.json` sets these on every response:

| Header | Value |
| --- | --- |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Robots-Tag` | `noindex, nofollow` |

Built assets under `/assets/` are cached for a year (they have hashed file names). The page also carries a `noindex` meta tag so the admin panel stays out of search engines.

## Verifying it

Use the SQL checks and the `curl` test with only the anon key in the [setup guide](SETUP.md#check-that-it-worked). After any change to policies, repeat them.

## Keeping secrets safe

- If an API key, password, or service key was ever committed to the repository, **rotate it**. Deleting the file doesn't remove it from Git history.
- Keep `.env` out of version control (`.gitignore` already excludes `.env` and `.env.*`, except `.env.example`).
- After changing environment variables or keys, redeploy and remove old deployments.

## Known limits

- **No Content-Security-Policy header yet.** It has to be tuned to your Supabase domain and tested in a real browser before it is enabled.
- **Admins can read API keys** on the Settings page.
- **Third-party requests:** the page loads fonts (Inter, Fraunces) from Google Fonts, in addition to Supabase.
- **Development tooling:** `npm audit` currently reports advisories in build and test tools (Vite, Vitest, and the Tailwind toolchain). None are in the runtime dependencies, and upgrading them is planned.

[Back to the README](../README.md)
