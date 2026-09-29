import { describe, expect, it } from "vitest";
import { parseEmailList } from "../auth/roles";
import { editPath, whatsappIntro } from "./messages";
import { isEditToken, newEditToken } from "./token";
import { normalisePhone, parseRegistration } from "./validate";

const PREFIX = "https://abc.supabase.co/storage/v1/object/public/photos/";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

const basics = {
  fullName: "  Rohit Sharma ",
  phone: "+1 (604) 555-0101",
  role: "all_rounder",
  battingStyle: "Right-hand bat",
  bowlingStyle: "Right-arm spin",
};

describe("registration", () => {
  it("normalises phone to digits", () => {
    expect(normalisePhone("+1 (604) 555-0101")).toBe("16045550101");
    expect(normalisePhone("604.555.0101")).toBe("6045550101");
  });

  it("makes 20-char URL-safe edit tokens", () => {
    const a = newEditToken();
    expect(a).toHaveLength(20);
    expect(isEditToken(a)).toBe(true);
    expect(newEditToken()).not.toBe(a);
    expect(isEditToken("../../etc/passwd....")).toBe(false);
  });

  it("accepts basics alone and leaves card fields empty", () => {
    const r = parseRegistration(form({ ...basics, email: "", bio: "", matches: "" }), PREFIX);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ fullName: "Rohit Sharma", phone: "16045550101", email: null, bio: null, stats: {} });
    expect(r.data).not.toHaveProperty("paymentProofPath");
  });

  it("requires every basics field except email", () => {
    const r = parseRegistration(form({ fullName: "", phone: "123" }), PREFIX);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["battingStyle", "bowlingStyle", "fullName", "phone", "role"]);
  });

  it("parses the auction card", () => {
    const r = parseRegistration(
      form({
        ...basics,
        bio: "Opening bat, bowls tidy off-spin",
        matches: "40",
        runs: "1200",
        wickets: "18",
        best: "87*",
        cricheroesUrl: "https://cricheroes.com/player-profile/123/rohit/matches",
        photoUrl: `${PREFIX}abc.webp`,
        paymentProofPath: "0b8e2c1a-3f7d-4b8e-9a1c-2d3e4f5a6b7c.webp",
      }),
      PREFIX,
    );
    expect(r.ok && r.data).toMatchObject({
      stats: { matches: 40, runs: 1200, wickets: 18, best: "87*" },
      photoUrl: `${PREFIX}abc.webp`,
      paymentProofPath: "0b8e2c1a-3f7d-4b8e-9a1c-2d3e4f5a6b7c.webp",
    });
  });

  it("rejects long bios, foreign photo URLs, non-CricHeroes links and odd proof paths", () => {
    const r = parseRegistration(
      form({
        ...basics,
        bio: "x".repeat(281),
        photoUrl: "https://evil.example/a.webp",
        cricheroesUrl: "javascript:alert(1)",
        paymentProofPath: "../other-bucket/x.webp",
        runs: "lots",
      }),
      PREFIX,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["bio", "cricheroesUrl", "paymentProofPath", "photoUrl", "runs"]);
  });

  it("rejects any photo URL when storage is not set up", () => {
    const r = parseRegistration(form({ ...basics, photoUrl: `${PREFIX}abc.webp` }), null);
    expect(r.ok).toBe(false);
  });

  it("builds the WhatsApp message", () => {
    const url = `https://bpl.example${editPath("k8f2aaaaaaaaaaaaaaaa")}`;
    expect(whatsappIntro("Rohit") + url).toBe(
      "Hi Rohit, you're registered for BPL Season 4. Your private link to edit your auction card: https://bpl.example/r/k8f2aaaaaaaaaaaaaaaa",
    );
  });

  it("parses the super admin env list", () => {
    expect(parseEmailList(" A@x.com, ,b@y.com ")).toEqual(["a@x.com", "b@y.com"]);
    expect(parseEmailList(undefined)).toEqual([]);
  });
});
