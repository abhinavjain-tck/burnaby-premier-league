import { ChevronRight } from "lucide-react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { teamColour, teamStyle } from "@/components/ui/team";
import { captainOf } from "@/lib/auction/squad";
import type { Snapshot } from "@/lib/auction/types";
import { pursesByRemaining } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { TeamLogo } from "./TeamBar";

type Props = { snap: Snapshot; leaderId?: string; onOpen?: (teamId: string) => void };

/**
 * Purse left per team, richest first, as compact cards. The leading bidder gets a thick outline.
 * Each card shows the captain and, with `onOpen`, opens that team's squad when tapped.
 */
export function Purses({ snap, leaderId, onOpen }: Props) {
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
          const captain = captainOf(snap, t.id);
          const label = `${t.name}: ${fmt(t.purseLeft)} left, ${t.squadSize} of ${snap.config.maxSquad} players${
            captain ? `, captain ${captain.name}` : ""
          }${leading ? ", leading" : ""}`;
          const body = (
            <>
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: teamColour(t, snap.teams) }} />
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {t.logoUrl && <TeamLogo team={t} teams={snap.teams} size="sm" />}
                  <span className="rounded-sm px-1.5 font-display text-lg leading-6 font-extrabold uppercase" style={teamStyle(t, snap.teams)}>
                    {t.short}
                  </span>
                </span>
                <span className="num flex items-center text-sm font-bold text-muted">
                  {t.squadSize}/{snap.config.maxSquad}
                  {onOpen && <ChevronRight aria-hidden className="-mr-1 size-5" />}
                </span>
              </span>
              <span className="mt-1 block truncate text-sm font-semibold text-muted">{t.name}</span>
              {captain && (
                <span className="mt-1 flex min-w-0 items-center gap-1.5">
                  <PlayerPhoto name={captain.name} url={captain.photoUrl} size="xs" />
                  <span className="min-w-0 truncate text-sm font-bold">
                    <span className="text-muted">Capt.</span> {captain.name}
                  </span>
                </span>
              )}
              <span className="num mt-1 block font-display text-4xl leading-none font-extrabold">{fmt(t.purseLeft)}</span>
              <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-canvas">
                <span className="block h-full origin-left bg-pitch transition-transform duration-300" style={{ transform: `scaleX(${share})` }} />
              </span>
            </>
          );
          const box = `card relative block w-full overflow-hidden p-3 pt-4 text-left ${leading ? "outline-4 outline-offset-0 outline-ink" : ""}`;
          return (
            <li key={t.id} className="flex">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  aria-label={`${label}. Show squad`}
                  aria-haspopup="dialog"
                  className={`${box} cursor-pointer transition-transform duration-150 hover:border-edge focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98]`}
                >
                  {body}
                </button>
              ) : (
                <div className={box} aria-label={label} role="group">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
