import { describe, it, expect } from "vitest";
import { apply, replay, AuctionRuleError, type AuctionState } from "./reducer";
import { crore, maxBid, stepFor, fmt } from "../money";

const base = (): AuctionState => ({
  version: 0, status: "open",
  teams: {
    STR: { id: "STR", name: "Strikers", purseLeft: crore(300), squadSize: 0 },
    KNG: { id: "KNG", name: "Kings", purseLeft: crore(300), squadSize: 0 },
  },
  lots: {
    L1: { id: "L1", playerName: "R. Sharma", base: crore(5), order: 1, status: "queued" },
  },
});

describe("auction reducer", () => {
  it("sells a lot and debits the purse", () => {
    let s = apply(base(), { type: "START_LOT", lotId: "L1" });
    s = apply(s, { type: "BID", lotId: "L1", teamId: "STR", amount: crore(5) });
    s = apply(s, { type: "BID", lotId: "L1", teamId: "KNG", amount: crore(6) });
    s = apply(s, { type: "SOLD", lotId: "L1", teamId: "KNG", amount: crore(6) });
    expect(s.teams.KNG.purseLeft).toBe(crore(294));
    expect(s.teams.KNG.squadSize).toBe(1);
    expect(s.lots.L1.status).toBe("sold");
    expect(s.onBlockLotId).toBeUndefined();
    expect(s.version).toBe(4);
  });

  it("rejects a bid that does not beat the current bid", () => {
    let s = apply(base(), { type: "START_LOT", lotId: "L1" });
    s = apply(s, { type: "BID", lotId: "L1", teamId: "STR", amount: crore(5) });
    expect(() => apply(s, { type: "BID", lotId: "L1", teamId: "KNG", amount: crore(5) })).toThrow(AuctionRuleError);
  });

  it("undo is just replay without the undone event", () => {
    const log = [
      { event: { type: "START_LOT", lotId: "L1" } as const, undone: false },
      { event: { type: "SOLD", lotId: "L1", teamId: "STR", amount: crore(20) } as const, undone: true },
    ];
    const s = replay(base(), log);
    expect(s.lots.L1.status).toBe("on_block");
    expect(s.teams.STR.purseLeft).toBe(crore(300));
  });
});

describe("money", () => {
  it("formats lakhs", () => {
    expect(fmt(50)).toBe("50 L");
    expect(fmt(crore(12.5))).toBe("12.5 cr");
    expect(fmt(crore(300))).toBe("300 cr");
  });
  it("walks the ladder", () => {
    expect(stepFor(crore(5))).toBe(50);
    expect(stepFor(crore(10))).toBe(crore(1));
    expect(stepFor(crore(120))).toBe(crore(5));
  });
  it("applies the squad guard", () => {
    // 100 cr left, 6 players, need 11, lowest base 2 cr → 4 more slots after this → 92 cr
    expect(maxBid(crore(100), 6, 11, crore(2))).toBe(crore(92));
  });
});
