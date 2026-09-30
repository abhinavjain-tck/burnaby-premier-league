import { describe, expect, it } from "vitest";
import { checkRoleChange, normaliseEmail, parseAdminEmail, parseRole } from "./admins";

describe("email", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Sam@Example.COM ")).toBe("sam@example.com");
    expect(parseAdminEmail(" Sam@Example.com ")).toEqual({ ok: true, email: "sam@example.com" });
  });
  it("rejects blanks and bad shapes", () => {
    expect(parseAdminEmail("   ").ok).toBe(false);
    for (const bad of ["sam", "sam@", "@x.com", "a b@x.com", "sam@x"]) expect(parseAdminEmail(bad).ok, bad).toBe(false);
  });
});

describe("parseRole", () => {
  it("only accepts the two roles", () => {
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("super_admin")).toBe("super_admin");
    expect(parseRole("owner")).toBeNull();
    expect(parseRole(null)).toBeNull();
  });
});

describe("checkRoleChange", () => {
  const base = {
    actor: "me@x.com",
    envSupers: ["boss@x.com"],
    rows: [
      { email: "me@x.com", role: "super_admin" as const },
      { email: "sam@x.com", role: "admin" as const },
    ],
  };

  it("allows adding and changing another admin", () => {
    expect(checkRoleChange({ ...base, target: "new@x.com", to: "admin" })).toBeNull();
    expect(checkRoleChange({ ...base, target: "sam@x.com", to: "super_admin" })).toBeNull();
    expect(checkRoleChange({ ...base, target: "sam@x.com", to: "remove" })).toBeNull();
  });
  it("blocks env emails, whatever the case", () => {
    expect(checkRoleChange({ ...base, target: "Boss@x.com", to: "admin" })).toMatch(/Vercel/);
    expect(checkRoleChange({ ...base, target: "boss@x.com", to: "remove" })).toMatch(/Vercel/);
  });
  it("blocks removing or demoting yourself, allows keeping super_admin", () => {
    expect(checkRoleChange({ ...base, target: "ME@x.com", to: "remove" })).toMatch(/yourself/);
    expect(checkRoleChange({ ...base, target: "me@x.com", to: "admin" })).toMatch(/yourself/);
    expect(checkRoleChange({ ...base, target: "me@x.com", to: "super_admin" })).toBeNull();
  });
  it("blocks removing the last super admin", () => {
    const rows = [
      { email: "me@x.com", role: "admin" as const },
      { email: "last@x.com", role: "super_admin" as const },
    ];
    const one = { actor: "me@x.com", envSupers: [], rows };
    expect(checkRoleChange({ ...one, target: "last@x.com", to: "remove" })).toMatch(/at least one/);
    expect(checkRoleChange({ ...one, target: "last@x.com", to: "admin" })).toMatch(/at least one/);
    expect(checkRoleChange({ ...one, target: "last@x.com", to: "super_admin" })).toBeNull();
  });
  it("counts env super admins toward the minimum", () => {
    const rows = [{ email: "other@x.com", role: "super_admin" as const }];
    expect(checkRoleChange({ actor: "boss@x.com", envSupers: ["boss@x.com"], rows, target: "other@x.com", to: "remove" })).toBeNull();
  });
});
