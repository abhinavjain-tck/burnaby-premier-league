import { safeColour, textOn } from "@/lib/auction/colour";

/** Used when a team has no valid colour in settings, picked by team order. Distinct from each other and from the brand green. */
export const TEAM_FALLBACK = ["#1d4ed8", "#b3261e", "#6d28d9", "#a16207", "#0f766e", "#be185d"] as const;

type HasColour = { id: string; colour: string | null | undefined };

/** Two team colours closer than this (CIE76 ΔE) read as the same team from the stands. */
export const MIN_TEAM_DISTANCE = 25;

const VALID = /^#[0-9a-f]{6}$/i;

/** How different two #rrggbb colours look (CIE76 ΔE in Lab). */
export function colourDistance(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function lab(hex: string): [number, number, number] {
  const n = parseInt(hex.trim().slice(1), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const cache = new WeakMap<readonly HasColour[], Map<string, string>>();

/**
 * Colours for every team, in team order. A team keeps its own colour unless it's missing,
 * invalid, or too close to an earlier team's. Then it gets the first fallback that stands apart.
 */
function resolveAll(teams: readonly HasColour[]): Map<string, string> {
  const hit = cache.get(teams);
  if (hit) return hit;
  const own = teams.map((t) => (t.colour && VALID.test(t.colour.trim()) ? t.colour.trim() : null));
  const picked: string[] = [];
  const out = new Map<string, string>();
  teams.forEach((t, i) => {
    const clearOfPicked = (c: string) => picked.every((p) => colourDistance(p, c) >= MIN_TEAM_DISTANCE);
    // A fallback also stays clear of later teams' own colours, so it doesn't push them out in turn.
    const clearOfOthers = (c: string) => own.every((o, j) => j === i || !o || colourDistance(o, c) >= MIN_TEAM_DISTANCE);
    const rotated = TEAM_FALLBACK.map((_, k) => TEAM_FALLBACK[(i + k) % TEAM_FALLBACK.length]);
    const mine = own[i];
    const colour =
      (mine && clearOfPicked(mine) ? mine : undefined) ??
      rotated.find((c) => clearOfPicked(c) && clearOfOthers(c)) ??
      rotated.find(clearOfPicked) ??
      mine ??
      rotated[0];
    picked.push(colour);
    out.set(t.id, colour);
  });
  cache.set(teams, out);
  return out;
}

/** A team's colour: its own if valid and clearly different from earlier teams', else a fixed one by position in `teams`. */
export function teamColour(team: HasColour, teams?: readonly HasColour[]): string {
  const resolved = teams ? resolveAll(teams).get(team.id) : undefined;
  return resolved ?? safeColour(team.colour, TEAM_FALLBACK[0]);
}

/** Background + readable text colour for a solid team fill. */
export function teamStyle(team: HasColour, teams?: readonly HasColour[]): { background: string; color: string } {
  const bg = teamColour(team, teams);
  return { background: bg, color: textOn(bg) };
}
