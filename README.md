# Party App (Next.js + Supabase) — pnpm scaffold

This is a minimal runnable starter for your party scoreboard + admin panel.
It uses Next.js (App Router) and Supabase for database/auth/realtime.

## Quick start (macOS / Linux)

1. Install Node 18+ (use nvm recommended)
2. Install pnpm:
   ```
   npm i -g pnpm
   ```
3. Copy `.env.example` to `web/.env.local` and fill values (Supabase project)
4. Install deps:
   ```
   pnpm install
   ```
5. Run dev:
   ```
   pnpm dev
   ```
6. Open http://localhost:3000

Supabase SQL schema is in `supabase/schema.sql`.

For production, deploy the `web` folder to Vercel and use Supabase Cloud for the DB and Auth.

