import { safeColour, textOn } from "@/lib/auction/colour";

/** Used when a team has no valid colour in settings, picked by team order. Distinct from each other and from the brand green. */
export const TEAM_FALLBACK = ["#1d4ed8", "#b3261e", "#6d28d9", "#c2410c", "#0f766e", "#be185d"] as const;

type HasColour = { id: string; colour: string | null | undefined };

/** A team's colour: its own if valid, else a fixed one by position in `teams`. */
export function teamColour(team: HasColour, teams?: readonly HasColour[]): string {
  const i = Math.max(0, teams?.findIndex((t) => t.id === team.id) ?? 0);
  return safeColour(team.colour, TEAM_FALLBACK[i % TEAM_FALLBACK.length]);
}

/** Background + readable text colour for a solid team fill. */
export function teamStyle(team: HasColour, teams?: readonly HasColour[]): { background: string; color: string } {
  const bg = teamColour(team, teams);
  return { background: bg, color: textOn(bg) };
}
