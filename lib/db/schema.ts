import { pgTable, pgEnum, uuid, text, integer, smallint, smallserial, boolean, timestamp, jsonb, char, bigserial, unique } from "drizzle-orm/pg-core";

export const regStatus = pgEnum("reg_status", ["registered", "confirmed", "withdrawn"]);
export const playerRole = pgEnum("player_role", ["batter", "bowler", "all_rounder", "wicket_keeper"]);
export const lotStatus = pgEnum("lot_status", ["queued", "on_block", "sold", "unsold", "skipped"]);
export const auctionStatus = pgEnum("auction_status", ["draft", "open", "paused", "completed"]);
export const auctionMode = pgEnum("auction_mode", ["test", "live"]);
export const appRole = pgEnum("app_role", ["admin", "super_admin"]);

export const seasons = pgTable("seasons", {
  id: smallserial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("registration"), // registration|locked|auction|live|done
  purseLakhs: integer("purse_lakhs").notNull().default(30000),
  config: jsonb("config").notNull().default({}),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: smallint("season_id").notNull().references(() => seasons.id),
  name: text("name").notNull(),
  short: char("short", { length: 3 }).notNull(),
  colour: text("colour").notNull(),
  logoUrl: text("logo_url"),
});

export const playerRegistrations = pgTable("player_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: smallint("season_id").notNull().references(() => seasons.id),
  editToken: text("edit_token").notNull().unique(), // private edit link, no login in S4
  status: regStatus("status").notNull().default("registered"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  role: playerRole("role"),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  tier: char("tier", { length: 1 }), // M|A|B|C, set by admin
  bio: text("bio"),
  stats: jsonb("stats").notNull().default({}),
  photoUrl: text("photo_url"),
  cricheroesUrl: text("cricheroes_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidMarkedBy: uuid("paid_marked_by"),
  paymentProofUrl: text("payment_proof_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.seasonId, t.phone)]);

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: smallint("season_id").notNull().references(() => seasons.id),
  name: text("name").notNull(),
  tier: text("tier").notNull(), // title|gold|silver|partner
  logoUrl: text("logo_url"),
  url: text("url"),
  placements: jsonb("placements").notNull().default([]), // ["hero","strip","reg_step","auction_lot"]
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userRoles = pgTable("user_roles", {
  email: text("email").primaryKey(), // allowlist; attaches to auth.users on first sign-in
  userId: uuid("user_id"),
  role: appRole("role").notNull(),
});

export const teamOwners = pgTable("team_owners", {
  teamId: uuid("team_id").notNull().references(() => teams.id),
  email: text("email").notNull(),
  userId: uuid("user_id"),
}, (t) => [unique().on(t.teamId, t.email)]);

// ---- auction cluster: isolated so test auctions never touch rosters ----

export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: smallint("season_id").notNull().references(() => seasons.id),
  name: text("name").notNull(),
  mode: auctionMode("mode").notNull().default("test"),
  status: auctionStatus("status").notNull().default("draft"),
  shareToken: text("share_token").notNull().unique(),
  version: integer("version").notNull().default(0),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auctionAdmins = pgTable("auction_admins", {
  auctionId: uuid("auction_id").notNull().references(() => auctions.id),
  email: text("email").notNull(),
}, (t) => [unique().on(t.auctionId, t.email)]);

export const auctionTeams = pgTable("auction_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id),
  teamId: uuid("team_id").references(() => teams.id), // null for fake teams in tests
  name: text("name").notNull(),
  short: char("short", { length: 3 }).notNull(),
  colour: text("colour").notNull(),
  purseStartLakhs: integer("purse_start_lakhs").notNull(),
  // projections, rebuilt from auction_events:
  purseLeftLakhs: integer("purse_left_lakhs").notNull(),
  squadSize: integer("squad_size").notNull().default(0),
});

export const auctionLots = pgTable("auction_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id),
  registrationId: uuid("registration_id").references(() => playerRegistrations.id), // null for fake players
  playerName: text("player_name").notNull(),
  role: playerRole("role"),
  tier: char("tier", { length: 1 }),
  photoUrl: text("photo_url"),
  card: jsonb("card").notNull().default({}), // snapshot of bio/stats/styles at auction time
  setName: text("set_name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  baseLakhs: integer("base_lakhs").notNull(),
  // projections:
  status: lotStatus("status").notNull().default("queued"),
  currentBidLakhs: integer("current_bid_lakhs"),
  currentTeamId: uuid("current_team_id"),
  soldToTeamId: uuid("sold_to_team_id"),
  priceLakhs: integer("price_lakhs"),
});

export const auctionEvents = pgTable("auction_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id),
  seq: integer("seq").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  undone: boolean("undone").notNull().default(false),
  idempotencyKey: text("idempotency_key"),
  actorEmail: text("actor_email").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow(),
}, (t) => [unique().on(t.auctionId, t.seq), unique().on(t.auctionId, t.idempotencyKey)]);
