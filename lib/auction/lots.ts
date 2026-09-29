/**
 * Sets and running order. Marquee first, then one set per role.
 * Order inside a set is shuffled in the open so everyone can see it's fair.
 */
export const SET_ORDER = ["Marquee", "All-rounders", "Batters", "Wicket-keepers", "Bowlers", "Others"] as const;

const ROLE_SET: Record<string, (typeof SET_ORDER)[number]> = {
  all_rounder: "All-rounders",
  batter: "Batters",
  wicket_keeper: "Wicket-keepers",
  bowler: "Bowlers",
};

/** Tier M goes to Marquee; everyone else by role. */
export const setNameFor = (tier: string | null | undefined, role: string | null | undefined): string =>
  tier?.trim() === "M" ? "Marquee" : (ROLE_SET[role ?? ""] ?? "Others");

const setRank = (name: string): number => {
  const i = (SET_ORDER as readonly string[]).indexOf(name);
  return i === -1 ? SET_ORDER.length : i;
};

type Orderable = { id: string; setName: string; sortOrder: number };

/**
 * Running order 1..n: sets in SET_ORDER, and inside a set keep the current order.
 * New lots get a big sortOrder on insert, so they land at the end of their set.
 */
export function renumber<T extends Orderable>(lots: T[]): Array<{ id: string; sortOrder: number }> {
  return [...lots]
    .sort((a, b) => setRank(a.setName) - setRank(b.setName) || a.setName.localeCompare(b.setName) || a.sortOrder - b.sortOrder)
    .map((l, i) => ({ id: l.id, sortOrder: i + 1 }));
}

/** Fisher–Yates with an injectable random source (tests pass a seeded one). */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffle the queued lots inside each set. Lots already sold, unsold or on the
 * block keep their slot; queued lots swap among the slots their set already holds.
 */
export function shuffleWithinSets<T extends Orderable & { status: string }>(
  lots: T[],
  random: () => number = Math.random,
): Array<{ id: string; sortOrder: number }> {
  const bySet = new Map<string, T[]>();
  for (const l of lots) {
    if (l.status !== "queued") continue;
    bySet.set(l.setName, [...(bySet.get(l.setName) ?? []), l]);
  }
  const out: Array<{ id: string; sortOrder: number }> = [];
  for (const group of bySet.values()) {
    const slots = group.map((l) => l.sortOrder).sort((a, b) => a - b);
    shuffle(group, random).forEach((l, i) => out.push({ id: l.id, sortOrder: slots[i] }));
  }
  return out;
}

/** Small seeded PRNG (mulberry32) for repeatable shuffles in tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
