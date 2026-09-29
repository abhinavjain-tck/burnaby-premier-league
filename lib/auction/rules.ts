/**
 * Rules that depend on the auction config (ladder, squad guard, squad size).
 * Checked for new commands only, never on replay: changing the config later
 * must not break an auction that already happened. Pure; the console uses the
 * same functions to grey out buttons.
 */
import { fmt } from "../money";
import { maxBidFor, stepAt, type AuctionConfig } from "./config";
import { AuctionRuleError, type AuctionEvent, type AuctionState } from "./reducer";

const STATUS_WORD: Record<AuctionState["status"], string> = {
  draft: "not started",
  open: "open",
  paused: "paused",
  completed: "finished",
};

/** Why nothing can be bid right now, or null. */
function notOpen(state: AuctionState): string | null {
  return state.status === "open" ? null : `Auction is ${STATUS_WORD[state.status]}`;
}

/** The "+step" amount on the lot on the block: base for the first bid, then current + step. */
export function nextBid(state: AuctionState, config: AuctionConfig): number | null {
  const lot = state.onBlockLotId ? state.lots[state.onBlockLotId] : undefined;
  if (!lot) return null;
  return lot.currentBid === undefined ? lot.base : lot.currentBid + stepAt(config, lot.currentBid);
}

/** Why `teamId` can't bid `amount` on the lot on the block, or null when it can. */
export function bidBlocker(state: AuctionState, config: AuctionConfig, teamId: string, amount: number): string | null {
  const closed = notOpen(state);
  if (closed) return closed;
  const lot = state.onBlockLotId ? state.lots[state.onBlockLotId] : undefined;
  if (!lot) return "No lot on the block";
  const team = state.teams[teamId];
  if (!team) return "Unknown team";
  if (lot.currentTeamId === teamId) return "Already leading";
  if (team.squadSize >= config.maxSquad) return `Squad full (${config.maxSquad})`;
  if (!Number.isInteger(amount) || amount <= 0) return "Enter an amount";
  if (lot.currentBid === undefined) {
    if (amount < lot.base) return `Opening bid is at least ${fmt(lot.base)}`;
    const step = stepAt(config, lot.base);
    if (amount !== lot.base && amount % step !== 0) return `Use steps of ${fmt(step)}`;
  } else {
    if (amount <= lot.currentBid) return `Must beat ${fmt(lot.currentBid)}`;
    const step = stepAt(config, lot.currentBid);
    if (amount % step !== 0) return `Use steps of ${fmt(step)}`;
  }
  const cap = maxBidFor(config, team);
  if (amount > cap) return `Max bid ${fmt(cap)}`;
  return null;
}

export type TeamBidOption = { teamId: string; amount: number | null; reason: string | null };

/** One "+step" button per team, with the reason it's greyed out. */
export function bidOptions(state: AuctionState, config: AuctionConfig, teamIds: string[]): TeamBidOption[] {
  const amount = nextBid(state, config);
  return teamIds.map((teamId) => ({
    teamId,
    amount,
    reason: amount === null ? (notOpen(state) ?? "No lot on the block") : bidBlocker(state, config, teamId, amount),
  }));
}

/** Next queued lot in running order. `order` is the list of lot ids by sort_order. */
export function nextQueuedLot(state: AuctionState, order: string[]): string | null {
  return order.find((id) => state.lots[id]?.status === "queued") ?? null;
}

const fail = (message: string): never => {
  throw new AuctionRuleError(message);
};

/**
 * Throws AuctionRuleError when `event` is not allowed right now.
 * The reducer still runs afterwards and has its own checks (lot states, purse).
 */
export function checkCommand(state: AuctionState, event: AuctionEvent, config: AuctionConfig): void {
  const lot = "lotId" in event ? state.lots[event.lotId] : undefined;
  if ("lotId" in event && !lot) fail("Unknown lot");
  const team = "teamId" in event ? state.teams[event.teamId] : undefined;
  if ("teamId" in event && !team) fail("Unknown team");

  switch (event.type) {
    case "START":
      if (state.status !== "draft") fail("Auction has already started");
      return;
    case "PAUSE":
      if (state.status !== "open") fail("Only an open auction can be paused");
      return;
    case "RESUME":
      if (state.status !== "paused") fail("Auction is not paused");
      return;
    case "COMPLETE":
      if (state.status !== "open" && state.status !== "paused") fail("Auction is not running");
      if (state.onBlockLotId) fail("Finish the lot on the block first");
      return;
    case "PRESOLD":
      if (state.status === "completed") fail("Auction is finished");
      if (!Number.isInteger(event.amount) || event.amount < 0) fail("Enter an amount");
      if (team!.squadSize >= config.maxSquad) fail(`Squad full (${config.maxSquad})`);
      if (event.amount > team!.purseLeft) fail("Team cannot afford this");
      return;
    case "START_LOT": {
      const closed = notOpen(state);
      if (closed) fail(closed);
      return;
    }
    case "BID": {
      if (state.onBlockLotId !== event.lotId) fail("That lot is not on the block");
      const reason = bidBlocker(state, config, event.teamId, event.amount);
      if (reason) fail(reason);
      return;
    }
    case "SOLD": {
      const closed = notOpen(state);
      if (closed) fail(closed);
      if (state.onBlockLotId !== event.lotId) fail("That lot is not on the block");
      if (lot!.currentBid === undefined || !lot!.currentTeamId) fail("No bid yet: record a bid first");
      if (lot!.currentTeamId !== event.teamId || lot!.currentBid !== event.amount) fail("Sale must match the current bid");
      return;
    }
    case "UNSOLD": {
      const closed = notOpen(state);
      if (closed) fail(closed);
      if (lot!.currentBid !== undefined) fail("There is a bid. Sell it, skip it, or undo the bid");
      return;
    }
    case "SKIP":
      if (state.status !== "open" && state.status !== "paused") fail("Auction is not running");
      return;
    case "REQUEUE":
      if (state.status === "completed") fail("Auction is finished");
      if (event.base !== undefined && (!Number.isInteger(event.base) || event.base <= 0)) fail("Base must be a whole number of lakhs");
      return;
    case "ADJUST_PURSE":
      if (!Number.isInteger(event.delta) || event.delta === 0) fail("Enter an amount");
      if (!event.note.trim()) fail("Add a note so the room knows why");
      if (team!.purseLeft + event.delta < 0) fail("Purse can't go below zero");
      return;
    case "NOTE":
      if (!event.text.trim()) fail("Note is empty");
      return;
  }
}
