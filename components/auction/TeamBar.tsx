import Image from "next/image";
import { cx } from "@/components/ui/cx";
import { teamColour, teamStyle } from "@/components/ui/team";
import type { TeamMeta } from "@/lib/auction/types";

type Teams = readonly TeamMeta[];

/** Thick bar in the team colour. Colours as solid fills, not tints: they survive sunlight. */
export function TeamBar({ team, teams, children, className = "" }: { team: TeamMeta; teams?: Teams; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md px-3 py-2 font-display font-extrabold uppercase ${className}`} style={teamStyle(team, teams)}>
      {children}
    </div>
  );
}

/** Solid team chip with the short name (e.g. "TIG"), for lists and feeds. */
export function TeamChip({ team, teams, className = "" }: { team: TeamMeta; teams?: Teams; className?: string }) {
  return (
    <span
      title={team.name}
      className={`inline-flex min-h-7 min-w-12 shrink-0 items-center justify-center rounded-sm px-2 font-display text-base leading-none font-extrabold uppercase ${className}`}
      style={teamStyle(team, teams)}
    >
      {team.short}
    </span>
  );
}

/** Small solid swatch before a team name in lists. */
export function TeamDot({ team, teams }: { team: TeamMeta; teams?: Teams }) {
  return <span aria-hidden className="inline-block size-4 shrink-0 rounded-sm" style={{ background: teamColour(team, teams) }} />;
}

const LOGO_SIZE = { sm: { px: 28, cls: "size-7 text-[0.65rem]" }, md: { px: 40, cls: "size-10 text-sm" }, lg: { px: 56, cls: "size-14 text-lg" } } as const;

/**
 * Small round team crest. Falls back to a round chip in the team colour with the short code.
 * Decorative: the team name is always next to it.
 */
export function TeamLogo({
  team,
  teams,
  size = "md",
  onColour = false,
  className,
}: {
  team: TeamMeta;
  teams?: Teams;
  size?: keyof typeof LOGO_SIZE;
  /** Sitting on the team-colour fill: white ring instead of a team-colour one. */
  onColour?: boolean;
  className?: string;
}) {
  const box = LOGO_SIZE[size];
  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt=""
        width={box.px * 2}
        height={box.px * 2}
        unoptimized
        className={cx(box.cls, "shrink-0 rounded-full bg-ink object-cover ring-2", onColour && "ring-white/80", className)}
        style={onColour ? undefined : { ["--tw-ring-color" as string]: teamColour(team, teams) }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cx(box.cls, "grid shrink-0 place-items-center rounded-full font-display leading-none font-extrabold uppercase", className)}
      style={teamStyle(team, teams)}
    >
      {team.short}
    </span>
  );
}
