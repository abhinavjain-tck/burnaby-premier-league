import { describe, expect, it } from "vitest";
import { fakePlayers } from "./fake";
import { renumber, seeded, setNameFor, shuffle, shuffleWithinSets } from "./lots";

describe("sets", () => {
  it("puts tier M in Marquee and everyone else by role", () => {
    expect(setNameFor("M", "bowler")).toBe("Marquee");
    expect(setNameFor("A", "all_rounder")).toBe("All-rounders");
    expect(setNameFor("C", "wicket_keeper")).toBe("Wicket-keepers");
    expect(setNameFor(null, null)).toBe("Others");
  });
});

describe("renumber", () => {
  it("orders by set, keeps order inside a set, numbers from 1", () => {
    const out = renumber([
      { id: "b1", setName: "Bowlers", sortOrder: 5 },
      { id: "m1", setName: "Marquee", sortOrder: 9 },
      { id: "a2", setName: "All-rounders", sortOrder: 1000 }, // new lot, lands last in its set
      { id: "a1", setName: "All-rounders", sortOrder: 2 },
      { id: "x1", setName: "Mystery", sortOrder: 1 },
    ]);
    expect(out).toEqual([
      { id: "m1", sortOrder: 1 },
      { id: "a1", sortOrder: 2 },
      { id: "a2", sortOrder: 3 },
      { id: "b1", sortOrder: 4 },
      { id: "x1", sortOrder: 5 },
    ]);
  });
});

describe("shuffle", () => {
  it("is a permutation and repeatable with a seed", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const a = shuffle(items, seeded(42));
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(shuffle(items, seeded(42))).toEqual(a);
    expect(a).not.toEqual(items);
  });

  it("shuffles only queued lots, only inside their set, into the same slots", () => {
    const lots = [
      { id: "m1", setName: "Marquee", sortOrder: 1, status: "sold" },
      { id: "m2", setName: "Marquee", sortOrder: 2, status: "queued" },
      { id: "m3", setName: "Marquee", sortOrder: 3, status: "queued" },
      { id: "m4", setName: "Marquee", sortOrder: 4, status: "queued" },
      { id: "b1", setName: "Batters", sortOrder: 5, status: "queued" },
      { id: "b2", setName: "Batters", sortOrder: 6, status: "queued" },
      { id: "b3", setName: "Batters", sortOrder: 7, status: "on_block" },
    ];
    const moves = shuffleWithinSets(lots, seeded(7));
    expect(moves.map((m) => m.id).sort()).toEqual(["b1", "b2", "m2", "m3", "m4"]);
    const slot = Object.fromEntries(moves.map((m) => [m.id, m.sortOrder]));
    expect(["m2", "m3", "m4"].map((id) => slot[id]).sort()).toEqual([2, 3, 4]);
    expect(["b1", "b2"].map((id) => slot[id]).sort()).toEqual([5, 6]);
  });
});

describe("fake players", () => {
  it("makes 48 unique players in the 6/12/18/12 tier mix", () => {
    const players = fakePlayers(48, seeded(1));
    expect(players).toHaveLength(48);
    expect(new Set(players.map((p) => p.playerName)).size).toBe(48);
    const count = (t: string) => players.filter((p) => p.tier === t).length;
    expect([count("M"), count("A"), count("B"), count("C")]).toEqual([6, 12, 18, 12]);
  });
});
