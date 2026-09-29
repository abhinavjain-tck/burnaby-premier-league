import { safeColour } from "@/lib/auction/colour";
import type { Snapshot } from "@/lib/auction/types";
import { pursesByRemaining } from "@/lib/auction/view";
import { fmt } from "@/lib/money";

/** Purse left per team, richest first. */
export function Purses({ snap }: { snap: Snapshot }) {
  const teams = pursesByRemaining(snap);
  return (
    <section aria-labelledby="purses-h">
      <h2 id="purses-h" className="text-lg font-black">
        Purses
      </h2>
      <ul className="divide-y-2 divide-zinc-200">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2">
            <span aria-hidden className="h-8 w-2 shrink-0 rounded-sm" style={{ background: safeColour(t.colour) }} />
            <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
            <span className="text-sm text-muted tabular-nums">
              {t.squadSize}/{snap.config.maxSquad}
            </span>
            <span className="w-24 text-right text-xl font-black tabular-nums">{fmt(t.purseLeft)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
