import { Gavel } from "lucide-react";
import type { TeamMeta } from "@/lib/auction/types";
import { fmt } from "@/lib/money";
import { TeamBar } from "./TeamBar";

/** Current bid and who holds it. The largest thing on the board. */
export function BidLine({ amount, team, teams, base, big = false }: { amount?: number; team?: TeamMeta; teams?: readonly TeamMeta[]; base: number; big?: boolean }) {
  if (amount === undefined || !team) {
    return (
      <div className="flex items-center gap-3 rounded-md border-2 border-dashed border-edge bg-canvas px-4 py-3">
        <Gavel aria-hidden className={`${big ? "size-8" : "size-6"} shrink-0 text-muted`} />
        <div>
          <p className={`${big ? "text-3xl" : "text-2xl"} font-display leading-tight font-extrabold uppercase`}>Waiting for a bid</p>
          <p className="font-semibold text-muted">
            Opens at <span className="num">{fmt(base)}</span>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div aria-live="polite" className="space-y-2">
      <p className="eyebrow">Current bid</p>
      {/* key: re-mount on each new bid so the number pops in */}
      <p key={amount} className={`${big ? "text-7xl sm:text-8xl" : "text-6xl"} num font-display leading-[0.85] font-extrabold motion-safe:animate-rise`}>
        {fmt(amount)}
      </p>
      <TeamBar team={team} teams={teams} className={`flex items-center justify-between gap-2 ${big ? "text-3xl" : "text-2xl"}`}>
        <span className="min-w-0 truncate">{team.name}</span>
        <span className="shrink-0 text-base font-bold tracking-wider opacity-90">Leads</span>
      </TeamBar>
    </div>
  );
}
