/**
 * Runs against a real, throwaway Postgres. Skipped unless TEST_DATABASE_URL is set.
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55439/bpl pnpm test
 * The database needs supabase/migrations applied and at least one season with 4 teams (the seed).
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../db/client";
import { auctionAdmins, auctionEvents, auctionLots, auctions, auctionTeams, playerRegistrations } from "../db/schema";
import * as admin from "./admin";
import { AuctionRuleError, runCommand, VersionConflict } from "./commands";
import { DEFAULT_CONFIG, stepAt } from "./config";
import { stateFrom } from "./build";
import { findAuction, loadAll } from "./queries";
import { getSnapshot } from "./snapshot";
import type { Command, Snapshot } from "./types";

const url = process.env.TEST_DATABASE_URL;
const made: string[] = [];
const regs: string[] = [];
const broadcasts: Array<{ headers: Record<string, unknown>; body: unknown }> = [];
let server: Server;
let failBroadcast = false;
let n = 0;

async function send(id: string, cmd: Command, expectedVersion?: number, key?: string) {
  const version = expectedVersion ?? (await findAuction(getDb(), id))!.version;
  return runCommand(id, cmd, { expectedVersion: version, idempotencyKey: key ?? `k-test-${++n}-${Date.now()}`, actorEmail: "op@example.com" });
}

/** Projections in the DB must equal a fresh replay of the log. */
async function expectProjectionsMatchReplay(id: string) {
  const db = getDb();
  const row = (await findAuction(db, id))!;
  const loaded = await loadAll(db, row);
  const state = stateFrom(loaded.teams, loaded.lots, loaded.events);
  for (const t of loaded.teams) {
    expect({ purse: t.purseLeftLakhs, squad: t.squadSize }).toEqual({ purse: state.teams[t.id].purseLeft, squad: state.teams[t.id].squadSize });
  }
  for (const l of loaded.lots) {
    const s = state.lots[l.id];
    expect({ status: l.status, bid: l.currentBidLakhs, team: l.currentTeamId, soldTo: l.soldToTeamId, price: l.priceLakhs }).toEqual({
      status: s.status,
      bid: s.currentBid ?? null,
      team: s.currentTeamId ?? null,
      soldTo: s.soldTo ?? null,
      price: s.price ?? null,
    });
  }
  expect(row.status).toBe(state.status);
  expect(row.version).toBe(loaded.events.length ? Math.max(...loaded.events.map((e) => e.seq)) : 0);
}

describe.skipIf(!url)("auction commands against Postgres", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    server = createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        broadcasts.push({ headers: req.headers, body: JSON.parse(data || "null") });
        res.statusCode = failBroadcast ? 500 : 202;
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key-for-tests";
  });

  afterAll(async () => {
    const db = getDb();
    if (made.length) {
      await db.delete(auctionEvents).where(inArray(auctionEvents.auctionId, made));
      await db.delete(auctionLots).where(inArray(auctionLots.auctionId, made));
      await db.delete(auctionTeams).where(inArray(auctionTeams.auctionId, made));
      await db.delete(auctionAdmins).where(inArray(auctionAdmins.auctionId, made));
      await db.delete(auctions).where(inArray(auctions.id, made));
    }
    if (regs.length) await db.delete(playerRegistrations).where(inArray(playerRegistrations.id, regs));
    // Close the pool so vitest can exit. The Db type hides $client, but drizzle() sets it.
    await (db as unknown as { $client: { end(): Promise<void> } }).$client.end();
    await new Promise((r) => server.close(r));
  });

  let id = "";
  let snap: Snapshot;

  it("creates a test auction with 4 fake teams and 48 fake lots in set order", async () => {
    id = await admin.createAuction({ name: "DB test", mode: "test", config: DEFAULT_CONFIG });
    made.push(id);
    await admin.addFakePlayers(id, 48);
    snap = (await getSnapshot(id))!;
    expect(snap.teams).toHaveLength(4);
    expect(snap.lots).toHaveLength(48);
    expect(snap.lots.map((l) => l.order)).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
    expect(snap.lots[0].setName).toBe("Marquee");
    expect(snap.lots.filter((l) => l.setName === "Marquee").every((l) => l.base === 2000)).toBe(true);
    // seeding broadcasts a reload
    expect(broadcasts.at(-1)?.body).toMatchObject({ messages: [{ topic: `auction:${id}`, event: "event", payload: { reload: true } }] });
  });

  it("shuffle keeps every set in its own slots", async () => {
    const before = (await getSnapshot(id))!;
    await admin.shuffleSets(id);
    const after = (await getSnapshot(id))!;
    const slots = (s: Snapshot, set: string) => s.lots.filter((l) => l.setName === set).map((l) => l.order).sort((a, b) => a - b);
    for (const set of new Set(before.lots.map((l) => l.setName))) expect(slots(after, set)).toEqual(slots(before, set));
    expect(new Set(after.lots.map((l) => l.id))).toEqual(new Set(before.lots.map((l) => l.id)));
  });

  it("runs a lot: pre-sell, open, bid, sell; projections follow the log", async () => {
    snap = (await getSnapshot(id))!;
    const [a, b] = snap.teams;
    const [owner, first] = snap.lots;
    let r = await send(id, { type: "PRESOLD", lotId: owner.id, teamId: a.id, amount: 2500 });
    expect(r.snapshot.state.teams[a.id]).toMatchObject({ purseLeft: 27500, squadSize: 1 });
    await send(id, { type: "START" });
    await send(id, { type: "START_LOT", lotId: first.id });
    await send(id, { type: "BID", lotId: first.id, teamId: a.id, amount: first.base });
    r = await send(id, { type: "BID", lotId: first.id, teamId: b.id, amount: first.base + 100 });
    expect(r.snapshot.onBlock).toBe(first.id);
    r = await send(id, { type: "SOLD", lotId: first.id, teamId: b.id, amount: first.base + 100 });
    expect(r.snapshot.state.lots[first.id]).toMatchObject({ status: "sold", soldTo: b.id, price: first.base + 100 });
    expect(r.snapshot.auction.version).toBe(6);
    expect(r.snapshot.lastEvents[0]).toMatchObject({ seq: 6, type: "SOLD", actor: "op@example.com" });
    await expectProjectionsMatchReplay(id);

    const last = broadcasts.at(-1)!;
    expect(last.headers.apikey).toBe("service-key-for-tests");
    expect(last.headers.authorization).toBe("Bearer service-key-for-tests");
    expect(last.body).toMatchObject({ messages: [{ topic: `auction:${id}`, event: "event", payload: { version: 6, event: { seq: 6, type: "SOLD" } } }] });
    expect(JSON.stringify(last.body)).not.toContain("op@example.com"); // no emails on the public channel
  });

  it("rejects a stale version and changes nothing", async () => {
    const row = (await findAuction(getDb(), id))!;
    await expect(send(id, { type: "PAUSE" }, row.version - 1)).rejects.toBeInstanceOf(VersionConflict);
    expect((await findAuction(getDb(), id))!.version).toBe(row.version);
  });

  it("rejects illegal moves with AuctionRuleError and changes nothing", async () => {
    const s = (await getSnapshot(id))!;
    const sold = s.lots[1];
    await expect(send(id, { type: "START_LOT", lotId: sold.id })).rejects.toBeInstanceOf(AuctionRuleError);
    expect((await findAuction(getDb(), id))!.version).toBe(s.auction.version);
  });

  it("a retried idempotency key is a no-op even with a stale version", async () => {
    const s = (await getSnapshot(id))!;
    const next = s.lots[2];
    const first = await send(id, { type: "START_LOT", lotId: next.id }, s.auction.version, "k-retry-1");
    expect(first.duplicate).toBe(false);
    const retry = await send(id, { type: "START_LOT", lotId: next.id }, s.auction.version, "k-retry-1");
    expect(retry.duplicate).toBe(true);
    expect(retry.snapshot.auction.version).toBe(s.auction.version + 1);
    const rows = await getDb().select().from(auctionEvents).where(eq(auctionEvents.auctionId, id));
    expect(rows.filter((r) => r.idempotencyKey === "k-retry-1")).toHaveLength(1);
  });

  it("two operators racing: one wins, the other gets VersionConflict", async () => {
    const s = (await getSnapshot(id))!;
    const lot = s.onBlock!;
    const [a, b] = s.teams;
    const base = s.state.lots[lot].base;
    const results = await Promise.allSettled([
      send(id, { type: "BID", lotId: lot, teamId: a.id, amount: base }, s.auction.version),
      send(id, { type: "BID", lotId: lot, teamId: b.id, amount: base }, s.auction.version),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(lost.reason).toBeInstanceOf(VersionConflict);
    await expectProjectionsMatchReplay(id);
  });

  it("undo and redo flip flags, add markers and rebuild projections", async () => {
    const s = (await getSnapshot(id))!;
    const lot = s.onBlock!;
    const leader = s.state.lots[lot].currentTeamId!;
    const other = s.teams.find((t) => t.id !== leader)!;
    const current = s.state.lots[lot].currentBid!;
    const amount = current + stepAt(s.config, current);
    await send(id, { type: "BID", lotId: lot, teamId: other.id, amount });
    const sold = await send(id, { type: "SOLD", lotId: lot, teamId: other.id, amount });
    const purseAfterSale = sold.snapshot.state.teams[other.id].purseLeft;

    const u1 = await send(id, { type: "UNDO" });
    expect(u1.snapshot.state.lots[lot].status).toBe("on_block");
    expect(u1.snapshot.state.teams[other.id].purseLeft).toBe(purseAfterSale + amount);
    expect(u1.snapshot.redoSeq).toBe(sold.snapshot.auction.version);
    await expectProjectionsMatchReplay(id);
    // undo/redo tell phones to refetch rather than apply
    expect(broadcasts.at(-1)?.body).toMatchObject({ messages: [{ payload: { event: { type: "UNDO" } } }] });

    const r1 = await send(id, { type: "REDO" });
    expect(r1.snapshot.state.lots[lot].status).toBe("sold");
    expect(r1.snapshot.redoSeq).toBeNull();
    await expectProjectionsMatchReplay(id);

    await send(id, { type: "UNDO" });
    await send(id, { type: "BID", lotId: lot, teamId: leader, amount: amount + stepAt(s.config, amount) });
    await expect(send(id, { type: "REDO" })).rejects.toThrow("Nothing to redo");
    await expectProjectionsMatchReplay(id);
  });

  it("a broadcast failure never fails the command", async () => {
    failBroadcast = true;
    try {
      const r = await send(id, { type: "NOTE", text: "Tea break in 5" });
      expect(r.duplicate).toBe(false);
    } finally {
      failBroadcast = false;
    }
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1"; // nothing listens here
    try {
      await expect(send(id, { type: "NOTE", text: "Still works" })).resolves.toMatchObject({ duplicate: false });
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
    }
  });

  it("allows one live auction per season", async () => {
    const live = await admin.createAuction({ name: "Live", mode: "live", config: DEFAULT_CONFIG });
    made.push(live);
    await expect(admin.createAuction({ name: "Live 2", mode: "live", config: DEFAULT_CONFIG })).rejects.toThrow(/already has a live auction/);
    // the index is the real guard, not just the check in createAuction
    const row = (await findAuction(getDb(), live))!;
    await expect(
      getDb().insert(auctions).values({ seasonId: row.seasonId, name: "sneaky", mode: "live", shareToken: `x${Date.now()}`.padEnd(20, "x") }),
    ).rejects.toThrow();
    const liveSnap = (await getSnapshot(live))!;
    expect(liveSnap.teams.length).toBeGreaterThan(0);
  });

  it("copies confirmed players (card fields only) and promotes a rehearsal to live", async () => {
    const liveRow = (await getDb().select().from(auctions).where(inArray(auctions.id, made))).find((a) => a.mode === "live")!;
    const [reg] = await getDb()
      .insert(playerRegistrations)
      .values({
        seasonId: liveRow.seasonId,
        editToken: `t${Date.now()}`.padEnd(20, "t").slice(0, 20),
        status: "confirmed",
        fullName: "Test Player",
        phone: `+1604555${String(Date.now()).slice(-4)}`,
        email: "private@example.com",
        role: "all_rounder",
        tier: "A",
        bio: "Swings hard",
        stats: { matches: 10 },
      })
      .returning({ id: playerRegistrations.id });
    regs.push(reg.id);

    const rehearsal = await admin.createAuction({ name: "Rehearsal", mode: "test", config: { ...DEFAULT_CONFIG, purseLakhs: 25000 } });
    made.push(rehearsal);
    expect(await admin.addConfirmedPlayers(rehearsal)).toBeGreaterThanOrEqual(1);
    expect(await admin.addConfirmedPlayers(rehearsal)).toBe(0); // no duplicates
    expect(await admin.addConfirmedPlayers(liveRow.id)).toBeGreaterThanOrEqual(1);

    const lot = (await getDb().select().from(auctionLots).where(eq(auctionLots.registrationId, reg.id))).find((l) => l.auctionId === rehearsal)!;
    expect(lot).toMatchObject({ playerName: "Test Player", setName: "All-rounders", baseLakhs: 1000 });
    expect(JSON.stringify(lot.card)).not.toMatch(/private@example.com|\+1604/);

    const out = await admin.promoteToLive(rehearsal);
    expect(out.liveId).toBe(liveRow.id);
    expect(out.matched).toBeGreaterThanOrEqual(1);
    const promoted = (await getSnapshot(liveRow.id))!;
    expect(promoted.config.purseLakhs).toBe(25000);
    expect(promoted.teams.every((t) => t.purseStart === 25000)).toBe(true);
    expect(Object.values(promoted.state.teams).every((t) => t.purseLeft === 25000)).toBe(true);
    await expectProjectionsMatchReplay(liveRow.id);
  });
});
