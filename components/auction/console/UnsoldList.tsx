"use client";

import { requeueBase } from "@/lib/auction/config";
import type { Snapshot } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { snap: Snapshot; disabled: boolean; onRequeue: (lotId: string) => void };

/** Unsold and skipped lots, with a button to put each back in the pool (accelerated round). */
export function UnsoldList({ snap, disabled, onRequeue }: Props) {
  const lots = snap.lots.filter((l) => {
    const s = snap.state.lots[l.id]?.status;
    return s === "unsold" || s === "skipped";
  });
  if (lots.length === 0) return null;
  return (
    <details className="rounded-lg border-2 border-ink p-3">
      <summary className="cursor-pointer text-lg font-black">Unsold and skipped ({lots.length})</summary>
      <ul className="mt-2 divide-y divide-zinc-200">
        {lots.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block truncate font-bold">{l.playerName}</span>
              <span className="text-sm text-muted">
                {snap.state.lots[l.id].status} · back at {fmt(requeueBase(snap.config, l.base))}
              </span>
            </span>
            <button type="button" disabled={disabled} onClick={() => onRequeue(l.id)} className="btn-outline min-h-10 shrink-0 px-3 text-sm">
              Back to pool
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
