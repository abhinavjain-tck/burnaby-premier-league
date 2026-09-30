import type { Snapshot } from "@/lib/auction/types";
import { soldFeed, teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { TeamChip } from "./TeamBar";

/** Every sale, latest first. */
export function SoldFeed({ snap, limit }: { snap: Snapshot; limit?: number }) {
  const all = soldFeed(snap);
  const sold = all.slice(0, limit);
  return (
    <section aria-labelledby="sold-h" className="space-y-2">
      <h2 id="sold-h" className="font-display text-2xl font-extrabold uppercase">
        Sold <span className="num text-muted">({all.length})</span>
      </h2>
      {sold.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-line bg-paper p-4 text-center font-semibold text-muted">Nobody yet.</p>
      ) : (
        <ol className="card divide-y divide-line">
          {sold.map((l) => {
            const team = teamById(snap, l.live.soldTo);
            return (
              <li key={l.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
                {team && <TeamChip team={team} teams={snap.teams} />}
                <span className="min-w-0 flex-1 truncate font-bold">{l.playerName}</span>
                <span className="num font-display text-2xl font-extrabold">{fmt(l.live.price ?? 0)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
