import { z } from "zod";

/** Keys the settings form owns inside seasons.config. Other keys are left alone. */
export type LeagueConfig = {
  fee_text?: string;
  etransfer_email?: string;
  registration_open?: boolean;
};

/** Registration is open unless an admin explicitly turned it off. */
export const isRegistrationOpen = (config: unknown): boolean =>
  (config as LeagueConfig | null | undefined)?.registration_open !== false;

/**
 * Same result as Postgres `config || patch`: top-level keys in patch win,
 * every other key survives. Used in tests and as the spec for the SQL merge.
 */
export function mergeConfig(existing: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? (existing as Record<string, unknown>) : {};
  return { ...base, ...patch };
}

const trimmed = z.string().trim();

export const leagueSettingsSchema = z.object({
  fee_text: trimmed.max(120, "Keep the fee line under 120 characters"),
  etransfer_email: trimmed.max(200).refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email or leave it blank"),
  registration_open: z.boolean(),
});

/** Short code: exactly 3 characters, saved uppercase. Letters and digits only. */
export const shortCode = trimmed.transform((v) => v.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{3}$/, "Short code must be 3 letters or digits"));

export const teamSchema = z.object({
  id: z.uuid(),
  name: trimmed.min(1, "Team name is required").max(60),
  short: shortCode,
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  logoUrl: trimmed
    .max(500)
    // A full http(s) link, or a file on this site like /teams/hawks.webp.
    .refine((v) => v === "" || /^https?:\/\//i.test(v) || /^\/(?!\/)[\w./-]+$/.test(v), "Logo must be an http(s) link or a /path on this site")
    .transform((v) => (v === "" ? null : v)),
});
export type TeamInput = z.infer<typeof teamSchema>;
