import "server-only";
import { asc, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { auctionEvents, auctionLots, auctions, auctionTeams, seasons } from "../db/schema";
import type { EventDbRow, LotRow, TeamRow } from "./build";
import { resolveConfig, type AuctionConfig } from "./config";
import type { AuctionInfo } from "./types";

/** The Drizzle db or a transaction on it. */
export type Queryable = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

export type AuctionRow = typeof auctions.$inferSelect;

export type TeamFull = TeamRow & { purseLeftLakhs: number; squadSize: number; teamId: string | null };
export type LotFull = LotRow & {
  registrationId: string | null;
  status: (typeof auctionLots.$inferSelect)["status"];
  currentBidLakhs: number | null;
  currentTeamId: string | null;
  soldToTeamId: string | null;
  priceLakhs: number | null;
};

export type Loaded = {
  row: AuctionRow;
  info: AuctionInfo;
  config: AuctionConfig;
  teams: TeamFull[];
  lots: LotFull[];
  events: EventDbRow[];
};

export const infoOf = (row: AuctionRow): AuctionInfo => ({
  id: row.id,
  name: row.name,
  mode: row.mode,
  seasonId: row.seasonId,
  version: row.version,
});

export async function loadTeams(q: Queryable, auctionId: string): Promise<TeamFull[]> {
  return q
    .select({
      id: auctionTeams.id,
      teamId: auctionTeams.teamId,
      name: auctionTeams.name,
      short: auctionTeams.short,
      colour: auctionTeams.colour,
      purseStartLakhs: auctionTeams.purseStartLakhs,
      purseLeftLakhs: auctionTeams.purseLeftLakhs,
      squadSize: auctionTeams.squadSize,
    })
    .from(auctionTeams)
    .where(eq(auctionTeams.auctionId, auctionId))
    .orderBy(asc(auctionTeams.name));
}

export async function loadLots(q: Queryable, auctionId: string): Promise<LotFull[]> {
  return q
    .select({
      id: auctionLots.id,
      registrationId: auctionLots.registrationId,
      playerName: auctionLots.playerName,
      role: auctionLots.role,
      tier: auctionLots.tier,
      photoUrl: auctionLots.photoUrl,
      card: auctionLots.card,
      setName: auctionLots.setName,
      sortOrder: auctionLots.sortOrder,
      baseLakhs: auctionLots.baseLakhs,
      status: auctionLots.status,
      currentBidLakhs: auctionLots.currentBidLakhs,
      currentTeamId: auctionLots.currentTeamId,
      soldToTeamId: auctionLots.soldToTeamId,
      priceLakhs: auctionLots.priceLakhs,
    })
    .from(auctionLots)
    .where(eq(auctionLots.auctionId, auctionId))
    .orderBy(asc(auctionLots.sortOrder));
}

export async function loadEvents(q: Queryable, auctionId: string): Promise<EventDbRow[]> {
  return q
    .select({
      seq: auctionEvents.seq,
      type: auctionEvents.type,
      payload: auctionEvents.payload,
      undone: auctionEvents.undone,
      at: auctionEvents.at,
      actorEmail: auctionEvents.actorEmail,
    })
    .from(auctionEvents)
    .where(eq(auctionEvents.auctionId, auctionId))
    .orderBy(asc(auctionEvents.seq));
}

export async function seasonConfig(q: Queryable, seasonId: number): Promise<unknown> {
  const [s] = await q.select({ config: seasons.config }).from(seasons).where(eq(seasons.id, seasonId)).limit(1);
  return s?.config ?? {};
}

/** Everything about one auction. `row` must already be loaded (locked, inside a command). */
export async function loadAll(q: Queryable, row: AuctionRow): Promise<Loaded> {
  const [season, teams, lots, events] = await Promise.all([
    seasonConfig(q, row.seasonId),
    loadTeams(q, row.id),
    loadLots(q, row.id),
    loadEvents(q, row.id),
  ]);
  return { row, info: infoOf(row), config: resolveConfig(row.config, season), teams, lots, events };
}

export async function findAuction(q: Queryable, auctionId: string): Promise<AuctionRow | null> {
  const [row] = await q.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  return row ?? null;
}
