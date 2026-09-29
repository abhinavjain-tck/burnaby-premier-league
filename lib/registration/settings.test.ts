import { describe, expect, it } from "vitest";
import { isRegistrationOpen, leagueSettingsSchema, mergeConfig, shortCode, teamSchema } from "./settings";

describe("mergeConfig", () => {
  it("keeps unrelated keys and overwrites the ones in the patch", () => {
    expect(mergeConfig({ fee_text: "old", extra: 1 }, { fee_text: "$60", registration_open: false })).toEqual({
      fee_text: "$60",
      extra: 1,
      registration_open: false,
    });
  });
  it("does not mutate the input", () => {
    const existing = { a: 1 };
    mergeConfig(existing, { a: 2 });
    expect(existing).toEqual({ a: 1 });
  });
  it("treats null, arrays and non-objects as empty", () => {
    expect(mergeConfig(null, { a: 1 })).toEqual({ a: 1 });
    expect(mergeConfig([1], { a: 1 })).toEqual({ a: 1 });
    expect(mergeConfig("x", { a: 1 })).toEqual({ a: 1 });
  });
});

describe("isRegistrationOpen", () => {
  it("is open by default and only closes on an explicit false", () => {
    expect(isRegistrationOpen({})).toBe(true);
    expect(isRegistrationOpen(null)).toBe(true);
    expect(isRegistrationOpen({ registration_open: true })).toBe(true);
    expect(isRegistrationOpen({ registration_open: false })).toBe(false);
  });
});

describe("shortCode", () => {
  it("uppercases and trims", () => {
    expect(shortCode.parse(" abc ")).toBe("ABC");
  });
  it("rejects wrong length and symbols", () => {
    for (const bad of ["ab", "abcd", "", "a-c", "a c"]) expect(shortCode.safeParse(bad).success).toBe(false);
  });
});

describe("teamSchema", () => {
  const ok = { id: "3f0c1a52-6a55-4c1e-9d0e-0a3f5b1c2d4e", name: "Burnaby Blasters", short: "bbl", colour: "#1a2b3c", logoUrl: "" };
  it("normalises a valid team", () => {
    expect(teamSchema.parse(ok)).toMatchObject({ short: "BBL", logoUrl: null });
  });
  it("rejects bad colour and logo", () => {
    expect(teamSchema.safeParse({ ...ok, colour: "red" }).success).toBe(false);
    expect(teamSchema.safeParse({ ...ok, logoUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("leagueSettingsSchema", () => {
  it("allows a blank e-Transfer email but not a bad one", () => {
    expect(leagueSettingsSchema.safeParse({ fee_text: "$60", etransfer_email: "", registration_open: true }).success).toBe(true);
    expect(leagueSettingsSchema.safeParse({ fee_text: "$60", etransfer_email: "nope", registration_open: true }).success).toBe(false);
  });
});
