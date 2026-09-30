import type { ReactNode } from "react";
import { roleLabel } from "@/lib/registration/options";
import { cx } from "./cx";

export type Tone = "neutral" | "pitch" | "gold" | "ball" | "ink" | "outline";

const TONE: Record<Tone, string> = {
  neutral: "bg-canvas text-ink border-line",
  pitch: "bg-pitch text-white border-pitch",
  gold: "bg-gold text-ink border-gold",
  ball: "bg-ball text-white border-ball",
  ink: "bg-ink text-white border-ink",
  outline: "bg-paper text-ink border-edge",
};

/** Small label: status, role, band. Solid fills so they read in sunlight. */
export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex min-h-7 items-center gap-1 rounded-sm border px-2 text-sm leading-none font-bold whitespace-nowrap uppercase",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ROLE_SHORT: Record<string, string> = { batter: "BAT", bowler: "BOWL", all_rounder: "AR", wicket_keeper: "WK" };

/** Role chip. `short` for tight rows (BAT / BOWL / AR / WK). */
export function RoleChip({ role, short = false }: { role: string | null | undefined; short?: boolean }) {
  if (!role) return null;
  const tone: Tone = role === "wicket_keeper" ? "ink" : "outline";
  return (
    <Badge tone={tone} title={roleLabel(role)}>
      {short ? (ROLE_SHORT[role] ?? role) : roleLabel(role)}
    </Badge>
  );
}

const BAND_NAME: Record<string, string> = { M: "Star", A: "Band A", B: "Band B", C: "Band C" };

/** Price band (tier). Star gets the gold. */
export function BandChip({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null;
  return <Badge tone={tier === "M" ? "gold" : "neutral"}>{BAND_NAME[tier] ?? `Band ${tier}`}</Badge>;
}

/** Wicket-keeper flag, for places that show a role another way. */
export function WkChip() {
  return (
    <Badge tone="ink" title="Wicket-keeper">
      WK
    </Badge>
  );
}
