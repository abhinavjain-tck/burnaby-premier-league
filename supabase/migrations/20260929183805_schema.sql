CREATE TYPE "public"."app_role" AS ENUM('admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."auction_mode" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."auction_status" AS ENUM('draft', 'open', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('queued', 'on_block', 'sold', 'unsold', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."player_role" AS ENUM('batter', 'bowler', 'all_rounder', 'wicket_keeper');--> statement-breakpoint
CREATE TYPE "public"."reg_status" AS ENUM('registered', 'confirmed', 'withdrawn');--> statement-breakpoint
CREATE TABLE "auction_admins" (
	"auction_id" uuid NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "auction_admins_auction_id_email_unique" UNIQUE("auction_id","email")
);
--> statement-breakpoint
CREATE TABLE "auction_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"undone" boolean DEFAULT false NOT NULL,
	"idempotency_key" text,
	"actor_email" text NOT NULL,
	"at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auction_events_auction_id_seq_unique" UNIQUE("auction_id","seq"),
	CONSTRAINT "auction_events_auction_id_idempotency_key_unique" UNIQUE("auction_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "auction_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"registration_id" uuid,
	"player_name" text NOT NULL,
	"role" "player_role",
	"tier" char(1),
	"photo_url" text,
	"card" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"set_name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"base_lakhs" integer NOT NULL,
	"status" "lot_status" DEFAULT 'queued' NOT NULL,
	"current_bid_lakhs" integer,
	"current_team_id" uuid,
	"sold_to_team_id" uuid,
	"price_lakhs" integer
);
--> statement-breakpoint
CREATE TABLE "auction_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"team_id" uuid,
	"name" text NOT NULL,
	"short" char(3) NOT NULL,
	"colour" text NOT NULL,
	"purse_start_lakhs" integer NOT NULL,
	"purse_left_lakhs" integer NOT NULL,
	"squad_size" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" smallint NOT NULL,
	"name" text NOT NULL,
	"mode" "auction_mode" DEFAULT 'test' NOT NULL,
	"status" "auction_status" DEFAULT 'draft' NOT NULL,
	"share_token" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auctions_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "player_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" smallint NOT NULL,
	"edit_token" text NOT NULL,
	"status" "reg_status" DEFAULT 'registered' NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"role" "player_role",
	"batting_style" text,
	"bowling_style" text,
	"tier" char(1),
	"bio" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"photo_url" text,
	"cricheroes_url" text,
	"paid_at" timestamp with time zone,
	"paid_marked_by" text,
	"payment_proof_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "player_registrations_edit_token_unique" UNIQUE("edit_token"),
	CONSTRAINT "player_registrations_season_id_phone_unique" UNIQUE("season_id","phone")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'registration' NOT NULL,
	"purse_lakhs" integer DEFAULT 30000 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" smallint NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"logo_url" text,
	"url" text,
	"placements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_owners" (
	"team_id" uuid NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	CONSTRAINT "team_owners_team_id_email_unique" UNIQUE("team_id","email")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" smallint NOT NULL,
	"name" text NOT NULL,
	"short" char(3) NOT NULL,
	"colour" text NOT NULL,
	"logo_url" text
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"email" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"role" "app_role" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auction_admins" ADD CONSTRAINT "auction_admins_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_lots" ADD CONSTRAINT "auction_lots_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_lots" ADD CONSTRAINT "auction_lots_registration_id_player_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."player_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_teams" ADD CONSTRAINT "auction_teams_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_teams" ADD CONSTRAINT "auction_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_registrations" ADD CONSTRAINT "player_registrations_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_owners" ADD CONSTRAINT "team_owners_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;