/** Choices shown on the form. Shared by the client form and server validation. */
export const ROLE_VALUES = ["batter", "bowler", "all_rounder", "wicket_keeper"] as const;
export type RoleValue = (typeof ROLE_VALUES)[number];

const ROLE_LABELS: Record<RoleValue, string> = {
  batter: "Batter",
  bowler: "Bowler",
  all_rounder: "All-rounder",
  wicket_keeper: "Wicket-keeper",
};

export const ROLES = ROLE_VALUES.map((value) => ({ value, label: ROLE_LABELS[value] }));

export const BATTING_STYLES = ["Right-hand bat", "Left-hand bat"] as const;

export const BOWLING_STYLES = [
  "Right-arm pace",
  "Left-arm pace",
  "Right-arm spin",
  "Left-arm spin",
  "Doesn't bowl",
] as const;

export const TIERS = ["M", "A", "B", "C"] as const;

export const BIO_MAX = 280;

export const roleLabel = (value: string | null | undefined): string =>
  ROLE_LABELS[value as RoleValue] ?? "—";
