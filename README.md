# Burnaby Premier League

Phone-first site for the Burnaby Premier League (Vancouver, BC): player registration, sponsors, and a live IPL-style player auction with a full undo log.

**Design doc:** [docs/design.html](docs/design.html) (open it in a browser). It covers the stack decision, data model, registration flow, sponsor placements, auction rules and formats, realtime, security, and the day-by-day plan.

## Stack

- Next.js (App Router, Server Components, Server Actions), Tailwind, shadcn/ui
- Supabase: Postgres, Auth (admins and owners only), Storage (photos), Realtime (auction board)
- Drizzle ORM for schema and migrations
- Vercel for hosting

## Season 4 scope (auction Sunday 4 Oct 2026)

- Players register through a public form and get a private edit link. No player login this season.
- Admins, the auctioneer and the 4 team owners sign in with Google against an allowlist.
- Auction runs on the ground: auctioneer calls bids by voice, an operator records them on a phone, every other phone shows the board.
- Money is stored as integer **lakhs** (`300 cr` purse = `30000`). See `lib/money.ts`.
- Every auction action is an immutable `auction_events` row. State is a replay. Undo flags a row; it never deletes. See `lib/auction/reducer.ts`.

## Getting started

```bash
cp .env.example .env.local   # fill from the Supabase dashboard
pnpm install
pnpm dev
pnpm test                    # reducer + money rules
pnpm drizzle-kit generate    # after editing lib/db/schema.ts
pnpm drizzle-kit migrate
```

The repo `.npmrc` pins the public npm registry so a global private-registry config does not get in the way.

Without env vars the app still runs: pages show a "Not configured yet" notice where they need the database or Supabase.

## Set up Supabase

Do this once, signed in with the league Google account.

1. **Create the project.** Pick the region closest to Vancouver (West US). Save the database password.
2. **Copy keys into `.env.local`.** Project settings → API: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Connect → Transaction pooler (port 6543): `DATABASE_URL`.
3. **Run migrations.** Use the Session pooler URL (port 5432) for this one command; the transaction pooler doesn't like DDL:
   ```bash
   DATABASE_URL="<session pooler url>" pnpm drizzle-kit migrate
   ```
4. **Run `supabase/policies.sql`, then `supabase/seed.sql`** in the SQL editor (or `psql "$DATABASE_URL" -f ...`). Both are safe to re-run. Add your admin emails to `user_roles` (see the end of `seed.sql`).
5. **Create storage buckets** (Storage → New bucket):
   - `photos`: **public**. File size limit 5 MB, allowed types `image/webp, image/jpeg, image/png`.
   - `payment-proofs`: **private**. Same limits. Admins view files through 10-minute signed links.
6. **Turn on Google sign-in.** In Google Cloud, create an OAuth client (Web) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Authentication → Providers → Google.
7. **Allow our callback.** Authentication → URL Configuration: set Site URL to the production URL, and add these Redirect URLs:
   - `https://<your-domain>/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://*-<vercel-team>.vercel.app/auth/callback` (preview deploys)
8. **Set env vars in Vercel** (Project → Settings → Environment Variables), for Production and Preview: everything in `.env.example`. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.
9. **Check it.** `/` shows the placeholder title sponsor, `/register` saves a test player and lands on `/r/<token>`, and `/admin` signs you in and lists that player.

## Layout

```
app/                  routes: / (landing), /register, /r/[token], /admin, /admin/registrations, /auth/callback
components/           sponsors/SponsorSlot, registration form and card, admin bits
lib/money.ts          lakhs, crores, increment ladder, squad guard
lib/auction/          pure reducer + tests, shared by server and phones
lib/db/               Drizzle schema and lazy client
lib/supabase/         cookie-based server and browser clients
lib/auth/roles.ts     getViewer(), requireAdmin()
lib/registration/     form validation, edit tokens, queries
proxy.ts              refreshes the admin session cookie
supabase/             migrations, policies.sql (RLS), seed.sql
docs/                 design doc
```
