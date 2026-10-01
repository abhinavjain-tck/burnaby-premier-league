/**
 * "Team so far": captain and bought players per team, straight from the snapshot
 * the board already keeps live. Pure; only public lot fields (no phone, no email).
 */
import type { Snapshot } from "./types";
import { teamById, teamStats, type TeamStats } from "./view";

export type SquadPlayer = {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string | null;
  tier: string | null;
  price: number;
  captain: boolean;
  stats: { matches?: number; runs?: number; wickets?: number };
};

export type Squad = {
  team: TeamStats;
  captain: SquadPlayer | null;
  /** Captain first, then everyone else in the order they were bought. */
  players: SquadPlayer[];
  spent: number;
  purseLeft: number;
  size: number;
  maxSquad: number;
  /** Players still needed to reach the minimum squad. */
  needed: number;
};

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Lot id of the team's captain. The team's named captain (teams.captain_registration_id) when
 * that lot sits with the team; otherwise the first lot pre-sold to it that still sits with it.
 */
export function captainLotId(snap: Snapshot, teamId: string): string | null {
  const withTeam = (id: string) => snap.state.lots[id]?.status === "sold" && snap.state.lots[id]?.soldTo === teamId;
  const named = snap.teams.find((t) => t.id === teamId)?.captainLotId;
  if (named && withTeam(named)) return named;
  return (snap.presold ?? []).find(withTeam) ?? null;
}

/** Captain's name and photo for a team card, or null when nobody is linked. */
export function captainOf(snap: Snapshot, teamId: string): { name: string; photoUrl: string | null } | null {
  const id = captainLotId(snap, teamId);
  const lot = id ? snap.lots.find((l) => l.id === id) : undefined;
  return lot ? { name: lot.playerName, photoUrl: lot.photoUrl } : null;
}

export function squadOf(snap: Snapshot, teamId: string): Squad | null {
  const meta = teamById(snap, teamId);
  if (!meta) return null;
  const team = teamStats(snap, meta);
  const captainId = captainLotId(snap, teamId);

  const players: SquadPlayer[] = snap.lots
    .map((l) => ({ meta: l, live: snap.state.lots[l.id] }))
    .filter(({ live }) => live?.status === "sold" && live.soldTo === teamId)
    .sort((a, b) => {
      if (a.meta.id === captainId) return -1;
      if (b.meta.id === captainId) return 1;
      return (a.live.soldOrder ?? 0) - (b.live.soldOrder ?? 0);
    })
    .map(({ meta: l, live }) => {
      const s = l.card?.stats ?? {};
      return {
        id: l.id,
        name: l.playerName,
        photoUrl: l.photoUrl,
        role: l.role,
        tier: l.tier,
        price: live.price ?? 0,
        captain: l.id === captainId,
        stats: { matches: num(s.matches), runs: num(s.runs), wickets: num(s.wickets) },
      };
    });

  return {
    team,
    captain: players.find((p) => p.captain) ?? null,
    players,
    spent: players.reduce((sum, p) => sum + p.price, 0),
    purseLeft: team.purseLeft,
    size: team.squadSize,
    maxSquad: snap.config.maxSquad,
    needed: Math.max(0, snap.config.minSquad - team.squadSize),
  };
}
