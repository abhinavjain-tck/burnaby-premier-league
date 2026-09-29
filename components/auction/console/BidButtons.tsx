"use client";

import { safeColour, textOn } from "@/lib/auction/colour";
import { stepAt } from "@/lib/auction/config";
import { bidOptions } from "@/lib/auction/rules";
import type { Snapshot } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { snap: Snapshot; disabled: boolean; onBid: (teamId: string, amount: number) => void };

/** One "+step" button per team, in team colours, in a single row. Greyed out with the reason when a team can't bid. */
export function BidButtons({ snap, disabled, onBid }: Props) {
  const options = bidOptions(snap.state, snap.config, snap.teams.map((t) => t.id));
  const lot = snap.onBlock ? snap.state.lots[snap.onBlock] : undefined;
  const label = lot?.currentBid === undefined ? "Base" : `+${fmt(stepAt(snap.config, lot.currentBid))}`;
  return (
    <div className="grid grid-cols-4 gap-2">
      {snap.teams.map((team) => {
        const o = options.find((x) => x.teamId === team.id)!;
        const bg = safeColour(team.colour);
        const off = disabled || o.reason !== null || o.amount === null;
        return (
          <div key={team.id} className="flex flex-col items-stretch gap-1">
            <button
              type="button"
              disabled={off}
              onClick={() => o.amount !== null && onBid(team.id, o.amount)}
              aria-label={o.amount !== null ? `${team.name} bids ${fmt(o.amount)}` : team.name}
              className="flex min-h-20 flex-col items-center justify-center rounded-lg border-2 border-ink px-1 font-black disabled:opacity-35"
              style={{ background: bg, color: textOn(bg) }}
            >
              <span className="text-lg leading-tight">{team.short}</span>
              <span className="text-sm leading-tight">{label}</span>
              {o.amount !== null && <span className="text-base leading-tight tabular-nums">{fmt(o.amount)}</span>}
            </button>
            {o.reason && lot && <span className="text-center text-xs leading-tight font-semibold text-red-800">{o.reason}</span>}
          </div>
        );
      })}
    </div>
  );
}
