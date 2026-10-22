# Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| **"Dashboard is not configured"** | `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing on the host. Add them and **redeploy**. |
| **"Invalid login credentials"** | Wrong e-mail or password, or the user was never created or confirmed (tick *Auto Confirm User*). |
| **"Access denied" after login** | The account isn't an admin yet. Run `make-admin.sql` for that exact e-mail, then press **Check again** (or sign out and in). |
| **Pages are empty, or a red "permission denied" box appears** | Row Level Security is blocking a non-admin session. See the row above. The message names the fix. |
| **Pages are empty right after a deploy, but the admin is set** | The browser holds an old token. Sign out and in once. |
| **Times look several hours off** | Database times are UTC and are converted to your browser's time zone. Hard-refresh to load a current build. |
| **The QR code doesn't appear** | The bot must be running and set to initialize the connection. The QR is drawn from the `whatsapp_connection` table, so check the bot's logs. |
| **Settings says "Incorrect password"** | Enter the password you **log in** with, not a separate security password. |
| **Changes to `.env` have no effect** | Vite reads `.env` at build or start time. Restart `npm run dev` or redeploy. |
| **The Training page's FAQ cache tab is empty** | It's optional and stays empty unless the bot's FAQ cache feature is enabled. |

[Back to the README](../README.md)
