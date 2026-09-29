/**
 * Pure auction reducer. The server and every phone run the same function
 * over the same auction_events rows (skipping undone ones), so they always agree.
 * See docs/design.html → "Undo and redo".
 */
export type LotStatus = "queued" | "on_block" | "sold" | "unsold" | "skipped";

export interface Team {
  id: string;
  name: string;
  purseLeft: number; // lakhs
  squadSize: number;
}

export interface Lot {
  id: string;
  playerName: string;
  base: number; // lakhs
  order: number;
  status: LotStatus;
  currentBid?: number;
  currentTeamId?: string;
  soldTo?: string;
  price?: number;
  /** state.version when it sold, so the board can list sales newest first. */
  soldOrder?: number;
}

export interface AuctionState {
  version: number;
  status: "draft" | "open" | "paused" | "completed";
  teams: Record<string, Team>;
  lots: Record<string, Lot>;
  onBlockLotId?: string;
}

export type AuctionEvent =
  | { type: "START"; }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "COMPLETE" }
  | { type: "PRESOLD"; lotId: string; teamId: string; amount: number }
  | { type: "START_LOT"; lotId: string }
  | { type: "BID"; lotId: string; teamId: string; amount: number }
  | { type: "SOLD"; lotId: string; teamId: string; amount: number }
  | { type: "UNSOLD"; lotId: string }
  | { type: "SKIP"; lotId: string }
  | { type: "REQUEUE"; lotId: string; base?: number }
  | { type: "ADJUST_PURSE"; teamId: string; delta: number; note: string }
  | { type: "NOTE"; text: string };

export class AuctionRuleError extends Error {}

function lotOf(s: AuctionState, id: string): Lot {
  const l = s.lots[id];
  if (!l) throw new AuctionRuleError(`Unknown lot ${id}`);
  return l;
}
function teamOf(s: AuctionState, id: string): Team {
  const t = s.teams[id];
  if (!t) throw new AuctionRuleError(`Unknown team ${id}`);
  return t;
}

/** Structural clone that works in every runtime we target. */
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Apply one event and return the new state. Never mutates `prev`. Throws AuctionRuleError on an illegal move. */
export function apply(prev: AuctionState, e: AuctionEvent): AuctionState {
  return step(clone(prev), e);
}

/** Mutates `s` in place. Only called on a private copy. */
function step(s: AuctionState, e: AuctionEvent): AuctionState {
  s.version += 1;
  switch (e.type) {
    case "START": s.status = "open"; return s;
    case "PAUSE": s.status = "paused"; return s;
    case "RESUME": s.status = "open"; return s;
    case "COMPLETE": s.status = "completed"; return s;
    case "NOTE": return s;

    case "PRESOLD": {
      const lot = lotOf(s, e.lotId); const team = teamOf(s, e.teamId);
      if (lot.status !== "queued") throw new AuctionRuleError("Only queued lots can be pre-sold");
      lot.status = "sold"; lot.soldTo = team.id; lot.price = e.amount; lot.soldOrder = s.version;
      team.purseLeft -= e.amount; team.squadSize += 1;
      return s;
    }
    case "START_LOT": {
      if (s.onBlockLotId) throw new AuctionRuleError("A lot is already on the block");
      const lot = lotOf(s, e.lotId);
      if (lot.status !== "queued") throw new AuctionRuleError("Lot is not queued");
      lot.status = "on_block"; lot.currentBid = undefined; lot.currentTeamId = undefined;
      s.onBlockLotId = lot.id;
      return s;
    }
    case "BID": {
      const lot = lotOf(s, e.lotId); const team = teamOf(s, e.teamId);
      if (lot.status !== "on_block") throw new AuctionRuleError("Lot is not on the block");
      const floor = lot.currentBid ?? lot.base;
      if (lot.currentBid !== undefined && e.amount <= lot.currentBid) throw new AuctionRuleError("Bid must beat the current bid");
      if (e.amount < floor) throw new AuctionRuleError("Bid is below base");
      if (e.amount > team.purseLeft) throw new AuctionRuleError("Team cannot afford this bid");
      lot.currentBid = e.amount; lot.currentTeamId = team.id;
      return s;
    }
    case "SOLD": {
      const lot = lotOf(s, e.lotId); const team = teamOf(s, e.teamId);
      if (lot.status !== "on_block") throw new AuctionRuleError("Lot is not on the block");
      if (e.amount > team.purseLeft) throw new AuctionRuleError("Team cannot afford this sale");
      lot.status = "sold"; lot.soldTo = team.id; lot.price = e.amount; lot.soldOrder = s.version;
      lot.currentBid = undefined; lot.currentTeamId = undefined;
      team.purseLeft -= e.amount; team.squadSize += 1;
      s.onBlockLotId = undefined;
      return s;
    }
    case "UNSOLD": case "SKIP": {
      const lot = lotOf(s, e.lotId);
      if (lot.status !== "on_block") throw new AuctionRuleError("Lot is not on the block");
      lot.status = e.type === "UNSOLD" ? "unsold" : "skipped";
      lot.currentBid = undefined; lot.currentTeamId = undefined;
      s.onBlockLotId = undefined;
      return s;
    }
    case "REQUEUE": {
      const lot = lotOf(s, e.lotId);
      if (lot.status !== "unsold" && lot.status !== "skipped") throw new AuctionRuleError("Only unsold or skipped lots can be requeued");
      lot.status = "queued"; if (e.base !== undefined) lot.base = e.base;
      return s;
    }
    case "ADJUST_PURSE": {
      teamOf(s, e.teamId).purseLeft += e.delta;
      return s;
    }
  }
}

/** Rebuild state from the event log, skipping undone events. */
export function replay(initial: AuctionState, events: Array<{ event: AuctionEvent; undone: boolean }>): AuctionState {
  // One copy up front, then mutate: replaying 1,500 events stays well under a millisecond.
  return events.filter((r) => !r.undone).reduce((s, r) => step(s, r.event), clone(initial));
}
