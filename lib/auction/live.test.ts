import { describe, expect, it } from "vitest";
import { buildSnapshot, liveOf, type LotRow, type TeamRow } from "./build";
import { DEFAULT_CONFIG } from "./config";
import { applyLive, mergeLive, needsFullFetch } from "./live";
import type { EventRow, Snapshot } from "./types";

const teams: TeamRow[] = [{ id: "T1", name: "Strikers", short: "STR", colour: "#1d4ed8", purseStartLakhs: 30000 }];
const lots: LotRow[] = [
  { id: "L1", playerName: "R. Sharma", role: "bowler", tier: "B", photoUrl: null, card: {}, setName: "Bowlers", sortOrder: 1, baseLakhs: 500 },
];

const snap = (): Snapshot =>
  buildSnapshot({
    auction: { id: "A", name: "Test", mode: "test", seasonId: 1, version: 1 },
    config: DEFAULT_CONFIG,
    teams,
    lots,
    events: [{ seq: 1, type: "START", payload: {}, undone: false, at: null, actorEmail: "op@x.com" }],
  });

const row = (seq: number, type: string, payload: Record<string, unknown> = {}): EventRow => ({ seq, type, payload, undone: false, at: "" });

describe("snapshot", () => {
  it("hides who pressed the button unless asked", () => {
    expect(snap().lastEvents[0].actor).toBeUndefined();
    expect(snap().state.status).toBe("open");
    expect(snap().undoSeq).toBe(1);
  });
});

describe("applyLive", () => {
  it("applies the next event with the shared reducer", () => {
    const r = applyLive(snap(), { version: 2, event: row(2, "START_LOT", { lotId: "L1" }) });
    expect(r.kind).toBe("applied");
    if (r.kind !== "applied") return;
    expect(r.snapshot.onBlock).toBe("L1");
    expect(r.snapshot.auction.version).toBe(2);
    expect(r.snapshot.lastEvents[0].seq).toBe(2);
    expect(r.snapshot.undoSeq).toBe(2);
  });

  it("ignores old messages and refetches on a gap", () => {
    expect(applyLive(snap(), { version: 1, event: row(1, "START") }).kind).toBe("stale");
    expect(applyLive(snap(), { version: 3, event: row(3, "PAUSE") }).kind).toBe("refetch");
  });

  it("refetches for undo/redo markers, null events and illegal events", () => {
    expect(applyLive(snap(), { version: 2, event: row(2, "UNDO", { seq: 1 }) }).kind).toBe("refetch");
    expect(applyLive(snap(), { version: 2, event: null }).kind).toBe("refetch");
    expect(applyLive(snap(), { version: 2, event: row(2, "SOLD", { lotId: "L1", teamId: "T1", amount: 5 }) }).kind).toBe("refetch");
  });
});

describe("polling merge", () => {
  it("takes newer live parts, keeps newer local state", () => {
    const s = snap();
    const newer = { ...liveOf(s), auction: { ...s.auction, version: 5 } };
    expect(mergeLive(s, newer).auction.version).toBe(5);
    const older = { ...liveOf(s), auction: { ...s.auction, version: 0 } };
    expect(mergeLive(s, older)).toBe(s);
  });

  it("asks for a full fetch when lots were added or shuffled", () => {
    const s = snap();
    expect(needsFullFetch(s, liveOf(s))).toBe(false);
    const shuffled = liveOf(s);
    shuffled.state = { ...s.state, lots: { L1: { ...s.state.lots.L1, order: 9 } } };
    expect(needsFullFetch(s, shuffled)).toBe(true);
  });
});
