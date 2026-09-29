"use client";

import { safeColour, textOn } from "@/lib/auction/colour";
import type { TeamMeta } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { player: string; team: TeamMeta; amount: number; onConfirm: () => void; onClose: () => void };

/** Full-screen confirm before SOLD: team colour and amount in huge type, so a wrong tap is obvious. */
export function SoldSheet({ player, team, amount, onConfirm, onClose }: Props) {
  const bg = safeColour(team.colour);
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm sale" className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: bg, color: textOn(bg) }}>
        <p className="text-2xl font-black uppercase">Sell to</p>
        <p className="text-5xl font-black">{team.name}</p>
        <p className="text-7xl font-black tabular-nums">{fmt(amount)}</p>
        <p className="text-2xl font-bold">{player}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <button type="button" onClick={onClose} className="btn-outline min-h-16 text-xl">
          Back
        </button>
        <button type="button" onClick={onConfirm} autoFocus className="btn min-h-16 text-xl">
          SOLD
        </button>
      </div>
    </div>
  );
}

/** "Selling…" toast with a Cancel button. The SOLD command only fires when this runs out. */
export function CancelToast({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-lg bg-ink p-4 text-white shadow-lg">
      <span className="text-lg font-bold">{text}</span>
      <button type="button" onClick={onCancel} className="min-h-12 rounded-lg bg-white px-5 text-lg font-black text-ink">
        Cancel
      </button>
    </div>
  );
}
