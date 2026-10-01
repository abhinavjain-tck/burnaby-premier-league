/**
 * Build reducer state and snapshots from DB rows. Pure: the server calls it
 * with rows it loaded, tests call it with plain objects.
 */
import type { AuctionConfig } from "./config";
import { activeEvents, redoTarget, undoTarget, type LogRow } from "./log";
import { replay, type AuctionState } from "./reducer";
import type { AuctionInfo, CardSnapshot, EventRow, LiveSnapshot, LotMeta, Snapshot, TeamMeta } from "./types";

export type TeamRow = {
  id: string;
  name: string;
  short: string;
  colour: string;
  purseStartLakhs: number;
  logoUrl?: string | null;
  /** From the real team (teams.captain_registration_id). Null for made-up teams. */
  captainRegistrationId?: string | null;
};

export type LotRow = {
  id: string;
  playerName: string;
  role: string | null;
  tier: string | null;
  photoUrl: string | null;
  card: unknown;
  setName: string;
  sortOrder: number;
  baseLakhs: number;
  /** Null for made-up players. Never sent to phones. */
  registrationId?: string | null;
};

export type EventDbRow = { seq: number; type: string; payload: unknown; undone: boolean; at: Date | string | null; actorEmail: string };

export const byOrder = <T extends { sortOrder: number }>(lots: T[]): T[] => [...lots].sort((a, b) => a.sortOrder - b.sortOrder);

/** Everyone starts with a full purse and every lot queued. */
export function initialState(teams: TeamRow[], lots: LotRow[]): AuctionState {
  return {
    version: 0,
    status: "draft",
    teams: Object.fromEntries(teams.map((t) => [t.id, { id: t.id, name: t.name, purseLeft: t.purseStartLakhs, squadSize: 0 }])),
    lots: Object.fromEntries(
      lots.map((l) => [l.id, { id: l.id, playerName: l.playerName, base: l.baseLakhs, order: l.sortOrder, status: "queued" as const }]),
    ),
  };
}

/** Current state: replay of every live event. Throws AuctionRuleError if the log is broken. */
export const stateFrom = (teams: TeamRow[], lots: LotRow[], events: EventDbRow[]): AuctionState =>
  replay(initialState(teams, lots), activeEvents(events));

const toIso = (at: Date | string | null): string => (at instanceof Date ? at.toISOString() : (at ?? new Date(0).toISOString()));

/** Row for phones. Public boards never see who pressed the button. */
export function eventRow(e: EventDbRow, withActor: boolean): EventRow {
  const row: EventRow = { seq: e.seq, type: e.type, payload: (e.payload ?? {}) as Record<string, unknown>, undone: e.undone, at: toIso(e.at) };
  if (withActor) row.actor = e.actorEmail;
  return row;
}

function teamMeta(t: TeamRow, lots: LotRow[]): TeamMeta {
  const captain = t.captainRegistrationId ? lots.find((l) => l.registrationId === t.captainRegistrationId) : undefined;
  return {
    id: t.id,
    name: t.name,
    short: t.short.trim(),
    colour: t.colour,
    purseStart: t.purseStartLakhs,
    logoUrl: t.logoUrl ?? null,
    captainLotId: captain?.id ?? null,
  };
}

const lotMeta = (l: LotRow): LotMeta => ({
  id: l.id,
  playerName: l.playerName,
  role: l.role,
  tier: l.tier?.trim() || null,
  photoUrl: l.photoUrl,
  card: (l.card ?? {}) as CardSnapshot,
  setName: l.setName,
  order: l.sortOrder,
  base: l.baseLakhs,
});

export type SnapshotInput = {
  auction: AuctionInfo;
  config: AuctionConfig;
  teams: TeamRow[];
  lots: LotRow[];
  events: EventDbRow[];
  /** Pass it when you already replayed, to skip a second replay. */
  state?: AuctionState;
  eventLimit?: number;
  withActor?: boolean;
};

/**
 * Lots placed on a team by a live PRESOLD event, oldest first. The first one per
 * team is its owner/captain (the admin pre-sells owners before lot 1).
 */
export const presoldLots = (events: LogRow[]): string[] =>
  activeEvents(events)
    .map((r) => r.event)
    .flatMap((e) => (e.type === "PRESOLD" ? [e.lotId] : []));

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const { auction, config, teams, lots, events, eventLimit = 10, withActor = false } = input;
  const state = input.state ?? stateFrom(teams, lots, events);
  const newestFirst = [...events].sort((a, b) => b.seq - a.seq);
  return {
    auction,
    config,
    teams: teams.map((t) => teamMeta(t, lots)),
    lots: byOrder(lots).map(lotMeta),
    state,
    onBlock: state.onBlockLotId ?? null,
    presold: presoldLots(events),
    lastEvents: newestFirst.slice(0, eventLimit).map((e) => eventRow(e, withActor)),
    undoSeq: undoTarget(events),
    redoSeq: redoTarget(events),
  };
}

/** Drop the parts that only change when lots are seeded. */
export const liveOf = (s: Snapshot): LiveSnapshot => ({
  auction: s.auction,
  state: s.state,
  onBlock: s.onBlock,
  presold: s.presold,
  lastEvents: s.lastEvents,
  undoSeq: s.undoSeq,
  redoSeq: s.redoSeq,
});
