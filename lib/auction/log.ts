/**
 * The auction_events log: turning rows into reducer events, and working out
 * what Undo and Redo point at. Pure; shared by server and phones.
 *
 * Undo flags the latest live event as undone and appends an UNDO marker.
 * Redo clears the flag on the most recently undone event and appends a REDO marker.
 * Markers never reach the reducer. A new ordinary event wipes the redo stack,
 * so the live events are always a valid history.
 */
import type { AuctionEvent } from "./reducer";

export type MarkerType = "UNDO" | "REDO";

export type LogRow = { seq: number; type: string; payload: unknown; undone: boolean };

export const isMarker = (type: string): type is MarkerType => type === "UNDO" || type === "REDO";

/** DB row → reducer event. The row stores `type` in its own column and the rest in `payload`. */
export const toEvent = (row: { type: string; payload: unknown }): AuctionEvent =>
  ({ ...(row.payload as object), type: row.type }) as AuctionEvent;

/** Reducer event → the two columns we store. */
export function toColumns(event: AuctionEvent): { type: string; payload: Record<string, unknown> } {
  const { type, ...payload } = event;
  return { type, payload };
}

const bySeq = (rows: LogRow[]) => [...rows].sort((a, b) => a.seq - b.seq);

/** Events the reducer should replay, oldest first. */
export const activeEvents = (rows: LogRow[]): Array<{ event: AuctionEvent; undone: boolean }> =>
  bySeq(rows)
    .filter((r) => !r.undone && !isMarker(r.type))
    .map((r) => ({ event: toEvent(r), undone: false }));

/** Seq of the event Undo would flag: the newest ordinary event that is still live. */
export function undoTarget(rows: LogRow[]): number | null {
  const sorted = bySeq(rows);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i];
    if (!isMarker(r.type) && !r.undone) return r.seq;
  }
  return null;
}

const targetOf = (row: LogRow): number | null => {
  const seq = (row.payload as { seq?: unknown } | null)?.seq;
  return typeof seq === "number" ? seq : null;
};

/** Seq of the event Redo would restore, or null when there is nothing to redo. */
export function redoTarget(rows: LogRow[]): number | null {
  const stack: number[] = [];
  for (const r of bySeq(rows)) {
    if (!isMarker(r.type)) {
      stack.length = 0; // a new action after an undo means the undone one is gone for good
    } else if (r.type === "UNDO") {
      const t = targetOf(r);
      if (t !== null) stack.push(t);
    } else {
      const t = targetOf(r);
      const at = t === null ? -1 : stack.lastIndexOf(t);
      if (at >= 0) stack.splice(at, 1);
    }
  }
  const top = stack.at(-1);
  if (top === undefined) return null;
  // Only if the row really is still undone (guards against hand edits).
  return rows.some((r) => r.seq === top && r.undone) ? top : null;
}

/** The log after flagging (or unflagging) one event. */
export const withUndone = <T extends LogRow>(rows: T[], seq: number, undone: boolean): T[] =>
  rows.map((r) => (r.seq === seq ? { ...r, undone } : r));
