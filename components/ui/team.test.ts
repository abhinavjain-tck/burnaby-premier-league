import { describe, expect, it } from "vitest";
import { textOn } from "@/lib/auction/colour";
import { colourDistance, MIN_TEAM_DISTANCE, TEAM_FALLBACK, teamColour } from "./team";

const league = (colours: Array<string | null>) => colours.map((colour, i) => ({ id: `t${i}`, colour }));
const coloursOf = (teams: ReturnType<typeof league>) => teams.map((t) => teamColour(t, teams));

// White on the colour, WCAG contrast ratio.
function whiteContrast(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (l + 0.05);
}

describe("teamColour", () => {
  it("keeps each team's own colour when they're clearly different", () => {
    expect(coloursOf(league(["#1d4ed8", "#b91c1c", "#15803d", "#6d28d9"]))).toEqual(["#1d4ed8", "#b91c1c", "#15803d", "#6d28d9"]);
  });

  it("moves the later of two look-alike purples to a fallback", () => {
    const teams = league(["#b91c1c", "#7c1bd6", "#15803d", "#6d28d9"]);
    const got = coloursOf(teams);
    expect(got[1]).toBe("#7c1bd6");
    expect(got[3]).not.toBe("#6d28d9");
    for (let i = 0; i < got.length; i++)
      for (let j = i + 1; j < got.length; j++) expect(colourDistance(got[i], got[j])).toBeGreaterThanOrEqual(MIN_TEAM_DISTANCE);
  });

  it("fills missing or bad colours by team order", () => {
    expect(coloursOf(league([null, "nope", null, null]))).toEqual(TEAM_FALLBACK.slice(0, 4));
  });

  it("keeps the Season 4 colours (Hawks, Hunters, Panthers, Tigers): distinct, white text at AA, clear of pitch green", () => {
    // Same values as supabase/migrations/20261001051900_season4_teams_players.sql, in board (name) order.
    const season4 = ["#8a6100", "#7c2d12", "#262626", "#c2410c"];
    expect(coloursOf(league(season4))).toEqual(season4);
    for (const c of season4) {
      expect(textOn(c)).toBe("#ffffff");
      expect(whiteContrast(c)).toBeGreaterThanOrEqual(4.5);
      expect(colourDistance(c, "#0b4d2c")).toBeGreaterThanOrEqual(MIN_TEAM_DISTANCE);
    }
  });

  it("uses the team's own colour when no league is passed", () => {
    expect(teamColour({ id: "x", colour: "#7c1bd6" })).toBe("#7c1bd6");
  });

  it("has a fallback palette that's distinct and takes white text at AA", () => {
    for (const c of TEAM_FALLBACK) {
      expect(textOn(c)).toBe("#ffffff");
      expect(whiteContrast(c)).toBeGreaterThanOrEqual(4.5);
    }
    for (let i = 0; i < TEAM_FALLBACK.length; i++)
      for (let j = i + 1; j < TEAM_FALLBACK.length; j++) expect(colourDistance(TEAM_FALLBACK[i], TEAM_FALLBACK[j])).toBeGreaterThanOrEqual(MIN_TEAM_DISTANCE);
  });
});
