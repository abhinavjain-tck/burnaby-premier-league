/** Shapes the server sends to phones. No server imports: the browser uses these too. */
import type { AuctionConfig } from "./config";
import type { AuctionEvent, AuctionState } from "./reducer";

export type AuctionMode = "test" | "live";

export type TeamMeta = { id: string; name: string; short: string; colour: string; purseStart: number };

/** Public card fields copied into auction_lots.card when the lot is seeded. Never phone or email. */
export type CardSnapshot = {
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  bio?: string | null;
  stats?: { matches?: number; runs?: number; wickets?: number; best?: string };
  cricheroesUrl?: string | null;
};

export type LotMeta = {
  id: string;
  playerName: string;
  role: string | null;
  tier: string | null;
  photoUrl: string | null;
  card: CardSnapshot;
  setName: string;
  order: number;
  /** Seeded base. The live base (after a requeue) is state.lots[id].base. */
  base: number;
};

/** One auction_events row as phones see it. `actor` is left out of public payloads. */
export type EventRow = { seq: number; type: string; payload: Record<string, unknown>; undone: boolean; at: string; actor?: string };

export type AuctionInfo = { id: string; name: string; mode: AuctionMode; seasonId: number; version: number };

export type Snapshot = {
  auction: AuctionInfo;
  config: AuctionConfig;
  teams: TeamMeta[];
  /** Ordered by sort_order. */
  lots: LotMeta[];
  /** Reducer state after replaying every live event. Phones apply new events to this. */
  state: AuctionState;
  /** Lot on the block, if any. Same as state.onBlockLotId. */
  onBlock: string | null;
  /** Newest first. */
  lastEvents: EventRow[];
  undoSeq: number | null;
  redoSeq: number | null;
};

/** The small part that changes on every event. What the polling fallback fetches. */
export type LiveSnapshot = Pick<Snapshot, "auction" | "state" | "onBlock" | "lastEvents" | "undoSeq" | "redoSeq">;

/** Realtime message on channel auction:{id}, event "event". `event: null` means "refetch". */
export type LiveMessage = { version: number; event: EventRow | null };

/** Realtime message on channel auction:{id}, event "clock". Not persisted. */
export type ClockMessage = { type: "CLOCK"; endsAt: number; seconds: number };

/** Anything the console can send. UNDO and REDO become marker rows, not reducer events. */
export type Command = AuctionEvent | { type: "UNDO" } | { type: "REDO" };
