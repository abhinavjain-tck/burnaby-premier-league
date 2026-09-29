import type { TeamMeta } from "@/lib/auction/types";
import { fmt } from "@/lib/money";
import { TeamBar } from "./TeamBar";

/** Current bid and who holds it. The largest thing on the board. */
export function BidLine({ amount, team, base, big = false }: { amount?: number; team?: TeamMeta; base: number; big?: boolean }) {
  if (amount === undefined || !team) {
    return (
      <div className="rounded-lg border-4 border-dashed border-zinc-400 px-3 py-3 text-center">
        <p className={`${big ? "text-3xl" : "text-xl"} font-black`}>Waiting for a bid</p>
        <p className="text-muted">Opens at {fmt(base)}</p>
      </div>
    );
  }
  return (
    <div aria-live="polite">
      <p className={`${big ? "text-7xl" : "text-5xl"} leading-none font-black tabular-nums`}>{fmt(amount)}</p>
      <TeamBar team={team} className={`mt-2 ${big ? "text-3xl" : "text-xl"}`}>
        {team.name}
      </TeamBar>
    </div>
  );
}
