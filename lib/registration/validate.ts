import { z } from "zod";
import { BATTING_STYLES, BIO_MAX, BOWLING_STYLES, ROLE_VALUES, type RoleValue } from "./options";

export type FieldErrors = Partial<Record<string, string>>;

/** What the register/edit Server Action hands back to the form. */
export type SaveState =
  | { status: "idle" }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "duplicate" }
  | { status: "error"; message: string }
  | { status: "saved" };

/** Keep digits only: "+1 (604) 555-0101" → "16045550101". */
/** Digits only. A bare 10-digit Canadian/US number gets the country code, so "604…" and "+1 604…" match. */
export const normalisePhone = (raw: string): string => {
  const d = raw.replace(/\D/g, "");
  return d.length === 10 ? `1${d}` : d;
};

const blank = (v: unknown) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v);
const optText = (max: number, msg: string) => z.preprocess(blank, z.string().trim().max(max, msg).optional());
const optCount = z.preprocess(blank, z.coerce.number("Numbers only").int("Whole numbers only").min(0).max(99999).optional());

const isCricHeroes = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && /(^|\.)cricheroes\.(com|in)$/.test(u.hostname);
  } catch {
    return false;
  }
};

function schema(photoPrefix: string | null) {
  return z.object({
    fullName: z.string("Enter your full name").trim().min(2, "Enter your full name").max(80, "Keep it under 80 characters"),
    phone: z.preprocess(
      (v) => (typeof v === "string" ? normalisePhone(v) : ""),
      z.string().regex(/^\d{10,15}$/, "Enter your WhatsApp number with area code"),
    ),
    email: z.preprocess(blank, z.email("Enter a valid email or leave it empty").max(120).optional()),
    role: z.enum(ROLE_VALUES, "Pick your role"),
    battingStyle: z.enum(BATTING_STYLES, "Pick how you bat"),
    bowlingStyle: z.enum(BOWLING_STYLES, "Pick how you bowl"),
    bio: optText(BIO_MAX, `Keep it under ${BIO_MAX} characters`),
    matches: optCount,
    runs: optCount,
    wickets: optCount,
    best: optText(12, "Keep it short, like 87* or 4/20"),
    cricheroesUrl: z.preprocess(
      blank,
      z.string().refine(isCricHeroes, "Paste your CricHeroes profile link (https://cricheroes.com/...)").optional(),
    ),
    // Only accept URLs that point at our own public photos bucket.
    photoUrl: z.preprocess(
      blank,
      z.string().refine((v) => photoPrefix !== null && v.startsWith(photoPrefix), "Photo upload failed, try again").optional(),
    ),
    // Path we generated in createUploadUrl, e.g. "3f0c…e1.webp".
    paymentProofPath: z.preprocess(
      blank,
      z.string().regex(/^[0-9a-f-]{36}\.(webp|jpg|png)$/, "Screenshot upload failed, try again").optional(),
    ),
  });
}

export type RegistrationInput = {
  fullName: string;
  phone: string;
  email: string | null;
  role: RoleValue;
  battingStyle: string;
  bowlingStyle: string;
  bio: string | null;
  stats: { matches?: number; runs?: number; wickets?: number; best?: string };
  /** Left out when the form had no photo field (storage not set up), so an edit never wipes a photo. */
  photoUrl?: string | null;
  cricheroesUrl: string | null;
  /** Only set when a new screenshot was uploaded, so edits never wipe an old one. */
  paymentProofPath?: string;
};

/**
 * Validate the register/edit form.
 * photoPrefix is the public URL prefix of the photos bucket, or null when storage is not set up.
 */
export function parseRegistration(
  form: FormData,
  photoPrefix: string | null,
): { ok: true; data: RegistrationInput } | { ok: false; errors: FieldErrors } {
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const result = schema(photoPrefix).safeParse(raw);
  if (!result.success) {
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const d = result.data;
  const stats = Object.fromEntries(
    Object.entries({ matches: d.matches, runs: d.runs, wickets: d.wickets, best: d.best }).filter(([, v]) => v !== undefined),
  );
  return {
    ok: true,
    data: {
      fullName: d.fullName,
      phone: d.phone,
      email: d.email?.toLowerCase() ?? null,
      role: d.role,
      battingStyle: d.battingStyle,
      bowlingStyle: d.bowlingStyle,
      bio: d.bio ?? null,
      stats,
      ...(form.has("photoUrl") ? { photoUrl: d.photoUrl ?? null } : {}),
      cricheroesUrl: d.cricheroesUrl ?? null,
      ...(d.paymentProofPath ? { paymentProofPath: d.paymentProofPath } : {}),
    },
  };
}
