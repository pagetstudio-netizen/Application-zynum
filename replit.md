# ZyNum

ZyNum is a platform for purchasing virtual phone numbers to receive SMS verification codes for online services (Telegram, WhatsApp, Google, etc.). It targets West African users with FCFA pricing and integrates mobile money payment providers (Paxity, AshTechPay, SendavaPay).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/zynum run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `SUPABASE_DATABASE_URL` — Supabase Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL (Supabase) + Drizzle ORM
- Frontend: React 19, Vite, Tailwind CSS 4, Shadcn UI, Wouter
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for API), Vite (frontend)
- Email: Resend
- Payments: Paxity, AshTechPay, SendavaPay

## Where things live

- `artifacts/api-server/` — Express backend
  - `src/routes/` — API endpoints
  - `src/lib/fivesim.ts` — 5sim.net API integration (source of phone numbers)
  - `src/lib/initDb.ts` — Schema creation + seed data (runs on every start)
  - `dist/index.mjs` — Production build output
- `artifacts/zynum/` — React frontend
  - `dist/public/` — Production build output (served by API server in prod)
- `artifacts/app.js` — Plesk startup file (launches built API server)
- `lib/db/` — Drizzle schema + DB client
- `lib/api-spec/` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas

## Architecture decisions

- The API server serves the React frontend as static files in production (`NODE_ENV=production`). In development, Vite runs separately on port 5000 and proxies `/api` to port 8080.
- DB schema is managed via `initDb.ts` (idempotent `CREATE TABLE IF NOT EXISTS`) — no migration files needed.
- The 5sim API key is stored in the `admin_settings` DB table (not an env var), configurable from the admin dashboard.
- Built `dist/` files for `api-server` and `zynum` are committed to git so Plesk can deploy with "git pull + restart" — no build step needed on the server.
- Pricing: 5sim prices (USD) are converted to FCFA at a fixed rate with a configurable commission, with a minimum floor price.

## Product

- Virtual phone number marketplace with real-time 5sim.net integration
- Supports 180+ countries with localized FCFA pricing for West Africa
- Mobile money payments: Paxity (Orange, MTN, Wave, Moov…), AshTechPay, SendavaPay
- Affiliate/referral system with commission tracking and withdrawals
- Admin dashboard for settings, service overrides, user management, and Telegram daily reports

## Plesk Deployment

The built `dist/` files are committed to git. To deploy on Plesk:
1. Set startup file to: `app.js` (in application root `artifacts/`)
2. Set application root to: `artifacts/`
3. Configure env vars on Plesk: `SUPABASE_DATABASE_URL`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `ASHTECHPAY_API_KEY`, `SENDAVAPAY_SDK_KEY`, `SENDAVAPAY_WEBHOOK_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_FROM_EMAIL`, `NODE_ENV=production`
4. On code changes: push to GitHub → Plesk: git pull + restart

## User preferences

- Project targets French-speaking West African users (UI is in French)
- Keep dist files committed so Plesk deployment requires no build step

## Gotchas

- The forced update gate (`update-gate.tsx`) excludes `/admin` from blocking, so a misconfigured "required version" in the admin settings can never lock the admin out of the panel that controls it
- `SUPABASE_DATABASE_URL` must be set for the Plesk/production deployment — on Replit dev, the API server falls back to the Replit-provisioned `DATABASE_URL` (Postgres module) when `SUPABASE_DATABASE_URL` is unset
- `PORT` is required at runtime — `artifacts/app.js` defaults it to `3000` if unset
- The root `package.json` rejects non-pnpm installs — use `artifacts/package.json` and `node app.js` for Plesk
- After DB schema changes, restart the API server — `initDb.ts` runs the migrations on startup

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
