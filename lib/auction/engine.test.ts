import { describe, expect, it } from "vitest";
import { stateFrom, type EventDbRow, type LotRow, type TeamRow } from "./build";
import { DEFAULT_CONFIG } from "./config";
import { admit, plan, projectionChanges, lotProjection, VersionConflict } from "./engine";
import { redoTarget, undoTarget } from "./log";
import { AuctionRuleError } from "./reducer";
import type { Command } from "./types";

const T1 = "00000000-0000-4000-8000-0000000000a1";
const T2 = "00000000-0000-4000-8000-0000000000a2";
const L1 = "00000000-0000-4000-8000-0000000000b1";
const L2 = "00000000-0000-4000-8000-0000000000b2";

const teams: TeamRow[] = [
  { id: T1, name: "Strikers", short: "STR", colour: "#1d4ed8", purseStartLakhs: 30000 },
  { id: T2, name: "Kings", short: "KNG", colour: "#b91c1c", purseStartLakhs: 30000 },
];
const lots: LotRow[] = [
  { id: L1, playerName: "R. Sharma", role: "bowler", tier: "B", photoUrl: null, card: {}, setName: "Bowlers", sortOrder: 1, baseLakhs: 500 },
  { id: L2, playerName: "A. Gill", role: "batter", tier: "C", photoUrl: null, card: {}, setName: "Batters", sortOrder: 2, baseLakhs: 200 },
];

/** A tiny in-memory runCommand: plan, then append the row and flip the flag like the DB code does. */
function run(events: EventDbRow[], cmd: Command): EventDbRow[] {
  const p = plan({ teams, lots, events, config: DEFAULT_CONFIG }, cmd);
  const seq = events.length ? Math.max(...events.map((e) => e.seq)) + 1 : 1;
  const flipped = p.flip ? events.map((e) => (e.seq === p.flip!.seq ? { ...e, undone: p.flip!.undone } : e)) : events;
  return [...flipped, { seq, ...p.row, undone: false, at: null, actorEmail: "op@example.com" }];
}

const runAll = (cmds: Command[], start: EventDbRow[] = []) => cmds.reduce(run, start);
const state = (events: EventDbRow[]) => stateFrom(teams, lots, events);

const opening: Command[] = [
  { type: "START" },
  { type: "START_LOT", lotId: L1 },
  { type: "BID", lotId: L1, teamId: T1, amount: 500 },
  { type: "BID", lotId: L1, teamId: T2, amount: 550 },
];

describe("admit (idempotency before version)", () => {
  it("runs when versions match", () => {
    expect(admit({ currentVersion: 4, expectedVersion: 4, duplicate: false })).toBe("run");
  });
  it("throws VersionConflict when the board moved on", () => {
    expect(() => admit({ currentVersion: 5, expectedVersion: 4, duplicate: false })).toThrow(VersionConflict);
  });
  it("treats a retried key as a no-op even with a stale version", () => {
    expect(admit({ currentVersion: 5, expectedVersion: 4, duplicate: true })).toBe("duplicate");
  });
});

describe("undo and redo", () => {
  it("undo flags the latest event and replay drops it", () => {
    const log = runAll([...opening, { type: "UNDO" }]);
    expect(log.find((e) => e.seq === 4)?.undone).toBe(true);
    expect(log.at(-1)).toMatchObject({ seq: 5, type: "UNDO", payload: { seq: 4 } });
    const s = state(log);
    expect(s.lots[L1].currentBid).toBe(500);
    expect(s.lots[L1].currentTeamId).toBe(T1);
  });

  it("undo of SOLD gives the purse and the slot back", () => {
    const sold = runAll([...opening, { type: "SOLD", lotId: L1, teamId: T2, amount: 550 }]);
    expect(state(sold).teams[T2]).toMatchObject({ purseLeft: 29450, squadSize: 1 });
    const undone = run(sold, { type: "UNDO" });
    expect(state(undone).teams[T2]).toMatchObject({ purseLeft: 30000, squadSize: 0 });
    expect(state(undone).lots[L1].status).toBe("on_block");
  });

  it("multi-step undo then redo restores in reverse order of undo", () => {
    let log = runAll(opening); // seq 1..4
    log = run(log, { type: "UNDO" }); // undoes 4
    log = run(log, { type: "UNDO" }); // undoes 3
    expect(redoTarget(log)).toBe(3);
    log = run(log, { type: "REDO" });
    expect(state(log).lots[L1].currentBid).toBe(500);
    expect(redoTarget(log)).toBe(4);
    log = run(log, { type: "REDO" });
    expect(state(log).lots[L1].currentBid).toBe(550);
    expect(redoTarget(log)).toBeNull();
    expect(() => run(log, { type: "REDO" })).toThrow("Nothing to redo");
  });

  it("a new action after undo clears redo for good", () => {
    let log = runAll([...opening, { type: "UNDO" }]); // 550 undone
    log = run(log, { type: "BID", lotId: L1, teamId: T2, amount: 600 });
    expect(redoTarget(log)).toBeNull();
    expect(undoTarget(log)).toBe(6);
    expect(state(log).lots[L1].currentBid).toBe(600);
  });

  it("undo skips markers and already-undone rows", () => {
    let log = runAll([...opening, { type: "UNDO" }, { type: "UNDO" }]);
    expect(undoTarget(log)).toBe(2);
    log = run(log, { type: "UNDO" });
    log = run(log, { type: "UNDO" });
    expect(state(log).status).toBe("draft");
    expect(() => run(log, { type: "UNDO" })).toThrow("Nothing to undo");
  });

  it("markers never reach the reducer", () => {
    const log = runAll([...opening, { type: "UNDO" }, { type: "REDO" }]);
    // 4 live events applied, markers ignored
    expect(state(log).version).toBe(4);
  });
});

describe("plan", () => {
  it("rejects illegal moves with AuctionRuleError", () => {
    const log = runAll(opening);
    expect(() => plan({ teams, lots, events: log, config: DEFAULT_CONFIG }, { type: "BID", lotId: L1, teamId: T2, amount: 600 })).toThrow(
      AuctionRuleError,
    ); // T2 already leads
    expect(() => plan({ teams, lots, events: log, config: DEFAULT_CONFIG }, { type: "SOLD", lotId: L1, teamId: T1, amount: 550 })).toThrow(
      "Sale must match the current bid",
    );
  });

  it("stores the requeue base in the event", () => {
    const config = { ...DEFAULT_CONFIG, unsoldBaseMultiplier: 0.5 };
    const log = runAll([{ type: "START" }, { type: "START_LOT", lotId: L1 }, { type: "UNSOLD", lotId: L1 }]);
    const p = plan({ teams, lots, events: log, config }, { type: "REQUEUE", lotId: L1 });
    expect(p.row).toEqual({ type: "REQUEUE", payload: { lotId: L1, base: 250 } });
    expect(p.next.lots[L1]).toMatchObject({ status: "queued", base: 250 });
  });
});

describe("projectionChanges", () => {
  it("returns only rows that differ", () => {
    const log = runAll([...opening, { type: "SOLD", lotId: L1, teamId: T2, amount: 550 }]);
    const s = state(log);
    const dbTeams = teams.map((t) => ({ id: t.id, purseLeftLakhs: 30000, squadSize: 0, purseStartLakhs: 30000 }));
    const dbLots = [lotProjection(stateFrom(teams, lots, []), L1), lotProjection(s, L2)];
    const changes = projectionChanges(s, dbTeams, dbLots);
    expect(changes.teams).toEqual([{ id: T2, purseLeftLakhs: 29450, squadSize: 1 }]);
    expect(changes.lots).toEqual([
      { id: L1, status: "sold", currentBidLakhs: null, currentTeamId: null, soldToTeamId: T2, priceLakhs: 550 },
    ]);
  });
});
