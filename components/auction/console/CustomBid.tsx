"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { teamStyle } from "@/components/ui/team";
import { bidBlocker } from "@/lib/auction/rules";
import type { Snapshot } from "@/lib/auction/types";
import { crore, fmt } from "@/lib/money";

type Props = { snap: Snapshot; disabled: boolean; onBid: (teamId: string, amount: number) => void };

/** "12.5" → 1250 lakhs. Empty or junk → null. */
const toLakhs = (text: string): number | null => {
  const n = Number(text.trim().replace(/cr$/i, "").trim());
  return text.trim() && Number.isFinite(n) && n > 0 ? crore(n) : null;
};

/** Jump bids ("30 cr"). Must beat the current bid and be a multiple of the step. */
export function CustomBid({ snap, disabled, onBid }: Props) {
  const [text, setText] = useState("");
  const amount = toLakhs(text);
  return (
    <details className="card group p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-display text-xl font-extrabold uppercase [&::-webkit-details-marker]:hidden">
        <span>Jump bid (custom amount)</span>
        <ChevronDown aria-hidden className="size-6 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <label className="label mt-3" htmlFor="custom-bid">
        Amount in crores
      </label>
      <input
        id="custom-bid"
        className="field"
        inputMode="decimal"
        autoComplete="off"
        placeholder="e.g. 30 or 12.5"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {snap.teams.map((team) => {
          const reason = amount === null ? "Enter an amount" : bidBlocker(snap.state, snap.config, team.id, amount);
          return (
            <div key={team.id} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={disabled || reason !== null}
                onClick={() => {
                  if (amount === null) return;
                  onBid(team.id, amount);
                  setText("");
                }}
                className="min-h-14 cursor-pointer rounded-md font-display text-2xl font-extrabold uppercase disabled:cursor-not-allowed disabled:opacity-35"
                style={teamStyle(team, snap.teams)}
              >
                {team.short}
              </button>
              {amount !== null && reason && <span className="text-center text-sm leading-tight font-semibold text-ball">{reason}</span>}
            </div>
          );
        })}
      </div>
      {amount !== null && <p className="mt-2 font-semibold text-muted">Tap a team to bid <span className="num">{fmt(amount)}</span>.</p>}
    </details>
  );
}
