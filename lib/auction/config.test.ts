import { describe, expect, it } from "vitest";
import { crore, stepFor } from "../money";
import {
  baseForTier,
  DEFAULT_CONFIG,
  ladderOf,
  lowestBase,
  maxBidFor,
  parseConfigJson,
  requeueBase,
  resolveConfig,
  stepAt,
} from "./config";
import { apply, type AuctionState } from "./reducer";
import { bidBlocker, bidOptions, checkCommand, nextBid, nextQueuedLot } from "./rules";

describe("config defaults", () => {
  it("matches the Season 4 rules", () => {
    const c = resolveConfig({});
    expect(c).toEqual(DEFAULT_CONFIG);
    expect(c.purseLakhs).toBe(30000);
    expect([c.minSquad, c.maxSquad]).toEqual([11, 13]);
    expect(c.basePrices).toEqual({ M: 2000, A: 1000, B: 500, C: 200 });
    expect(c.ownerPresoldLakhs).toBe(0);
    expect(c.unsoldBaseMultiplier).toBe(1);
    expect(c.ladder.at(-1)).toEqual({ upTo: null, step: 500 });
  });

  it("layers defaults ← season ← auction and ignores junk", () => {
    const c = resolveConfig(
      { purseLakhs: 25000, basePrices: { M: 3000 }, minSquad: "eleven" },
      { purseLakhs: 20000, maxSquad: 14, fee_text: "$60", basePrices: { C: 100 } },
    );
    expect(c.purseLakhs).toBe(25000);
    expect(c.maxSquad).toBe(14);
    expect(c.minSquad).toBe(11);
    expect(c.basePrices).toEqual({ M: 3000, A: 1000, B: 500, C: 100 });
  });

  it("never lets min squad exceed max squad", () => {
    const c = resolveConfig({ minSquad: 15, maxSquad: 12 });
    expect(c.minSquad).toBeLessThanOrEqual(c.maxSquad);
  });

  it("survives null, arrays and a bad ladder", () => {
    expect(resolveConfig(null, [])).toEqual(DEFAULT_CONFIG);
    expect(resolveConfig({ ladder: [{ upTo: 100, step: 5 }] }).ladder).toEqual(DEFAULT_CONFIG.ladder);
  });

  it("strict JSON parse reports the first problem", () => {
    expect(parseConfigJson("{")).toEqual({ ok: false, error: "Config is not valid JSON." });
    expect(parseConfigJson('{"minSquad": 14, "maxSquad": 12}')).toMatchObject({ ok: false });
    expect(parseConfigJson('{"purseLakhs": 12.5}')).toMatchObject({ ok: false, error: expect.stringContaining("purseLakhs") });
    const ok = parseConfigJson(JSON.stringify(DEFAULT_CONFIG));
    expect(ok).toEqual({ ok: true, config: DEFAULT_CONFIG });
  });

  it("maps tiers to base prices, unknown tier to C", () => {
    expect(baseForTier(DEFAULT_CONFIG, "M")).toBe(2000);
    expect(baseForTier(DEFAULT_CONFIG, "B")).toBe(500);
    expect(baseForTier(DEFAULT_CONFIG, null)).toBe(200);
    expect(lowestBase(DEFAULT_CONFIG)).toBe(200);
  });

  it("requeue base follows the multiplier and snaps to the step", () => {
    expect(requeueBase(DEFAULT_CONFIG, 500)).toBe(500);
    const half = { ...DEFAULT_CONFIG, unsoldBaseMultiplier: 0.5 };
    expect(requeueBase(half, 2000)).toBe(1000);
    expect(requeueBase(half, 500)).toBe(250);
    expect(requeueBase(half, 200)).toBe(100);
    expect(requeueBase({ ...DEFAULT_CONFIG, unsoldBaseMultiplier: 0.3 }, 200)).toBe(50); // 60 → nearest 50
  });
});

describe("step and max bid edges", () => {
  const ladder = ladderOf(DEFAULT_CONFIG);
  it("steps change exactly at the rung boundary", () => {
    expect(stepFor(crore(9.5), ladder)).toBe(50);
    expect(stepFor(crore(10), ladder)).toBe(100);
    expect(stepFor(crore(49), ladder)).toBe(100);
    expect(stepFor(crore(50), ladder)).toBe(250);
    expect(stepFor(crore(97.5), ladder)).toBe(250);
    expect(stepFor(crore(100), ladder)).toBe(500);
    expect(stepFor(crore(10000), ladder)).toBe(500);
  });

  it("custom ladders from config are honoured", () => {
    const config = { ...DEFAULT_CONFIG, ladder: [{ upTo: 1000, step: 25 }, { upTo: null, step: 200 }] };
    expect(stepAt(config, 999)).toBe(25);
    expect(stepAt(config, 1000)).toBe(200);
  });

  it("squad guard", () => {
    expect(maxBidFor(DEFAULT_CONFIG, { purseLeft: crore(100), squadSize: 6 })).toBe(crore(92));
    // at or past min squad the whole purse is available
    expect(maxBidFor(DEFAULT_CONFIG, { purseLeft: crore(40), squadSize: 10 })).toBe(crore(40));
    expect(maxBidFor(DEFAULT_CONFIG, { purseLeft: crore(40), squadSize: 12 })).toBe(crore(40));
    // never negative
    expect(maxBidFor(DEFAULT_CONFIG, { purseLeft: crore(5), squadSize: 0 })).toBe(0);
  });
});

describe("bid rules", () => {
  const open = (): AuctionState =>
    apply(
      {
        version: 0,
        status: "open",
        teams: {
          A: { id: "A", name: "A", purseLeft: crore(300), squadSize: 0 },
          B: { id: "B", name: "B", purseLeft: crore(24), squadSize: 0 },
          C: { id: "C", name: "C", purseLeft: crore(300), squadSize: 13 },
          D: { id: "D", name: "D", purseLeft: crore(300), squadSize: 0 },
        },
        lots: {
          L1: { id: "L1", playerName: "X", base: crore(5), order: 1, status: "queued" },
          L2: { id: "L2", playerName: "Y", base: crore(2), order: 2, status: "queued" },
        },
      },
      { type: "START_LOT", lotId: "L1" },
    );

  it("first +step is the base, then current + step", () => {
    let s = open();
    expect(nextBid(s, DEFAULT_CONFIG)).toBe(crore(5));
    s = apply(s, { type: "BID", lotId: "L1", teamId: "A", amount: crore(9.5) });
    expect(nextBid(s, DEFAULT_CONFIG)).toBe(crore(10));
  });

  it("custom bids must beat current and be a multiple of the step", () => {
    const s = apply(open(), { type: "BID", lotId: "L1", teamId: "A", amount: crore(10) });
    expect(bidBlocker(s, DEFAULT_CONFIG, "D", crore(10))).toMatch(/Must beat/);
    expect(bidBlocker(s, DEFAULT_CONFIG, "D", crore(10.5))).toMatch(/steps of 1 cr/);
    expect(bidBlocker(s, DEFAULT_CONFIG, "D", crore(12))).toBeNull();
    expect(bidBlocker(s, DEFAULT_CONFIG, "A", crore(12))).toBe("Already leading");
  });

  it("greys out teams over the guard or with a full squad", () => {
    // B: 24 cr left, 0 players → keeps 10 × 2 cr back → max 4 cr, below the 5 cr base
    const options = bidOptions(open(), DEFAULT_CONFIG, ["A", "B", "C"]);
    expect(options.map((o) => o.reason)).toEqual([null, "Max bid 4 cr", "Squad full (13)"]);
  });

  it("nothing is biddable when paused", () => {
    const paused = apply(open(), { type: "PAUSE" });
    expect(bidOptions(paused, DEFAULT_CONFIG, ["A"])[0].reason).toBe("Auction is paused");
    expect(() => checkCommand(paused, { type: "START_LOT", lotId: "L2" }, DEFAULT_CONFIG)).toThrow("Auction is paused");
  });

  it("SOLD must match the current bid; UNSOLD needs no bid", () => {
    const s = apply(open(), { type: "BID", lotId: "L1", teamId: "A", amount: crore(5) });
    expect(() => checkCommand(s, { type: "SOLD", lotId: "L1", teamId: "A", amount: crore(6) }, DEFAULT_CONFIG)).toThrow();
    expect(() => checkCommand(s, { type: "SOLD", lotId: "L1", teamId: "A", amount: crore(5) }, DEFAULT_CONFIG)).not.toThrow();
    expect(() => checkCommand(s, { type: "UNSOLD", lotId: "L1" }, DEFAULT_CONFIG)).toThrow(/There is a bid/);
    expect(() => checkCommand(open(), { type: "UNSOLD", lotId: "L1" }, DEFAULT_CONFIG)).not.toThrow();
  });

  it("finds the next queued lot in running order", () => {
    const s = open();
    expect(nextQueuedLot(s, ["L1", "L2"])).toBe("L2");
    expect(nextQueuedLot(s, ["L1"])).toBeNull();
  });
});
