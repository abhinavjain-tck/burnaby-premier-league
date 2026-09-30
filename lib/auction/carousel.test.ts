import { describe, expect, it } from "vitest";
import { buildSnapshot, type EventDbRow, type LotRow, type TeamRow } from "./build";
import { nextLots, previousResults } from "./carousel";
import { DEFAULT_CONFIG } from "./config";
import { nextQueuedLot } from "./rules";
import type { Snapshot } from "./types";

const teams: TeamRow[] = [
  { id: "T1", name: "Strikers", short: "STR", colour: "#1d4ed8", purseStartLakhs: 30000 },
  { id: "T2", name: "Kings", short: "KNG", colour: "#b91c1c", purseStartLakhs: 30000 },
];
const lot = (id: string, sortOrder: number): LotRow => ({
  id,
  playerName: `Player ${id}`,
  role: "batter",
  tier: "B",
  photoUrl: null,
  card: {},
  setName: "Batters",
  sortOrder,
  baseLakhs: 500,
});
// Sort order is not id order, so the tests prove we follow sort order.
const lots: LotRow[] = [lot("L1", 1), lot("L2", 2), lot("L3", 3), lot("L4", 4), lot("L5", 6), lot("L6", 5), lot("CAP", 7)];

type Ev = [type: string, payload?: Record<string, unknown>, undone?: boolean];

function snap(evs: Ev[], eventLimit = 10): Snapshot {
  const events: EventDbRow[] = evs.map(([type, payload = {}, undone = false], i) => ({
    seq: i + 1,
    type,
    payload,
    undone,
    at: null,
    actorEmail: "op@x.com",
  }));
  return buildSnapshot({
    auction: { id: "A", name: "Test", mode: "test", seasonId: 1, version: events.length },
    config: DEFAULT_CONFIG,
    teams,
    lots,
    events,
    eventLimit,
  });
}

const sell = (lotId: string, teamId: string, amount: number): Ev[] => [
  ["START_LOT", { lotId }],
  ["BID", { lotId, teamId, amount }],
  ["SOLD", { lotId, teamId, amount }],
];
const unsell = (lotId: string): Ev[] => [["START_LOT", { lotId }], ["UNSOLD", { lotId }]];
const ids = (s: Snapshot, n?: number) => previousResults(s, n).map((r) => `${r.lot.id}:${r.outcome}`);

describe("previousResults", () => {
  it("is empty before anything finishes", () => {
    expect(previousResults(snap([["START"], ["START_LOT", { lotId: "L1" }]]))).toEqual([]);
  });

  it("lists sold and unsold lots newest first, with team and price from the state", () => {
    const s = snap([["START"], ...sell("L1", "T1", 700), ...unsell("L2"), ...sell("L3", "T2", 900)]);
    expect(ids(s)).toEqual(["L3:sold", "L2:unsold", "L1:sold"]);
    const [last] = previousResults(s);
    expect(last).toMatchObject({ outcome: "sold", teamId: "T2", price: 900 });
  });

  it("ignores undone results and skipped lots", () => {
    const s = snap([
      ["START"],
      ...sell("L1", "T1", 700),
      ["START_LOT", { lotId: "L2" }],
      ["SOLD", { lotId: "L2", teamId: "T1", amount: 500 }, true], // undone
      ["SKIP", { lotId: "L2" }],
    ]);
    expect(ids(s)).toEqual(["L1:sold"]);
  });

  it("drops a lot that went back in the pool", () => {
    const s = snap([["START"], ...sell("L1", "T1", 700), ...unsell("L2"), ["REQUEUE", { lotId: "L2" }]]);
    expect(ids(s)).toEqual(["L1:sold"]);
  });

  it("leaves out pre-sold captains", () => {
    const s = snap([["PRESOLD", { lotId: "CAP", teamId: "T1", amount: 2500 }], ["START"], ...sell("L1", "T2", 600)]);
    expect(ids(s)).toEqual(["L1:sold"]);
  });

  it("still finds older sales in sale order when lots of bids push them out of lastEvents", () => {
    const bids: Ev[] = Array.from({ length: 12 }, (_, i) => ["BID", { lotId: "L4", teamId: i % 2 ? "T1" : "T2", amount: 500 + i * 50 }]);
    const s = snap([["START"], ...sell("L1", "T1", 700), ...sell("L2", "T2", 800), ["START_LOT", { lotId: "L4" }], ...bids], 10);
    expect(s.lastEvents.some((e) => e.type === "SOLD")).toBe(false);
    expect(ids(s)).toEqual(["L2:sold", "L1:sold"]);
  });

  it("stops at n", () => {
    const s = snap([["START"], ...sell("L1", "T1", 700), ...sell("L2", "T1", 700), ...sell("L3", "T1", 700)], 20);
    expect(ids(s, 2)).toEqual(["L3:sold", "L2:sold"]);
  });
});

describe("nextLots", () => {
  it("gives the next queued lots in sort order, skipping the one on the block and finished ones", () => {
    const s = snap([["START"], ...sell("L1", "T1", 700), ["START_LOT", { lotId: "L2" }]]);
    expect(nextLots(s).map((l) => l.id)).toEqual(["L3", "L4", "L6"]);
  });

  it("starts with the lot the console opens next", () => {
    const s = snap([["START"], ...unsell("L1"), ...sell("L2", "T1", 600)]);
    const first = nextQueuedLot(s.state, s.lots.map((l) => l.id));
    expect(nextLots(s)[0].id).toBe(first);
  });

  it("picks up a requeued lot in its sort slot", () => {
    const s = snap([["START"], ...unsell("L1"), ["REQUEUE", { lotId: "L1" }]]);
    expect(nextLots(s, 2).map((l) => l.id)).toEqual(["L1", "L2"]);
  });
});
