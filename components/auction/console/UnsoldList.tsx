"use client";

import { ChevronDown } from "lucide-react";
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
    <details className="card group p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-display text-xl font-extrabold uppercase [&::-webkit-details-marker]:hidden">
        <span>Unsold and skipped ({lots.length})</span>
        <ChevronDown aria-hidden className="size-6 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="mt-2 divide-y divide-line">
        {lots.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block truncate font-bold">{l.playerName}</span>
              <span className="text-sm text-muted">
                {snap.state.lots[l.id].status} · back at {fmt(requeueBase(snap.config, l.base))}
              </span>
            </span>
            <button type="button" disabled={disabled} onClick={() => onRequeue(l.id)} className="btn-outline min-h-11 shrink-0 px-3 text-base">
              Back to pool
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
