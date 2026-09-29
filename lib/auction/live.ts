/**
 * How a phone folds realtime messages into its snapshot. Pure, so it's tested
 * without a browser. Realtime is a hint; when anything looks off we refetch.
 */
import { isMarker, toEvent } from "./log";
import { apply, AuctionRuleError } from "./reducer";
import type { LiveMessage, LiveSnapshot, Snapshot } from "./types";

export type LiveResult =
  | { kind: "applied"; snapshot: Snapshot }
  | { kind: "stale" } // already have it: ignore
  | { kind: "refetch" } // gap, undo/redo, or something we can't apply
  | { kind: "reload" }; // lots or teams changed: fetch everything

/** Event types that close the "going once" clock on the board. */
export const CLOCK_STOPPERS = new Set(["BID", "SOLD", "UNSOLD", "SKIP", "START_LOT", "PAUSE", "COMPLETE"]);

export function applyLive(snap: Snapshot, msg: LiveMessage, eventLimit = 10): LiveResult {
  if (msg.reload) return { kind: "reload" };
  const local = snap.auction.version;
  if (msg.version <= local) return { kind: "stale" };
  const row = msg.event;
  if (msg.version !== local + 1 || !row || row.seq !== msg.version || isMarker(row.type)) return { kind: "refetch" };
  try {
    const state = apply(snap.state, toEvent(row));
    return {
      kind: "applied",
      snapshot: {
        ...snap,
        auction: { ...snap.auction, version: msg.version },
        state,
        onBlock: state.onBlockLotId ?? null,
        lastEvents: [row, ...snap.lastEvents].slice(0, eventLimit),
        undoSeq: row.seq,
        redoSeq: null, // any new action clears redo
      },
    };
  } catch (err) {
    if (err instanceof AuctionRuleError) return { kind: "refetch" };
    throw err;
  }
}

/** Put a freshly polled live part on top of what we have. Ignores anything older. */
export function mergeLive(snap: Snapshot, live: LiveSnapshot): Snapshot {
  if (live.auction.version < snap.auction.version) return snap;
  return { ...snap, ...live };
}

/** True when the lots or teams in `live` don't match our metadata, so we need a full fetch. */
export function needsFullFetch(snap: Snapshot, live: LiveSnapshot): boolean {
  const lotIds = Object.keys(live.state.lots);
  const teamIds = Object.keys(live.state.teams);
  if (lotIds.length !== snap.lots.length || teamIds.length !== snap.teams.length) return true;
  const known = new Set(snap.lots.map((l) => l.id));
  if (!lotIds.every((id) => known.has(id))) return true;
  // A shuffle changes the running order without touching lot ids.
  return snap.lots.some((l) => live.state.lots[l.id]?.order !== l.order);
}
