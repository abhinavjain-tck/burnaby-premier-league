/** Read-only selectors the board, console and owner view share. */
import { fmt } from "../money";
import { maxBidFor } from "./config";
import type { Lot } from "./reducer";
import type { EventRow, LotMeta, Snapshot, TeamMeta } from "./types";

export type LotView = LotMeta & { live: Lot };

export const lotView = (snap: Snapshot, id: string | null | undefined): LotView | null => {
  const meta = id ? snap.lots.find((l) => l.id === id) : undefined;
  const live = id ? snap.state.lots[id] : undefined;
  return meta && live ? { ...meta, live } : null;
};

export const teamById = (snap: Snapshot, id: string | null | undefined): TeamMeta | undefined =>
  id ? snap.teams.find((t) => t.id === id) : undefined;

export type TeamStats = TeamMeta & { purseLeft: number; squadSize: number; maxBid: number; roles: Record<string, number> };

export function teamStats(snap: Snapshot, team: TeamMeta): TeamStats {
  const live = snap.state.teams[team.id] ?? { purseLeft: team.purseStart, squadSize: 0 };
  const roles: Record<string, number> = { batter: 0, bowler: 0, all_rounder: 0, wicket_keeper: 0 };
  for (const l of snap.lots) {
    if (snap.state.lots[l.id]?.soldTo === team.id && l.role) roles[l.role] = (roles[l.role] ?? 0) + 1;
  }
  return { ...team, purseLeft: live.purseLeft, squadSize: live.squadSize, maxBid: maxBidFor(snap.config, live), roles };
}

/** Teams, richest first (the board's purse table). */
export const pursesByRemaining = (snap: Snapshot): TeamStats[] =>
  snap.teams.map((t) => teamStats(snap, t)).sort((a, b) => b.purseLeft - a.purseLeft || a.name.localeCompare(b.name));

/** Sold lots, latest sale first. */
export const soldFeed = (snap: Snapshot): LotView[] =>
  snap.lots
    .map((l) => ({ ...l, live: snap.state.lots[l.id] }))
    .filter((l): l is LotView => l.live?.status === "sold")
    .sort((a, b) => (b.live.soldOrder ?? 0) - (a.live.soldOrder ?? 0));

/** Next n queued lots in running order. */
export const upcoming = (snap: Snapshot, n: number): LotView[] =>
  snap.lots
    .map((l) => ({ ...l, live: snap.state.lots[l.id] }))
    .filter((l): l is LotView => l.live?.status === "queued")
    .slice(0, n);

/** Lots still to go under the hammer (queued plus the one on the block). */
export const remainingCount = (snap: Snapshot): number =>
  Object.values(snap.state.lots).filter((l) => l.status === "queued" || l.status === "on_block").length;

export const ROLE_SHORT: Record<string, string> = { batter: "bat", bowler: "bowl", all_rounder: "AR", wicket_keeper: "WK" };

const STATUS_TEXT: Record<Snapshot["state"]["status"], string> = {
  draft: "Not started",
  open: "Bidding open",
  paused: "Paused",
  completed: "Finished",
};
export const statusText = (snap: Snapshot): string => STATUS_TEXT[snap.state.status];

/** One line per event for the console's event list. */
export function describeEvent(snap: Snapshot, e: EventRow): string {
  const p = e.payload;
  const lot = typeof p.lotId === "string" ? (snap.lots.find((l) => l.id === p.lotId)?.playerName ?? "a lot") : "";
  const team = typeof p.teamId === "string" ? (teamById(snap, p.teamId)?.short ?? "a team") : "";
  const amount = typeof p.amount === "number" ? fmt(p.amount) : "";
  switch (e.type) {
    case "START": return "Auction opened";
    case "PAUSE": return "Paused";
    case "RESUME": return "Resumed";
    case "COMPLETE": return "Auction finished";
    case "START_LOT": return `On the block: ${lot}`;
    case "BID": return `${team} bids ${amount} for ${lot}`;
    case "SOLD": return `SOLD ${lot} to ${team} for ${amount}`;
    case "PRESOLD": return `Pre-sold ${lot} to ${team} for ${amount}`;
    case "UNSOLD": return `Unsold: ${lot}`;
    case "SKIP": return `Skipped: ${lot}`;
    case "REQUEUE": return `Back in the pool: ${lot}${typeof p.base === "number" ? ` at ${fmt(p.base)}` : ""}`;
    case "ADJUST_PURSE": {
      const delta = typeof p.delta === "number" ? p.delta : 0;
      return `${team} purse ${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))}: ${String(p.note ?? "")}`;
    }
    case "NOTE": return `Note: ${String(p.text ?? "")}`;
    case "UNDO": return `Undo #${String(p.seq ?? "?")}`;
    case "REDO": return `Redo #${String(p.seq ?? "?")}`;
    default: return e.type;
  }
}
