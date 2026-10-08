# Is dashboard mein kya badla gaya

Ye aapka **asli** dashboard hai (`resi-dashboard-main`). Purane `dashboard` jaisa hi design hai, lekin neeche likhi security aur bugs ki cheezein theek ki gayi hain. Setup ke steps `README.md` mein hain.

## Sabse zaroori: pehle ye karein

| # | Kaam | Kyun |
|---|------|------|
| 1 | **Groq key, Gemini key aur Supabase keys rotate karein.** | Ye keys `Training.jsx` mein likhi thin aur deployed JS bundle (`dist`) mein bhi thin: jo bhi site kholta wo browser se nikal sakta tha. |
| 2 | **Wo admin password badal dein jo `Settings.jsx` mein likha tha** (agar kahin aur bhi use hota hai). | Wo password seedha source code mein tha, yani har visitor ke browser mein. |
| 3 | `supabase/setup.sql` Supabase SQL Editor mein chalayein, phir `supabase/make-admin.sql` (apna e-mail likh kar). | Warna database public rehta hai, ya dashboard "Access denied" dikhata hai. |
| 4 | Supabase mein **sign-ups OFF** karein. | Koi bhi account bana kar andar na aa sake. |
| 5 | Hosting par `VITE_SUPABASE_URL` aur `VITE_SUPABASE_ANON_KEY` set karke **dobara deploy** karein, aur purane deployments delete karein. | Purane bundle mein keys aur password the. |

## Security fixes

* **Password source code mein hardcoded tha** (`Settings.jsx` aur `Training.jsx`). Ab "Save" par aapka asli login password Supabase server se verify hota hai. Purana password ab kuch nahi karta.
* **API keys source code aur deployed bundle mein thin** (`Training.jsx` ka SQL helper). Hata di gayi.
* **WhatsApp login QR ek third-party website (`api.qrserver.com`) ko jata tha.** Wo QR hi bot ko WhatsApp se jodta hai, yani us site ke paas aapka account link karne ka raasta tha. Ab QR aapke browser mein hi banta hai (`qrcode` library).
* **Database RLS**: purani `rls.sql` sirf 4 tables cover karti thi (`bot_settings` aur `whatsapp_connection` open thin) aur har signed-in user ko poora access deti thi. Nayi `setup.sql` mein sab 7 tables admin-only hain, aur purani open policies khud hat jati hain.
* **Admin gate**: jo user admin nahi, use "Access denied" screen milti hai (asli rokna database karta hai, ye UI ka hissa hai).
* Search box se PostgREST filter mein cheezein ghusaayi ja sakti thin (`a,status.eq.closed`); ab sanitize hota hai.
* Root folder mein `Settings.jsx` aur `Training.jsx` ki purani nakal pari thi (keys ke saath, kahin import nahi hoti thi): delete. `dist/` (jis mein keys thin) bhi zip se nikaal diya.
* `.gitignore` (nahi tha: `dist/` aur `.env` git mein ja sakte the), `.env.example`, security headers (`vercel.json`), `noindex` (admin panel Google par na aaye).
* React Router ki 2 known vulnerabilities (React Router 7.18 par upgrade): `npm audit` ab 0.

## Bugs jo theek hue

* **Leads, Properties aur Conversations ke forms mein har character ke baad cursor nikal jata tha** (component har keystroke par dobara ban raha tha). Ab normal typing.
* **Conversations mein "Last Active" hamesha "—"** dikhata tha (page ek aisa column padh raha tha jo table mein hai hi nahi). Ab `last_activity`.
* **Sab waqt 5 ghante aage/peeche dikhte the** (database ka UTC time local samjha ja raha tha). Ab sahi.
* **Properties save fail hone par (jaise duplicate slug) form band ho jata tha jese save ho gaya ho.** Ab error dikhta hai. Isi tarah Leads, Conversations, Training aur WhatsApp ke buttons ki failure ab chup nahi rehti.
* **Overview ke totals 1000 par ruk jate the** (Supabase ek request mein 1000 rows se zyada nahi deta). Ab sab pages ke saath ginti hoti hai.
* **RLS ya network error par pages khali/zero dikhate the bina wajah ke**; ab laal box mein wajah aur hal likha aata hai.
* Search mein tez type karne par purana jawab naye ko overwrite kar sakta tha; theek.
* Leads ka count ab asli total dikhata hai ("Showing the latest 200 of 250").
* Training page ke kuch tabs/buttons purani dark theme ke ghalat rang use kar rahe the (active tab ki underline gayab, hover text safed par safed); theek.
* Chat ka "flow step" dropdown mein bot ka `city` step missing tha, save karne par step badal sakta tha.
* Brand forward number aur API keys ab trim/validate hote hain.
* Theme button upar-right ke buttons ke upar aa jata tha; ab sidebar mein.
* Missing `.env` par blank white page ke bajaye saaf "not configured" screen; render crash par "Something went wrong / Reload" screen.
* Pages ab on-demand load hote hain (pehla bundle aadha).

## Supabase (SQL)

* `supabase/setup.sql`: tables (bot jaisi hi structure) + indexes + RLS + admin-only policies. Dobara chalana safe, mojooda data nahi chhua jata.
* `supabase/make-admin.sql`: apne login ko admin banana.
* Purani `supabase/rls.sql` **delete** (wo har signed-in user ko poora access deti thi).

## Kaise check kiya

* **46 automated tests** (`npm test`). Jin tests ne bugs pakde, wo purane dashboard par chalaye: **6 mein se 6 fail** (cursor ka nikal jana, hardcoded password ka chal jana, QR ka third-party ko jana, "Last Active" khali, duplicate slug chup, ...), naye par sab pass. Teen baar chala kar stable dekha.
* **SQL asli PostgreSQL 16 par chalayi** (Supabase jese roles ke saath): fresh DB, aapke jaisa mojooda DB (RLS band, purani open policies, data), aur dobara run. Pehle: public key se `bot_settings` ki keys aur aam signed-in user se leads padhe ja sakte the. Baad mein: bot (service role) poora, `anon` permission denied, aam user ko 0 rows, `user_metadata` se khud ko admin banane wale ko 0 rows, asli admin poora access.
* **Naya build** saaf: purane `dist` mein Groq key, Gemini key, password aur `qrserver.com` the, naye mein koi nahi.
* `npm audit`: 0 vulnerabilities.

## Jo main test NAHI kar saka

* Asli browser mein click-through (sirf jsdom tests aur build). Design/rang aankh se nahi dekhe.
* Asli Supabase project, asli WhatsApp QR scan, asli deploy.
* CSS/layout ki baareekiyan: sirf wo hissa jo tests ne cover kiya.

## Jo abhi nahi kiya

* Content-Security-Policy header: aapke Supabase domain ke hisaab se tune karna parta hai aur browser mein test kiye baghair dashboard tod sakta hai.
* Admin ko Settings page mein API keys nazar aati hain (admin-only, lekin browser mein hoti hain). Sirf unhein admin banayein jin par bharosa ho.
* Lists auto-refresh nahi hoti (Refresh button).
* Training page ka "AI API Settings" tab aur Settings page, dono keys manage karte hain (duplicate); dono ab surakshit hain.
