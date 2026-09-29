import "server-only";
import { and, asc, desc, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { getDb, isUniqueViolation } from "../db/client";
import { auctionAdmins, auctionLots, auctions, auctionTeams, playerRegistrations, seasons, teams } from "../db/schema";
import { broadcastReload, rebuildProjections } from "./commands";
import { baseForTier, resolveConfig, type AuctionConfig } from "./config";
import { FAKE_TEAMS, fakePlayers } from "./fake";
import { renumber, setNameFor, shuffleWithinSets } from "./lots";
import { findAuction, seasonConfig, type Queryable } from "./queries";
import { newShareToken } from "./share";
import type { AuctionMode, CardSnapshot } from "./types";

/** A problem the admin can fix. The message is shown as-is. */
export class AdminError extends Error {}

const NEW_LOT_ORDER = 1_000_000; // lands at the end of its set until renumbered

async function mustFind(q: Queryable, id: string) {
  const row = await findAuction(q, id);
  if (!row) throw new AdminError("Auction not found.");
  return row;
}

async function configFor(q: Queryable, row: { config: unknown; seasonId: number }): Promise<AuctionConfig> {
  return resolveConfig(row.config, await seasonConfig(q, row.seasonId));
}

/** Put every lot in set order, 1..n. Only rows whose number changes are written. */
async function renumberLots(q: Queryable, auctionId: string): Promise<void> {
  const lots = await q
    .select({ id: auctionLots.id, setName: auctionLots.setName, sortOrder: auctionLots.sortOrder })
    .from(auctionLots)
    .where(eq(auctionLots.auctionId, auctionId));
  const now = new Map(lots.map((l) => [l.id, l.sortOrder]));
  for (const { id, sortOrder } of renumber(lots)) {
    if (now.get(id) !== sortOrder) await q.update(auctionLots).set({ sortOrder }).where(eq(auctionLots.id, id));
  }
}

export type NewAuction = { name: string; mode: AuctionMode; config: AuctionConfig };

/** Create an auction with its teams: the season's real teams for live, four made-up ones for test. */
export async function createAuction(input: NewAuction): Promise<string> {
  const db = getDb();
  const [season] = await db.select({ id: seasons.id }).from(seasons).orderBy(desc(seasons.id)).limit(1);
  if (!season) throw new AdminError("Create a season first.");

  const real =
    input.mode === "live"
      ? await db.select().from(teams).where(eq(teams.seasonId, season.id)).orderBy(asc(teams.name))
      : [];
  if (input.mode === "live" && real.length === 0) throw new AdminError("This season has no teams yet. Add them before a live auction.");
  if (input.mode === "live") {
    const [existing] = await db
      .select({ id: auctions.id })
      .from(auctions)
      .where(and(eq(auctions.seasonId, season.id), eq(auctions.mode, "live")))
      .limit(1);
    if (existing) throw new AdminError("This season already has a live auction. Only one is allowed.");
  }

  const purse = input.config.purseLakhs;
  const teamRows =
    input.mode === "live"
      ? real.map((t) => ({ teamId: t.id, name: t.name, short: t.short, colour: t.colour }))
      : FAKE_TEAMS.map((t) => ({ teamId: null, name: t.name, short: t.short, colour: t.colour }));

  try {
    return await db.transaction(async (tx) => {
      const [a] = await tx
        .insert(auctions)
        .values({ seasonId: season.id, name: input.name, mode: input.mode, shareToken: newShareToken(), config: input.config })
        .returning({ id: auctions.id });
      await tx
        .insert(auctionTeams)
        .values(teamRows.map((t) => ({ ...t, auctionId: a.id, purseStartLakhs: purse, purseLeftLakhs: purse, squadSize: 0 })));
      return a.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AdminError("This season already has a live auction. Only one is allowed.");
    throw err;
  }
}

function requireDraft(row: { status: string }, what: string) {
  if (row.status !== "draft") throw new AdminError(`${what} only works before the auction opens.`);
}

/** Copy confirmed players into lots: public card fields only, base from tier. Skips players already added. */
export async function addConfirmedPlayers(auctionId: string): Promise<number> {
  const db = getDb();
  const added = await db.transaction(async (tx) => {
    const row = await mustFind(tx, auctionId);
    requireDraft(row, "Adding players");
    const config = await configFor(tx, row);
    const already = tx
      .select({ id: auctionLots.registrationId })
      .from(auctionLots)
      .where(and(eq(auctionLots.auctionId, auctionId), isNotNull(auctionLots.registrationId)));
    const players = await tx
      .select({
        id: playerRegistrations.id,
        fullName: playerRegistrations.fullName,
        role: playerRegistrations.role,
        tier: playerRegistrations.tier,
        photoUrl: playerRegistrations.photoUrl,
        battingStyle: playerRegistrations.battingStyle,
        bowlingStyle: playerRegistrations.bowlingStyle,
        bio: playerRegistrations.bio,
        stats: playerRegistrations.stats,
        cricheroesUrl: playerRegistrations.cricheroesUrl,
      })
      .from(playerRegistrations)
      .where(
        and(
          eq(playerRegistrations.seasonId, row.seasonId),
          eq(playerRegistrations.status, "confirmed"),
          notInArray(playerRegistrations.id, already),
        ),
      )
      .orderBy(asc(playerRegistrations.createdAt));
    if (players.length === 0) return 0;
    await tx.insert(auctionLots).values(
      players.map((p, i) => {
        const tier = p.tier?.trim() || null;
        const card: CardSnapshot = {
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
          bio: p.bio,
          stats: (p.stats ?? {}) as CardSnapshot["stats"],
          cricheroesUrl: p.cricheroesUrl,
        };
        return {
          auctionId,
          registrationId: p.id,
          playerName: p.fullName,
          role: p.role,
          tier,
          photoUrl: p.photoUrl,
          card,
          setName: setNameFor(tier, p.role),
          sortOrder: NEW_LOT_ORDER + i,
          baseLakhs: baseForTier(config, tier),
        };
      }),
    );
    await renumberLots(tx, auctionId);
    return players.length;
  });
  if (added > 0) await broadcastReload(auctionId);
  return added;
}

/** Made-up players for a test auction. Never touches registrations. */
export async function addFakePlayers(auctionId: string, n = 48): Promise<number> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const row = await mustFind(tx, auctionId);
    if (row.mode !== "test") throw new AdminError("Fake players are for test auctions only.");
    requireDraft(row, "Adding players");
    const config = await configFor(tx, row);
    await tx.insert(auctionLots).values(
      fakePlayers(n).map((p, i) => ({
        auctionId,
        registrationId: null,
        playerName: p.playerName,
        role: p.role,
        tier: p.tier,
        photoUrl: null,
        card: p.card,
        setName: setNameFor(p.tier, p.role),
        sortOrder: NEW_LOT_ORDER + i,
        baseLakhs: baseForTier(config, p.tier),
      })),
    );
    await renumberLots(tx, auctionId);
  });
  await broadcastReload(auctionId);
  return n;
}

/** Shuffle queued lots inside each set. Allowed before the auction and while paused (at the start of a set). */
export async function shuffleSets(auctionId: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const row = await mustFind(tx, auctionId);
    if (row.status !== "draft" && row.status !== "paused") throw new AdminError("Pause the auction before shuffling.");
    const lots = await tx
      .select({ id: auctionLots.id, setName: auctionLots.setName, sortOrder: auctionLots.sortOrder, status: auctionLots.status })
      .from(auctionLots)
      .where(eq(auctionLots.auctionId, auctionId));
    for (const { id, sortOrder } of shuffleWithinSets(lots)) {
      await tx.update(auctionLots).set({ sortOrder }).where(eq(auctionLots.id, id));
    }
  });
  await broadcastReload(auctionId);
}

/** Remove every lot from a draft test auction (start the rehearsal over). */
export async function clearTestLots(auctionId: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const row = await mustFind(tx, auctionId);
    if (row.mode !== "test") throw new AdminError("Only test auctions can be cleared.");
    if (row.version !== 0) throw new AdminError("This auction already has events. Create a new test auction instead.");
    await tx.delete(auctionLots).where(eq(auctionLots.auctionId, auctionId));
  });
  await broadcastReload(auctionId);
}

export async function addAuctionAdmin(auctionId: string, email: string): Promise<void> {
  await mustFind(getDb(), auctionId);
  await getDb().insert(auctionAdmins).values({ auctionId, email: email.trim().toLowerCase() }).onConflictDoNothing();
}

export async function removeAuctionAdmin(auctionId: string, email: string): Promise<void> {
  await getDb()
    .delete(auctionAdmins)
    .where(and(eq(auctionAdmins.auctionId, auctionId), eq(sql`lower(${auctionAdmins.email})`, email.trim().toLowerCase())));
}

export async function listAuctionAdmins(auctionId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ email: auctionAdmins.email })
    .from(auctionAdmins)
    .where(eq(auctionAdmins.auctionId, auctionId))
    .orderBy(asc(auctionAdmins.email));
  return rows.map((r) => r.email);
}

/** New private link for a test auction; the old one stops working. */
export async function rotateShareToken(auctionId: string): Promise<void> {
  const row = await mustFind(getDb(), auctionId);
  if (row.mode !== "test") throw new AdminError("Only test auctions have a private link.");
  await getDb().update(auctions).set({ shareToken: newShareToken() }).where(eq(auctions.id, auctionId));
}

/**
 * Copy a rehearsal's setup to the live auction of the same season: the config,
 * and the set and running order of every player both auctions share.
 * Live auction must not have opened yet.
 */
export async function promoteToLive(testId: string): Promise<{ liveId: string; matched: number }> {
  const db = getDb();
  const out = await db.transaction(async (tx) => {
    const test = await mustFind(tx, testId);
    if (test.mode !== "test") throw new AdminError("Promote works from a test auction.");
    const [live] = await tx
      .select()
      .from(auctions)
      .where(and(eq(auctions.seasonId, test.seasonId), eq(auctions.mode, "live")))
      .for("update");
    if (!live) throw new AdminError("Create the live auction first, then promote.");
    requireDraft(live, "Promoting");

    const config = await configFor(tx, test);
    await tx.update(auctions).set({ config }).where(eq(auctions.id, live.id));
    await tx
      .update(auctionTeams)
      .set({ purseStartLakhs: config.purseLakhs })
      .where(eq(auctionTeams.auctionId, live.id));

    const testLots = await tx
      .select({ registrationId: auctionLots.registrationId, setName: auctionLots.setName, sortOrder: auctionLots.sortOrder })
      .from(auctionLots)
      .where(and(eq(auctionLots.auctionId, testId), isNotNull(auctionLots.registrationId)));
    const plan = new Map(testLots.map((l) => [l.registrationId!, l]));
    const liveLots = await tx
      .select({ id: auctionLots.id, registrationId: auctionLots.registrationId, tier: auctionLots.tier })
      .from(auctionLots)
      .where(eq(auctionLots.auctionId, live.id));
    let matched = 0;
    for (const l of liveLots) {
      const from = l.registrationId ? plan.get(l.registrationId) : undefined;
      const base = baseForTier(config, l.tier?.trim());
      await tx
        .update(auctionLots)
        .set(from ? { setName: from.setName, sortOrder: from.sortOrder, baseLakhs: base } : { sortOrder: NEW_LOT_ORDER, baseLakhs: base })
        .where(eq(auctionLots.id, l.id));
      if (from) matched++;
    }
    await renumberLots(tx, live.id);
    return { liveId: live.id, matched };
  });
  await rebuildProjections(out.liveId); // purse start may have changed
  await broadcastReload(out.liveId);
  return out;
}

/** Auctions for the admin list, newest first. */
export async function listAuctions() {
  return getDb()
    .select({
      id: auctions.id,
      name: auctions.name,
      mode: auctions.mode,
      status: auctions.status,
      version: auctions.version,
      seasonId: auctions.seasonId,
      createdAt: auctions.createdAt,
      lots: sql<number>`(select count(*)::int from ${auctionLots} where ${auctionLots.auctionId} = ${auctions.id})`,
    })
    .from(auctions)
    .orderBy(desc(auctions.createdAt));
}
