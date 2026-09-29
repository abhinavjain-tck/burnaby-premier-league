import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../db/client";
import { auctions, seasons } from "../db/schema";
import { buildSnapshot } from "./build";
import { resolveConfig, type AuctionConfig } from "./config";
import { findAuction, loadAll, type AuctionRow, type Loaded } from "./queries";
import type { Snapshot } from "./types";

export type SnapshotOptions = {
  /** How many recent events to include. Board 10, console 20. */
  events?: number;
  /** Console only: include who pressed each button. Public boards never get emails. */
  withActor?: boolean;
};

/** Snapshot from rows already in hand (runCommand uses this inside its transaction). */
export const snapshotOf = (loaded: Loaded, opts: SnapshotOptions = {}): Snapshot =>
  buildSnapshot({
    auction: loaded.info,
    config: loaded.config,
    teams: loaded.teams,
    lots: loaded.lots,
    events: loaded.events,
    eventLimit: opts.events ?? 10,
    withActor: opts.withActor ?? false,
  });

/**
 * Everything a phone needs to draw the auction. Reads auction tables only:
 * lot cards were copied from registrations at seeding time, so there is no
 * join to player phone or email here. Returns null for an unknown id.
 */
export async function getSnapshot(auctionId: string, opts: SnapshotOptions = {}): Promise<Snapshot | null> {
  const db = getDb();
  const row = await findAuction(db, auctionId);
  if (!row) return null;
  return snapshotOf(await loadAll(db, row), opts);
}

/** The public variant: last 10 events, no emails. */
export const getPublicSnapshot = (auctionId: string) => getSnapshot(auctionId, { events: 10, withActor: false });

/** Live auction of the newest season that has one, or null. */
export async function findLiveAuction(): Promise<AuctionRow | null> {
  const [row] = await getDb()
    .select({ a: auctions })
    .from(auctions)
    .innerJoin(seasons, eq(seasons.id, auctions.seasonId))
    .where(eq(auctions.mode, "live"))
    .orderBy(desc(seasons.id))
    .limit(1);
  return row?.a ?? null;
}

/** Rules for the pre-auction page when no live auction exists yet: newest season's config over defaults. */
export async function latestSeasonConfig(): Promise<AuctionConfig> {
  const [s] = await getDb().select({ config: seasons.config }).from(seasons).orderBy(desc(seasons.id)).limit(1);
  return resolveConfig({}, s?.config);
}

/** Test auction by its share token. Never finds a live one. */
export async function findTestAuctionByToken(token: string): Promise<AuctionRow | null> {
  const [row] = await getDb()
    .select()
    .from(auctions)
    .where(and(eq(auctions.shareToken, token), ne(auctions.mode, "live")))
    .limit(1);
  return row ?? null;
}
