/** Made-up players and teams for test auctions. Never touches real registrations. */
import type { Tier } from "./config";
import { shuffle } from "./lots";
import type { CardSnapshot } from "./types";

const FIRST = [
  "Aarav", "Arjun", "Rohan", "Vikram", "Kabir", "Ishaan", "Dev", "Rahul", "Sameer", "Karan", "Nikhil", "Pranav",
  "Harpreet", "Gurjit", "Manpreet", "Jaskaran", "Imran", "Faisal", "Zain", "Omar", "Liam", "Noah", "Ethan", "Lucas",
];
const LAST = [
  "Sharma", "Patel", "Singh", "Gill", "Sandhu", "Khan", "Iyer", "Reddy", "Nair", "Mehta", "Chopra", "Joshi",
  "Brar", "Dhillon", "Qureshi", "Malik", "Fernando", "Perera", "Smith", "Brown", "Wilson", "Taylor", "Das", "Rao",
];
const ROLES = ["batter", "batter", "bowler", "bowler", "all_rounder", "all_rounder", "wicket_keeper"] as const;
const BAT = ["Right-hand bat", "Left-hand bat"];
const BOWL = ["Right-arm pace", "Left-arm pace", "Right-arm spin", "Left-arm spin"];

export type FakePlayer = { playerName: string; role: (typeof ROLES)[number]; tier: Tier; card: CardSnapshot };

/** Tier mix from the design doc: about 6 M / 12 A / 18 B / 12 C per 48. */
function tiers(n: number): Tier[] {
  const m = Math.round(n / 8);
  const a = Math.round(n / 4);
  const b = Math.round((n * 3) / 8);
  const c = Math.max(0, n - m - a - b);
  return [...Array(m).fill("M"), ...Array(a).fill("A"), ...Array(b).fill("B"), ...Array(c).fill("C")].slice(0, n);
}

const pick = <T,>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)];

export function fakePlayers(n = 48, random: () => number = Math.random): FakePlayer[] {
  const names = shuffle(FIRST.flatMap((f) => LAST.map((l) => `${f} ${l}`)), random).slice(0, n);
  return shuffle(tiers(n), random).map((tier, i) => {
    const role = pick(ROLES, random);
    const bowls = role !== "batter" && role !== "wicket_keeper";
    const matches = 5 + Math.floor(random() * 60);
    return {
      playerName: names[i] ?? `Player ${i + 1}`,
      role,
      tier,
      card: {
        battingStyle: pick(BAT, random),
        bowlingStyle: bowls ? pick(BOWL, random) : "Doesn't bowl",
        bio: null,
        stats: {
          matches,
          runs: Math.floor(random() * matches * 25),
          wickets: bowls ? Math.floor(random() * matches * 1.5) : 0,
          best: bowls ? `${1 + Math.floor(random() * 5)}/${10 + Math.floor(random() * 30)}` : undefined,
        },
        cricheroesUrl: null,
      },
    };
  });
}

/** The four test teams. High-contrast colours that read in sunlight. */
export const FAKE_TEAMS = [
  { name: "Strikers", short: "STR", colour: "#1d4ed8" },
  { name: "Kings", short: "KNG", colour: "#b91c1c" },
  { name: "Titans", short: "TTN", colour: "#15803d" },
  { name: "Royals", short: "RYL", colour: "#6d28d9" },
] as const;
