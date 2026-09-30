import { CalendarDays } from "lucide-react";
import { RoleChip } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { teamColour, teamStyle } from "@/components/ui/team";
import type { AuctionConfig } from "@/lib/auction/config";
import type { Snapshot } from "@/lib/auction/types";
import { setLabel } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { AutoRefresh } from "./AutoRefresh";
import { Rules } from "./Rules";

export const AUCTION_DAY = "Sunday 4 Oct";

/** /auction before the live auction opens: date, rules, teams and the pool by set. */
export function PrePage({ config, snap, notice }: { config: AuctionConfig; snap: Snapshot | null; notice?: React.ReactNode }) {
  const sets = new Map<string, Snapshot["lots"]>();
  for (const l of snap?.lots ?? []) sets.set(l.setName, [...(sets.get(l.setName) ?? []), l]);
  return (
    <div className="space-y-8">
      {notice}
      <header className="card space-y-3 border-l-8 border-l-gold p-5">
        <p className="eyebrow">BPL Season 4 player auction</p>
        <h1 className="flex items-center gap-3 font-display text-4xl leading-[0.95] font-extrabold uppercase sm:text-5xl">
          <CalendarDays aria-hidden className="size-9 shrink-0 text-pitch" />
          Auction starts {AUCTION_DAY}
        </h1>
        <p className="text-lg text-muted">This page turns into the live board when bidding opens. Keep it open.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
          {snap && snap.teams.length > 0 && (
            <section aria-labelledby="teams-h" className="space-y-3">
              <SectionHeader id="teams-h" title="Teams" />
              <ul className="grid grid-cols-2 gap-2">
                {snap.teams.map((t) => (
                  <li key={t.id} className="card relative overflow-hidden p-3 pt-4">
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: teamColour(t, snap.teams) }} />
                    <span className="rounded-sm px-1.5 font-display text-lg font-extrabold uppercase" style={teamStyle(t, snap.teams)}>
                      {t.short}
                    </span>
                    <p className="mt-1 font-bold">{t.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Rules config={config} />
        </div>

        {sets.size > 0 && (
          <section aria-labelledby="pool-h" className="space-y-3">
            <SectionHeader id="pool-h" title={<>The pool <span className="num text-muted">({snap?.lots.length})</span></>} />
            {[...sets.entries()].map(([name, lots]) => (
              <div key={name} className="card overflow-hidden">
                <h3 className="flex items-center justify-between bg-pitch px-4 py-2 font-display text-xl font-extrabold text-white uppercase">
                  {setLabel(name)} <span className="num text-base">{lots.length}</span>
                </h3>
                <ul className="divide-y divide-line">
                  {lots.map((l) => (
                    <li key={l.id} className="flex min-h-11 items-center gap-2 px-4 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-bold">{l.playerName}</span>
                      <RoleChip role={l.role} short />
                      <span className="num w-16 shrink-0 text-right font-display text-lg font-extrabold">{fmt(l.base)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
      <AutoRefresh seconds={30} />
    </div>
  );
}
