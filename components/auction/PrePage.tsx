import { safeColour } from "@/lib/auction/colour";
import type { AuctionConfig } from "@/lib/auction/config";
import type { Snapshot } from "@/lib/auction/types";
import { fmt } from "@/lib/money";
import { roleLabel } from "@/lib/registration/options";
import { AutoRefresh } from "./AutoRefresh";
import { Rules } from "./Rules";

export const AUCTION_DAY = "Sunday 4 Oct";

/** /auction before the live auction opens: date, rules, teams and the pool by set. */
export function PrePage({ config, snap, notice }: { config: AuctionConfig; snap: Snapshot | null; notice?: React.ReactNode }) {
  const sets = new Map<string, Snapshot["lots"]>();
  for (const l of snap?.lots ?? []) sets.set(l.setName, [...(sets.get(l.setName) ?? []), l]);
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-6">
      {notice}
      <header className="space-y-1 text-center">
        <p className="font-bold tracking-wide text-brand uppercase">BPL Season 4 player auction</p>
        <h1 className="text-4xl font-black">Auction starts {AUCTION_DAY}</h1>
        <p className="text-muted">This page turns into the live board when bidding opens. Keep it open.</p>
      </header>

      {snap && snap.teams.length > 0 && (
        <section aria-labelledby="teams-h" className="space-y-2">
          <h2 id="teams-h" className="text-2xl font-black">
            Teams
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {snap.teams.map((t) => (
              <li key={t.id} className="rounded-lg border-l-8 border-y-2 border-r-2 border-ink px-3 py-2 font-bold" style={{ borderLeftColor: safeColour(t.colour) }}>
                {t.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Rules config={config} />

      {sets.size > 0 && (
        <section aria-labelledby="pool-h" className="space-y-3">
          <h2 id="pool-h" className="text-2xl font-black">
            The pool ({snap?.lots.length})
          </h2>
          {[...sets.entries()].map(([name, lots]) => (
            <div key={name}>
              <h3 className="font-black">
                {name} ({lots.length})
              </h3>
              <ul className="divide-y divide-zinc-200">
                {lots.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2 py-1">
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{l.playerName}</span> <span className="text-muted">· {roleLabel(l.role)}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{fmt(l.base)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      <AutoRefresh seconds={30} />
    </main>
  );
}
