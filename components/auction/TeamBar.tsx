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
