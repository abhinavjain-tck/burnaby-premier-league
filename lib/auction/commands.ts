import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { auctionEvents, auctionLots, auctions, auctionTeams } from "../db/schema";
import { broadcast } from "./broadcast";
import { buildSnapshot, eventRow, stateFrom, type EventDbRow } from "./build";
import { admit, plan, projectionChanges } from "./engine";
import { withUndone } from "./log";
import { findAuction, loadAll, type Loaded, type Queryable } from "./queries";
import { AuctionRuleError, type AuctionState } from "./reducer";
import type { SnapshotOptions } from "./snapshot";
import type { Command, EventRow, LiveMessage, Snapshot } from "./types";

export { VersionConflict } from "./engine";
export { AuctionRuleError } from "./reducer";

export type RunOptions = {
  /** auctions.version the phone last saw. */
  expectedVersion: number;
  /** Made once per tap on the phone and reused on retries. */
  idempotencyKey: string;
  actorEmail: string;
  /** Shape of the snapshot handed back. */
  snapshot?: SnapshotOptions;
};

export type RunResult = { snapshot: Snapshot; duplicate: boolean; event: EventRow | null };

/** Write the projection columns that differ from `state`. */
async function writeProjections(q: Queryable, state: AuctionState, loaded: Loaded): Promise<void> {
  const changes = projectionChanges(
    state,
    loaded.teams.map((t) => ({ id: t.id, purseLeftLakhs: t.purseLeftLakhs, squadSize: t.squadSize, purseStartLakhs: t.purseStartLakhs })),
    loaded.lots.map((l) => ({
      id: l.id,
      status: l.status,
      currentBidLakhs: l.currentBidLakhs,
      currentTeamId: l.currentTeamId,
      soldToTeamId: l.soldToTeamId,
      priceLakhs: l.priceLakhs,
    })),
  );
  for (const { id, ...set } of changes.teams) await q.update(auctionTeams).set(set).where(eq(auctionTeams.id, id));
  for (const { id, ...set } of changes.lots) await q.update(auctionLots).set(set).where(eq(auctionLots.id, id));
}

/**
 * Run one console command. In a single transaction: lock the auction row,
 * treat a repeated idempotency key as a no-op, reject a stale expectedVersion
 * (VersionConflict), replay the log, check and apply the command
 * (AuctionRuleError on an illegal move), append the event at seq = version + 1,
 * and update the projections. Then broadcast to every phone.
 */
export async function runCommand(auctionId: string, cmd: Command, opts: RunOptions): Promise<RunResult> {
  const out = await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
    if (!row) throw new AuctionRuleError("Auction not found");

    const [seen] = await tx
      .select({ seq: auctionEvents.seq })
      .from(auctionEvents)
      .where(and(eq(auctionEvents.auctionId, auctionId), eq(auctionEvents.idempotencyKey, opts.idempotencyKey)))
      .limit(1);
    // Throws VersionConflict before we load anything.
    const decision = admit({ currentVersion: row.version, expectedVersion: opts.expectedVersion, duplicate: Boolean(seen) });
    const loaded = await loadAll(tx, row);
    if (decision === "duplicate") return { loaded, state: undefined, inserted: null };

    const p = plan({ teams: loaded.teams, lots: loaded.lots, events: loaded.events, config: loaded.config }, cmd);
    const seq = row.version + 1;
    const [ins] = await tx
      .insert(auctionEvents)
      .values({ auctionId, seq, type: p.row.type, payload: p.row.payload, idempotencyKey: opts.idempotencyKey, actorEmail: opts.actorEmail })
      .returning({ at: auctionEvents.at });
    if (p.flip) {
      await tx
        .update(auctionEvents)
        .set({ undone: p.flip.undone })
        .where(and(eq(auctionEvents.auctionId, auctionId), eq(auctionEvents.seq, p.flip.seq)));
    }
    await writeProjections(tx, p.next, loaded);
    await tx.update(auctions).set({ version: seq, status: p.next.status }).where(eq(auctions.id, auctionId));

    const inserted: EventDbRow = { seq, ...p.row, undone: false, at: ins?.at ?? new Date(), actorEmail: opts.actorEmail };
    const events = [...(p.flip ? withUndone(loaded.events, p.flip.seq, p.flip.undone) : loaded.events), inserted];
    const after: Loaded = { ...loaded, row: { ...row, version: seq, status: p.next.status }, info: { ...loaded.info, version: seq }, events };
    return { loaded: after, state: p.next, inserted };
  });

  const { loaded, state, inserted } = out;
  const snapshot = buildSnapshot({
    auction: loaded.info,
    config: loaded.config,
    teams: loaded.teams,
    lots: loaded.lots,
    events: loaded.events,
    state,
    eventLimit: opts.snapshot?.events ?? 20,
    withActor: opts.snapshot?.withActor ?? true,
  });

  // After commit. A retry that was a no-op still nudges phones that missed the first broadcast.
  const message: LiveMessage = { version: loaded.info.version, event: inserted ? eventRow(inserted, false) : null };
  await broadcast(auctionId, "event", message);

  return { snapshot, duplicate: !inserted, event: inserted ? eventRow(inserted, true) : null };
}

/**
 * Recompute projections and status from the log without adding an event.
 * For admin changes outside the log (purse start, seeding). Bumps nothing.
 */
export async function rebuildProjections(auctionId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
    if (!row) return;
    const loaded = await loadAll(tx, row);
    const state = stateFrom(loaded.teams, loaded.lots, loaded.events);
    await writeProjections(tx, state, loaded);
    if (row.status !== state.status) await tx.update(auctions).set({ status: state.status }).where(eq(auctions.id, auctionId));
  });
}

/** Tell phones to refetch everything (lots seeded or reordered). */
export async function broadcastReload(auctionId: string): Promise<void> {
  const row = await findAuction(getDb(), auctionId);
  if (row) await broadcast(auctionId, "event", { version: row.version, event: null, reload: true });
}
