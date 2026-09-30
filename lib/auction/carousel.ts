/**
 * Pure picks for the lot carousel on the console and owner view (previous · live · next).
 * Reads a snapshot only. The carousel is for looking; commands always use snap.onBlock.
 */
import type { Snapshot } from "./types";
import { lotView, upcoming, type LotView } from "./view";

export type LotResult =
  | { outcome: "sold"; lot: LotView; teamId: string; price: number }
  | { outcome: "unsold"; lot: LotView };

/**
 * Finished lots (SOLD or UNSOLD), newest first, at most n. Undone events never count.
 *
 * Recent results come from lastEvents (newest first), checked against the current state
 * so an undone or requeued result drops out. Every event outside that window is older
 * than every event in it, so older sales follow in soldOrder. Older unsold lots have
 * nothing to order them by, so they're left out. Pre-sold captains never ran, so they're out too.
 */
export function previousResults(snap: Snapshot, n = 5): LotResult[] {
  const out: LotResult[] = [];
  const seen = new Set<string>(snap.presold);
  const push = (id: string): void => {
    if (out.length >= n || seen.has(id)) return;
    const lot = lotView(snap, id);
    if (!lot) return;
    if (lot.live.status === "sold" && lot.live.soldTo && lot.live.price !== undefined) {
      seen.add(id);
      out.push({ outcome: "sold", lot, teamId: lot.live.soldTo, price: lot.live.price });
    } else if (lot.live.status === "unsold") {
      seen.add(id);
      out.push({ outcome: "unsold", lot });
    }
  };

  for (const e of snap.lastEvents) {
    if (e.undone || (e.type !== "SOLD" && e.type !== "UNSOLD") || typeof e.payload.lotId !== "string") continue;
    const live = snap.state.lots[e.payload.lotId];
    // The event must still match the state: guards against requeues and a stale undone flag.
    const holds = e.type === "SOLD" ? live?.status === "sold" && live.soldTo === e.payload.teamId : live?.status === "unsold";
    if (holds) push(e.payload.lotId);
  }

  const olderSales = Object.values(snap.state.lots)
    .filter((l) => l.status === "sold" && !seen.has(l.id))
    .sort((a, b) => (b.soldOrder ?? 0) - (a.soldOrder ?? 0));
  for (const l of olderSales) push(l.id);
  return out;
}

/**
 * The next n queued lots in running order: queued lots in snap.lots (sort_order) order.
 * Same walk as nextQueuedLot in rules.ts, which picks the console's "Next lot",
 * so the first card is always the lot the operator opens next.
 */
export const nextLots = (snap: Snapshot, n = 3): LotView[] => upcoming(snap, n);
