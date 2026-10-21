# RESI D'ELITE — AI WhatsApp Concierge

**A production AI booking assistant for a premium vacation-rental brand — guests chat on WhatsApp, the AI recommends properties and captures leads, and the owner runs everything from a secure admin dashboard.**

![Status](https://img.shields.io/badge/status-in_production-2F4538?style=flat-square)
![Tests](https://img.shields.io/badge/tests-46_passing-00A651?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Security](https://img.shields.io/badge/security-hardened-blue?style=flat-square)

> This repository contains the **admin dashboard**. It works with the companion WhatsApp bot service (`resi-bot`), which runs against the same Supabase project — guests talk to the bot on WhatsApp, the dashboard gives the business owner full control.

## Contents

- [The 30-second version](#the-30-second-version)
- [How it works](#how-it-works)
- [The control room — dashboard tour](#the-control-room--dashboard-tour)
- [Built for production, not for demo](#built-for-production-not-for-demo)
- [Proof of craft](#proof-of-craft)
- [Tech stack](#tech-stack)
- [Run it yourself](#run-it-yourself)
- [Screenshots](#screenshots)
- [What this project demonstrates](#what-this-project-demonstrates)
- [Want this for your business?](#want-this-for-your-business)
- [Known limitations](#known-limitations)
- [License](#license)
- [Author](#author)

## The 30-second version

**Problem.** A vacation-rental brand was losing bookings: guest enquiries arrived on WhatsApp at all hours, replies were slow, and nobody tracked which conversations turned into reservations.

**Solution.** An AI concierge that lives inside WhatsApp. It greets guests, asks where they want to go, recommends properties from a live catalogue, collects dates and guest counts, captures the lead, and forwards a summary to the owner — 24/7, in the guest's own language.

**Outcome.** Every enquiry is answered in seconds, every lead is captured in a database with its full context, and the owner watches it all — leads, live chats, AI training, property catalogue, and the WhatsApp connection itself — from one dashboard.

## How it works

```
Guest on WhatsApp
      │  messages
      ▼
┌─────────────┐      reads/writes       ┌──────────────┐
│  AI bot      │ ◄────────────────────► │  Supabase    │
│  service     │   leads, chat state,   │  (PostgreSQL │
│  (resi-bot)  │   properties, training │   + Auth +   │
└─────────────┘   data, settings        │   RLS)       │
      ▲                                └──────────────┘
      │ commands (connect /              ▲
      │ disconnect / wipe)               │ admin-only
      │                                  │ reads/writes
┌─────────────┐                          │
│  Dashboard  │ ─────────────────────────┘
│  (this repo)│   overview, leads, chats, training,
└─────────────┘   properties, connection, settings
```

A guest's conversation follows a guided flow, and the owner can see exactly where every guest is in it:

`welcome → city → destination → guest count → recommend → collect dates → lead capture`

At any point the owner can **pause the AI for a single guest** (take over manually), flag a guest as **VIP**, or **resolve an escalation** — without touching code.

The AI itself runs on **Google Gemini and Groq (Llama 3.3)** with a configurable strategy: Gemini-only, Groq-only, or a **hybrid 3-way split** (33% Groq / 33% Gemini key 1 / 33% Gemini key 2) with a third Gemini key as fallback. An API health monitor in the dashboard shows each endpoint's live status and the last error it logged.

## The control room — dashboard tour

| Page | What the owner does there |
|------|---------------------------|
| **Overview** | Live business numbers: total/new leads with week-over-week trend, active chats, escalations, training queue, VIP guests — plus a 14-day leads chart, lead-status breakdown, top destinations, and per-step conversation-funnel progress |
| **Leads** | Search, filter, add, edit, and close every booking enquiry the bot captured — guest name, WhatsApp number, destination, dates, guest count, property of interest, language, visit history |
| **Conversations** | Every guest's live chat state: which flow step they're on, AI active/paused per guest, VIP flags, escalation resolution |
| **Training** | The AI's learning loop: review questions the bot couldn't answer, approve answers with **dual-admin approval** before they go live, mark policy violations, bulk-import Q&A pairs, manage a repeated-FAQ cache, and rotate AI API keys |
| **Properties** | The catalogue the bot recommends from — 20+ properties across Murree/Galyat, Islamabad, Lahore, and Istanbul — with pricing (PKR), guest limits, availability, and budget flags |
| **Connection** | Link the bot's WhatsApp number via **QR code** (drawn locally in the browser, never sent to a third party) or pairing code; disconnect or wipe the session remotely |
| **Settings** | AI provider keys, hybrid load-balancing modes, and the lead-forwarding WhatsApp number — every save re-verified against the admin's real login password |

## Built for production, not for demo

This dashboard went through a full **security hardening pass** before shipping. The fixes are in the code and covered by tests — not claims.

- **Real authorization, not UI hiding.** All 7 tables are protected by PostgreSQL Row Level Security: only tokens carrying `app_metadata.role = 'admin'` can read or write anything. The public anon key — which ships inside the JavaScript bundle — can read *nothing*. The old "any signed-in user gets everything" policies were explicitly hunted down and dropped, because one leftover permissive policy keeps the whole database open.
- **No secrets in the bundle.** API keys and the old hardcoded admin password were removed from the source and from every old deployment. Saving keys now requires re-entering your real login password, which is **verified server-side by Supabase** — never compared against text in the page.
- **The WhatsApp login QR never leaves the browser.** It used to be rendered by a third-party QR website — which meant that site received the exact code that links a device to the WhatsApp account. It is now drawn locally with the `qrcode` library (a test asserts no network call happens).
- **Injection-safe search.** Free-text search is sanitized before it becomes a database filter, so a crafted term can't add extra filter clauses.
- **Correct time, correct totals.** Database timestamps are UTC without an offset marker; the dashboard interprets them as UTC instead of local time (previously every time was off by hours). Overview totals page through the database's silent 1000-row cap instead of stopping at 1000.
- **No silent failures.** Every write reports its error — a rejected save, a failed pause, a duplicate property slug all surface instead of pretending they worked.
- **Hardened hosting.** Security headers (HSTS, frame denial, no-sniff, strict referrer policy), `noindex` so the private admin panel never lands in Google, lazy-loaded routes so the login screen doesn't wait on the charts library.

## Proof of craft

Small details that show how the code is written:

- **Race-safe data hooks** — a newer search response can never be overwritten by a slower older one.
- **Stable form components** — inputs are declared at module level so typing never loses focus mid-keystroke (a real bug that was fixed, with a regression test).
- **Pure, unit-tested statistics** — the overview math lives in a testable function, separate from the data fetching.
- **UTC handling, phone normalization, and search sanitization** each have dedicated unit tests.
- **46 automated tests** (Vitest + Testing Library, no network or real database needed) cover every page, the admin gate, the password re-check, QR rendering, error reporting, and the exact bugs listed above — the same tests were run against the pre-fix code and fail there.

## Tech stack

**Frontend** — React 18 · React Router 7 · Tailwind CSS 3 · Recharts · Lucide icons · Vite 6
**Backend & data** — Supabase (PostgreSQL, Auth, Row Level Security) — no separate server; the dashboard talks directly to the database
**AI** — Google Gemini · Groq (Llama 3.3) · hybrid load-balancing across providers and keys
**Quality** — Vitest + Testing Library (46 tests) · idempotent SQL migrations

## Run it yourself

Prerequisites: Node.js 20+, a Supabase project, and the bot service running against the same project.

```bash
git clone <this-repo>
cd <this-repo>
npm install

# 1. Supabase → SQL Editor → run supabase/setup.sql (tables, indexes, admin-only RLS — safe to re-run)
# 2. Create your login (Authentication → Users → Add user, tick "Auto Confirm User"),
#    then run supabase/make-admin.sql with your e-mail
# 3. Turn OFF "Allow new users to sign up" (Authentication → Sign In / Providers)

cp .env.example .env   # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev    # http://localhost:5173
npm test       # 46 automated tests
npm run build  # static output in dist/ — deploy to Vercel, Netlify, or Cloudflare Pages
```

To verify the security setup actually applied, query with only the public anon key — it must return `[]` or `permission denied`, never your data:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/bot_settings?select=*" \
     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
```

## Screenshots

<!--
  Add 3–4 real screenshots to docs/screenshots/ and uncomment this block.
  Good alt text helps both accessibility and search discovery.

## Dashboard

| Overview — live business numbers | Leads — every enquiry, searchable |
| --- | --- |
| ![Overview dashboard showing lead statistics, 14-day chart, and conversation funnel](docs/screenshots/overview.png) | ![Leads table with search, status filters, and booking details](docs/screenshots/leads.png) |

| AI training queue with dual approval | WhatsApp connection via local QR |
| --- | --- |
| ![Training queue showing pending questions and dual-admin approval buttons](docs/screenshots/training.png) | ![WhatsApp connection page with locally rendered QR code](docs/screenshots/connection.png) |
-->

## What this project demonstrates

For hiring managers and technical reviewers reading this as a portfolio piece — the skills this system required, end to end:

- **Full-stack product ownership** — a real business system, not a tutorial clone: bot service, database schema, admin dashboard, deployment.
- **Applied AI engineering** — multi-provider LLM integration (Gemini + Groq) with failover strategy, load balancing, health monitoring, and a human-in-the-loop training pipeline with dual approval.
- **Security-first thinking** — threat-modeled and hardened: database-enforced authorization, secret hygiene, server-verified sensitive actions, injection-safe queries.
- **Testing discipline** — 46 automated tests including regression tests that prove fixed bugs stay fixed.
- **Product sense** — every feature maps to a business need: lead capture, follow-ups, VIP handling, escalation, analytics the owner actually checks.
- **Clear technical communication** — this README, plus idempotent SQL with verification steps and an honest limitations section below.

## Want this for your business?

If you run a business that handles customers on WhatsApp — rentals, clinics, restaurants, real estate, services — I build AI assistants like this one: they answer enquiries instantly, capture leads with full context, follow up automatically, and give you a dashboard to watch and control everything.

**What you get:** the WhatsApp AI assistant, the admin dashboard, the database, deployment, and training so your team can manage it.

📧 **Email:** [heyhamza.dev@gmail.com](mailto:heyhamza.dev@gmail.com)
💬 **Instagram:** [@hc.ai.founder](https://www.instagram.com/hc.ai.founder) — DM "SOFTWARE" for pricing and a live demo
🌐 **Portfolio:** [hamzaportfolio-eight.vercel.app](https://hamzaportfolio-eight.vercel.app)

*Open to remote roles, freelance engagements, and project-based collaborations worldwide. Based in Pakistan (UTC+5).*

## Known limitations

- The dashboard does not auto-refresh lists; use the *Refresh* buttons (the WhatsApp status polls every 3 s while the tab is visible).
- Overview totals page through rows in batches of 1,000 (up to 20,000 per table) — fine for thousands of leads; very large datasets would want a database view instead.
- The *Repeated FAQ Cache* tab stays empty unless the bot's FAQ-cache feature is enabled.
- No Content-Security-Policy header yet — it must be tuned to your Supabase domain and tested in a real browser first.
- Admins can see API keys in the Settings page — only grant admin access to people who should have it.

## License

© 2026 Hamza Bhulla. This is production software built for RESI D'ELITE, shared here as portfolio work — all rights reserved. If you'd like a similar system built for your business, [get in touch](#want-this-for-your-business).

## Author

**Hamza Bhulla** — full-stack developer building AI-powered web products.
[GitHub](https://github.com/hamzabhulla) · [Portfolio](https://hamzaportfolio-eight.vercel.app) · [Email](mailto:heyhamza.dev@gmail.com) · [Instagram](https://www.instagram.com/hc.ai.founder)
