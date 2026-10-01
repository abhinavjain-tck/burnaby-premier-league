import { describe, expect, it } from "vitest";
import { buildSnapshot, liveOf, presoldLots, type EventDbRow, type LotRow, type TeamRow } from "./build";
import { DEFAULT_CONFIG } from "./config";
import { applyLive, mergeLive } from "./live";
import { captainOf, squadOf } from "./squad";
import type { Snapshot } from "./types";

const teams: TeamRow[] = [
  { id: "T1", name: "Strikers", short: "STR", colour: "#1d4ed8", purseStartLakhs: 30000 },
  { id: "T2", name: "Kings", short: "KNG", colour: "#b91c1c", purseStartLakhs: 30000 },
];
const lot = (id: string, name: string, order: number, extra: Partial<LotRow> = {}): LotRow => ({
  id, playerName: name, role: "batter", tier: "B", photoUrl: null, card: {}, setName: "Batters", sortOrder: order, baseLakhs: 500, ...extra,
});
const lots: LotRow[] = [
  lot("L1", "Owner One", 1, { photoUrl: "https://x/o1.jpg", role: "all_rounder", tier: "M" }),
  lot("L2", "Big Buy", 2, { card: { stats: { matches: 20, runs: 450, wickets: 3 } }, role: "wicket_keeper" }),
  lot("L3", "Second Buy", 3),
  lot("L4", "Unsold Guy", 4),
];

let seq = 0;
const ev = (type: string, payload: Record<string, unknown> = {}, undone = false): EventDbRow => ({
  seq: ++seq, type, payload, undone, at: null, actorEmail: "op@x.com",
});

function snap(events: EventDbRow[]): Snapshot {
  return buildSnapshot({
    auction: { id: "A", name: "Test", mode: "test", seasonId: 1, version: events.length },
    config: DEFAULT_CONFIG,
    teams,
    lots,
    events,
  });
}

const history = () => {
  seq = 0;
  return [
    ev("PRESOLD", { lotId: "L1", teamId: "T1", amount: 2500 }),
    ev("START"),
    ev("START_LOT", { lotId: "L3" }),
    ev("SOLD", { lotId: "L3", teamId: "T1", amount: 600 }),
    ev("START_LOT", { lotId: "L2" }),
    ev("SOLD", { lotId: "L2", teamId: "T1", amount: 1500 }),
  ];
};

describe("presoldLots", () => {
  it("lists live PRESOLD lots in order and skips undone ones", () => {
    seq = 0;
    const rows = [ev("PRESOLD", { lotId: "L1", teamId: "T1", amount: 1 }), ev("PRESOLD", { lotId: "L2", teamId: "T2", amount: 1 }, true)];
    expect(presoldLots(rows)).toEqual(["L1"]);
  });
});

describe("captainOf", () => {
  it("is the first player pre-sold to the team", () => {
    expect(captainOf(snap(history()), "T1")).toEqual({ name: "Owner One", photoUrl: "https://x/o1.jpg" });
  });

  it("is null when nobody was pre-sold", () => {
    expect(captainOf(snap(history()), "T2")).toBeNull();
  });

  describe("with a named captain on the team", () => {
    const named = (events: EventDbRow[], captainRegistrationId = "R3") =>
      buildSnapshot({
        auction: { id: "A", name: "Test", mode: "test", seasonId: 1, version: events.length },
        config: DEFAULT_CONFIG,
        teams: teams.map((t) => (t.id === "T1" ? { ...t, captainRegistrationId } : t)),
        lots: lots.map((l) => ({ ...l, registrationId: `R${l.id.slice(1)}` })),
        events,
      });
    // Owner One is pre-sold first, but the team names Second Buy (R3) as captain.
    const both = () => {
      seq = 0;
      return [ev("PRESOLD", { lotId: "L1", teamId: "T1", amount: 0 }), ev("PRESOLD", { lotId: "L3", teamId: "T1", amount: 0 })];
    };

    it("prefers the named captain over the first pre-sold", () => {
      const s = named(both());
      expect(s.teams[0].captainLotId).toBe("L3");
      expect(captainOf(s, "T1")?.name).toBe("Second Buy");
      expect(squadOf(s, "T1")!.players.map((p) => [p.name, p.captain])).toEqual([
        ["Second Buy", true],
        ["Owner One", false],
      ]);
    });

    it("falls back to the first pre-sold while the named captain isn't with the team", () => {
      seq = 0;
      const s = named([ev("PRESOLD", { lotId: "L1", teamId: "T1", amount: 0 })]);
      expect(captainOf(s, "T1")?.name).toBe("Owner One");
    });

    it("falls back when the named captain has no lot in this auction", () => {
      const s = named(both(), "R-missing");
      expect(s.teams[0].captainLotId).toBeNull();
      expect(captainOf(s, "T1")?.name).toBe("Owner One");
    });

    it("never sends registration ids to phones", () => {
      expect(JSON.stringify(named(both()).lots)).not.toMatch(/"R\d"/);
    });
  });
});

describe("squadOf", () => {
  it("puts the captain first, then buys in order, with totals", () => {
    const sq = squadOf(snap(history()), "T1")!;
    expect(sq.players.map((p) => p.name)).toEqual(["Owner One", "Second Buy", "Big Buy"]);
    expect(sq.players[0].captain).toBe(true);
    expect(sq.captain?.name).toBe("Owner One");
    expect(sq.spent).toBe(2500 + 600 + 1500);
    expect(sq.purseLeft).toBe(30000 - 4600);
    expect(sq.size).toBe(3);
    expect(sq.maxSquad).toBe(13);
    expect(sq.needed).toBe(8);
    expect(sq.players[2]).toMatchObject({ role: "wicket_keeper", price: 1500, stats: { matches: 20, runs: 450, wickets: 3 } });
  });

  it("only exposes public fields", () => {
    const keys = Object.keys(squadOf(snap(history()), "T1")!.players[0]).sort();
    expect(keys).toEqual(["captain", "id", "name", "photoUrl", "price", "role", "stats", "tier"]);
  });

  it("is empty for a team with no players, and null for an unknown team", () => {
    const sq = squadOf(snap(history()), "T2")!;
    expect(sq.players).toEqual([]);
    expect(sq.captain).toBeNull();
    expect(sq.needed).toBe(11);
    expect(squadOf(snap(history()), "nope")).toBeNull();
  });
});

describe("live updates", () => {
  it("a live PRESOLD event sets the captain without a refetch", () => {
    seq = 0;
    const s = snap([ev("START")]);
    const r = applyLive(s, { version: 2, event: { seq: 2, type: "PRESOLD", payload: { lotId: "L1", teamId: "T2", amount: 2500 }, undone: false, at: "" } });
    expect(r.kind).toBe("applied");
    if (r.kind !== "applied") return;
    expect(captainOf(r.snapshot, "T2")?.name).toBe("Owner One");
    expect(squadOf(r.snapshot, "T2")?.players).toHaveLength(1);
  });

  it("a polled live part carries the presold list", () => {
    const full = snap(history());
    const empty = { ...full, presold: [] };
    expect(captainOf(mergeLive(empty, liveOf(full)), "T1")?.name).toBe("Owner One");
  });
});
