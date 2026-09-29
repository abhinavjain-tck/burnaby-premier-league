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

## Layout

```
app/            routes: (public) (admin) (auction)
lib/money.ts    lakhs, crores, increment ladder, squad guard
lib/auction/    pure reducer + tests, shared by server and phones
lib/db/         Drizzle schema
supabase/       migrations, RLS policies
docs/           design doc
```
