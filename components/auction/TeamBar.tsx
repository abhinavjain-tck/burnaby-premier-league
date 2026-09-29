import { safeColour, textOn } from "@/lib/auction/colour";
import type { TeamMeta } from "@/lib/auction/types";

/** Thick bar in the team colour. Colours as solid bars, not tints: they survive sunlight. */
export function TeamBar({ team, children, className = "" }: { team: TeamMeta; children: React.ReactNode; className?: string }) {
  const bg = safeColour(team.colour);
  return (
    <div className={`rounded-lg px-3 py-2 font-black ${className}`} style={{ background: bg, color: textOn(bg) }}>
      {children}
    </div>
  );
}

/** Small solid swatch before a team name in lists. */
export function TeamDot({ team }: { team: TeamMeta }) {
  return <span aria-hidden className="inline-block h-4 w-4 shrink-0 rounded-sm" style={{ background: safeColour(team.colour) }} />;
}
