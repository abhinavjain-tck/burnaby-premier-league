"use client";

import { teamStyle } from "@/components/ui/team";
import { stepAt } from "@/lib/auction/config";
import { bidOptions } from "@/lib/auction/rules";
import type { Snapshot } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { snap: Snapshot; disabled: boolean; onBid: (teamId: string, amount: number) => void };

/** One big "+step" button per team, in team colours, 2 by 2 on a phone. Greyed out with the reason when a team can't bid. */
export function BidButtons({ snap, disabled, onBid }: Props) {
  const options = bidOptions(snap.state, snap.config, snap.teams.map((t) => t.id));
  const lot = snap.onBlock ? snap.state.lots[snap.onBlock] : undefined;
  const label = lot?.currentBid === undefined ? "At base" : `+${fmt(stepAt(snap.config, lot.currentBid))}`;
  const paused = snap.state.status !== "open"; // one message for everyone, not four
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {paused && (
        <p className="col-span-2 rounded-md bg-ball-soft p-2 text-center font-bold text-ball sm:col-span-4">
          Bids are off while the auction is {snap.state.status}.
        </p>
      )}
      {snap.teams.map((team) => {
        const o = options.find((x) => x.teamId === team.id)!;
        const off = disabled || o.reason !== null || o.amount === null;
        const leading = lot?.currentTeamId === team.id;
        return (
          <div key={team.id} className="flex flex-col items-stretch gap-1">
            <button
              type="button"
              disabled={off}
              onClick={() => o.amount !== null && onBid(team.id, o.amount)}
              aria-label={o.amount !== null ? `${team.name} bids ${fmt(o.amount)}` : team.name}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg px-1 shadow-card transition-transform duration-150 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100 ${
                leading ? "ring-4 ring-ink ring-offset-2" : ""
              }`}
              style={teamStyle(team, snap.teams)}
            >
              <span className="font-display text-3xl leading-none font-extrabold uppercase">{team.short}</span>
              <span className="text-sm leading-tight font-bold">{label}</span>
              {o.amount !== null && <span className="num font-display text-2xl leading-tight font-extrabold">{fmt(o.amount)}</span>}
            </button>
            {o.reason && lot && !paused && <span className="text-center text-sm leading-tight font-semibold text-ball">{o.reason}</span>}
          </div>
        );
      })}
    </div>
  );
}
