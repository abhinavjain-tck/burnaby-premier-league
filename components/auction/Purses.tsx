import { teamColour, teamStyle } from "@/components/ui/team";
import type { Snapshot } from "@/lib/auction/types";
import { pursesByRemaining } from "@/lib/auction/view";
import { fmt } from "@/lib/money";

/** Purse left per team, richest first, as compact cards. The leading bidder gets a thick outline. */
export function Purses({ snap, leaderId }: { snap: Snapshot; leaderId?: string }) {
  const teams = pursesByRemaining(snap);
  return (
    <section aria-labelledby="purses-h" className="space-y-2">
      <h2 id="purses-h" className="font-display text-2xl font-extrabold uppercase">
        Purses
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {teams.map((t) => {
          const share = t.purseStart > 0 ? Math.max(0, Math.min(1, t.purseLeft / t.purseStart)) : 0;
          const leading = t.id === leaderId;
          return (
            <li
              key={t.id}
              className={`card relative overflow-hidden p-3 pt-4 ${leading ? "outline-4 outline-offset-0 outline-ink" : ""}`}
              aria-label={`${t.name}: ${fmt(t.purseLeft)} left, ${t.squadSize} of ${snap.config.maxSquad} players${leading ? ", leading" : ""}`}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: teamColour(t, snap.teams) }} />
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-sm px-1.5 font-display text-lg leading-6 font-extrabold uppercase" style={teamStyle(t, snap.teams)}>
                  {t.short}
                </span>
                <span className="num text-sm font-bold text-muted">
                  {t.squadSize}/{snap.config.maxSquad}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-muted">{t.name}</p>
              <p className="num font-display text-4xl leading-none font-extrabold">{fmt(t.purseLeft)}</p>
              <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
                <div className="h-full origin-left bg-pitch transition-transform duration-300" style={{ transform: `scaleX(${share})` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
