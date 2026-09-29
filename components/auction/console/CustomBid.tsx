"use client";

import { useState } from "react";
import { safeColour, textOn } from "@/lib/auction/colour";
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
    <details className="rounded-lg border-2 border-ink p-3">
      <summary className="cursor-pointer text-lg font-black">Custom amount</summary>
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
          const bg = safeColour(team.colour);
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
                className="min-h-12 rounded-lg border-2 border-ink font-black disabled:opacity-35"
                style={{ background: bg, color: textOn(bg) }}
              >
                {team.short}
              </button>
              {amount !== null && reason && <span className="text-center text-xs leading-tight font-semibold text-red-800">{reason}</span>}
            </div>
          );
        })}
      </div>
      {amount !== null && <p className="mt-2 text-muted">Tap a team to bid {fmt(amount)}.</p>}
    </details>
  );
}
