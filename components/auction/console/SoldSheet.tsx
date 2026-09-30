"use client";

import { ArrowLeft, Gavel } from "lucide-react";
import { teamStyle } from "@/components/ui/team";
import type { TeamMeta } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { player: string; team: TeamMeta; teams?: readonly TeamMeta[]; amount: number; onConfirm: () => void; onClose: () => void };

/** Full-screen confirm before SOLD: team colour and amount in huge type, so a wrong tap is obvious. */
export function SoldSheet({ player, team, teams, amount, onConfirm, onClose }: Props) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm sale" className="fixed inset-0 z-50 flex flex-col bg-paper motion-safe:animate-rise">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" style={teamStyle(team, teams)}>
        <p className="font-display text-3xl font-extrabold uppercase">Sell to</p>
        <p className="font-display text-6xl leading-none font-extrabold break-words uppercase">{team.name}</p>
        <p className="num font-display text-8xl leading-none font-extrabold">{fmt(amount)}</p>
        <p className="font-display text-3xl font-bold uppercase">{player}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <button type="button" onClick={onClose} className="btn-outline min-h-16 text-xl">
          <ArrowLeft aria-hidden className="size-6" /> Back
        </button>
        <button type="button" onClick={onConfirm} autoFocus className="btn min-h-16 font-display text-3xl font-extrabold uppercase">
          <Gavel aria-hidden className="size-7" /> SOLD
        </button>
      </div>
    </div>
  );
}

/** "Selling…" toast with a Cancel button. The SOLD command only fires when this runs out. */
export function CancelToast({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-lg bg-ink p-4 text-white shadow-pop motion-safe:animate-rise">
      <span className="text-lg font-bold">{text}</span>
      <button type="button" onClick={onCancel} className="btn-accent shrink-0">
        Cancel
      </button>
    </div>
  );
}
