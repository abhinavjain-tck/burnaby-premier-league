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
pnpm test                    # reducer, money, auction engine and registration rules
TEST_DATABASE_URL=postgres://... pnpm test   # also run the auction DB tests (throwaway, migrated database only)
pnpm db:generate             # after editing lib/db/schema.ts
pnpm db:push                 # apply migrations to the linked Supabase project
```

The repo `.npmrc` pins the public npm registry so a global private-registry config does not get in the way.

Without env vars the app still runs: pages show a "Not configured yet" notice where they need the database or Supabase.

## Set up Supabase

Do this once, signed in with the league Google account.

1. **Create the project.** Pick the region closest to Vancouver (West US). Save the database password.
2. **Copy keys into `.env.local`.** Project settings → API: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Connect → Transaction pooler (port 6543): `DATABASE_URL`.
3. **Apply the database.** One command creates the schema, RLS policies, Season 4 seed rows and the storage buckets:
   ```bash
   npx supabase login && npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   Migrations live in `supabase/migrations`. Drizzle generates the schema ones (`pnpm db:generate` after editing `lib/db/schema.ts`, Supabase-style timestamped names); policies, seed and buckets are hand-written files in the same folder. Never run `drizzle-kit migrate`; the Supabase CLI owns applying them.
4. **League settings** (fee line and e-Transfer email) live in `seasons.config`, editable in the SQL editor until there is an admin form:
   ```sql
   update seasons set config = config || '{"fee_text": "$60 per player", "etransfer_email": "pay@example.com"}' where id = 1;
   ```
5. **Add admin emails.** `SUPER_ADMIN_EMAILS` covers the first sign-in; also insert them into `user_roles` (SQL editor) so `is_admin()` in RLS knows them.
6. **Buckets** `photos` (public) and `payment-proofs` (private) are created by the migration. Nothing to do.
7. **Turn on Google sign-in.** In Google Cloud, create an OAuth client (Web) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Authentication → Providers → Google.
8. **Allow our callback.** Authentication → URL Configuration: set Site URL to the production URL, and add these Redirect URLs:
   - `https://<your-domain>/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://*-<vercel-team>.vercel.app/auth/callback` (preview deploys)
9. **Set env vars in Vercel** (Project → Settings → Environment Variables), for Production and Preview: everything in `.env.example`. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.
10. **Check it.** `/` shows the placeholder title sponsor, `/register` saves a test player and lands on `/r/<token>`, and `/admin` signs you in and lists that player.

## Running an auction

1. `/admin/auctions` → New auction. Start with a **test** one: four made-up teams and a private board link.
2. On the auction page: add confirmed players (or 48 fake ones), shuffle within sets, pre-sell owners, and add the operator's email as an auction admin.
3. The operator opens `/auction/<id>/console` on their phone. Everyone else watches `/auction` (live) or the private link (test).
4. When the rehearsal looks right, create the **live** auction (one per season) and use "Promote config to live auction".
5. Export the events and lots CSV at each break. That's the backup.

Phones get each event over Supabase Realtime (`auction:<id>` channel) and fall back to polling every 5 s.

## Layout

```
app/                  routes: / (landing), /register, /r/[token], /admin, /admin/registrations, /auth/callback,
                      /admin/auctions, /auction (public board), /auction/t/[token] (test board),
                      /auction/[id]/console, /auction/[id]/owner
components/           sponsors/SponsorSlot, registration form and card, admin bits, auction screens
lib/money.ts          lakhs, crores, increment ladder, squad guard
lib/auction/          pure reducer, rules, undo/redo log and snapshots (shared with phones);
                      commands.ts runs a console command in one transaction, then broadcasts
lib/db/               Drizzle schema and lazy client
lib/supabase/         cookie-based server and browser clients
lib/auth/roles.ts     getViewer(), requireAdmin()
lib/registration/     form validation, edit tokens, queries
proxy.ts              refreshes the admin session cookie
supabase/             migrations, policies.sql (RLS), seed.sql
docs/                 design doc
```
