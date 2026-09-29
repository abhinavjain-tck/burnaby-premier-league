import type { Snapshot } from "@/lib/auction/types";
import { soldFeed, teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { TeamDot } from "./TeamBar";

/** Every sale, latest first. */
export function SoldFeed({ snap, limit }: { snap: Snapshot; limit?: number }) {
  const sold = soldFeed(snap).slice(0, limit);
  return (
    <section aria-labelledby="sold-h">
      <h2 id="sold-h" className="text-lg font-black">
        Sold ({soldFeed(snap).length})
      </h2>
      {sold.length === 0 ? (
        <p className="text-muted">Nobody yet.</p>
      ) : (
        <ol className="divide-y divide-zinc-200">
          {sold.map((l) => {
            const team = teamById(snap, l.live.soldTo);
            return (
              <li key={l.id} className="flex items-center gap-2 py-2">
                {team && <TeamDot team={team} />}
                <span className="min-w-0 flex-1 truncate font-bold">{l.playerName}</span>
                <span className="text-sm text-muted">{team?.short}</span>
                <span className="w-20 text-right font-black tabular-nums">{fmt(l.live.price ?? 0)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
