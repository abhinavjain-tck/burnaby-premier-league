/**
 * The decision part of a console command, with no database in sight.
 * lib/auction/commands.ts loads rows, calls these, and writes what they return.
 */
import { stateFrom, type EventDbRow, type LotRow, type TeamRow } from "./build";
import { requeueBase, type AuctionConfig } from "./config";
import { redoTarget, toColumns, undoTarget, withUndone } from "./log";
import { apply, AuctionRuleError, type AuctionState, type LotStatus } from "./reducer";
import { checkCommand } from "./rules";
import type { Command } from "./types";

export class VersionConflict extends Error {
  constructor(readonly currentVersion: number) {
    super("Board changed, refreshed");
    this.name = "VersionConflict";
  }
}

/**
 * Should this command run? A retry of a command that already landed is a no-op,
 * even though its expectedVersion is now stale, so check the key first.
 */
export function admit(a: { currentVersion: number; expectedVersion: number; duplicate: boolean }): "duplicate" | "run" {
  if (a.duplicate) return "duplicate";
  if (a.currentVersion !== a.expectedVersion) throw new VersionConflict(a.currentVersion);
  return "run";
}

export type Plan = {
  /** The row to append at seq = version + 1. */
  row: { type: string; payload: Record<string, unknown> };
  /** For UNDO/REDO: the earlier row whose undone flag changes. */
  flip?: { seq: number; undone: boolean };
  /** State after the command. */
  next: AuctionState;
};

type Input = { teams: TeamRow[]; lots: LotRow[]; events: EventDbRow[]; config: AuctionConfig };

function replayOrFail(input: Input, events: EventDbRow[], what: string): AuctionState {
  try {
    return stateFrom(input.teams, input.lots, events);
  } catch (err) {
    if (err instanceof AuctionRuleError) throw new AuctionRuleError(`Can't ${what}: ${err.message}`);
    throw err;
  }
}

export function plan(input: Input, cmd: Command): Plan {
  if (cmd.type === "UNDO" || cmd.type === "REDO") {
    const undo = cmd.type === "UNDO";
    const target = undo ? undoTarget(input.events) : redoTarget(input.events);
    if (target === null) throw new AuctionRuleError(undo ? "Nothing to undo" : "Nothing to redo");
    const next = replayOrFail(input, withUndone(input.events, target, undo), undo ? "undo" : "redo");
    return { row: { type: cmd.type, payload: { seq: target } }, flip: { seq: target, undone: undo }, next };
  }

  const state = replayOrFail(input, input.events, "load the auction");
  let event = cmd;
  if (cmd.type === "REQUEUE" && cmd.base === undefined) {
    // Store the base in the event, so a later config change can't rewrite history.
    const seeded = input.lots.find((l) => l.id === cmd.lotId);
    if (seeded) event = { ...cmd, base: requeueBase(input.config, seeded.baseLakhs) };
  }
  checkCommand(state, event, input.config);
  return { row: toColumns(event), next: apply(state, event) };
}

// ---- projections: the columns on auction_teams / auction_lots that mirror state ----

export type TeamProjection = { id: string; purseLeftLakhs: number; squadSize: number };
export type LotProjection = {
  id: string;
  status: LotStatus;
  currentBidLakhs: number | null;
  currentTeamId: string | null;
  soldToTeamId: string | null;
  priceLakhs: number | null;
};

export function teamProjection(state: AuctionState, id: string, purseStart: number): TeamProjection {
  const t = state.teams[id];
  return { id, purseLeftLakhs: t?.purseLeft ?? purseStart, squadSize: t?.squadSize ?? 0 };
}

export function lotProjection(state: AuctionState, id: string): LotProjection {
  const l = state.lots[id];
  return {
    id,
    status: l?.status ?? "queued",
    currentBidLakhs: l?.currentBid ?? null,
    currentTeamId: l?.currentTeamId ?? null,
    soldToTeamId: l?.soldTo ?? null,
    priceLakhs: l?.price ?? null,
  };
}

const same = <T extends object>(a: T, b: T): boolean =>
  (Object.keys(a) as Array<keyof T>).every((k) => (a[k] ?? null) === (b[k] ?? null));

/** Only the rows whose projection differs from what the DB has now. Self-heals stale rows too. */
export function projectionChanges(
  state: AuctionState,
  teams: Array<TeamProjection & { purseStartLakhs: number }>,
  lots: LotProjection[],
): { teams: TeamProjection[]; lots: LotProjection[] } {
  return {
    teams: teams
      .map((t) => ({ now: { id: t.id, purseLeftLakhs: t.purseLeftLakhs, squadSize: t.squadSize }, want: teamProjection(state, t.id, t.purseStartLakhs) }))
      .filter(({ now, want }) => !same(now, want))
      .map(({ want }) => want),
    lots: lots
      .map((l) => ({ now: l, want: lotProjection(state, l.id) }))
      .filter(({ now, want }) => !same(want, now))
      .map(({ want }) => want),
  };
}
