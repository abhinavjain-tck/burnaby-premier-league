import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Viewer } from "../auth/roles";
import { getDb } from "../db/client";
import { auctionAdmins, auctions, auctionTeams, teamOwners } from "../db/schema";

/** League admins can run any auction; otherwise the email must be on this auction's admin list. */
export async function canOperate(viewer: Viewer | null, auctionId: string): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.role) return true;
  const [row] = await getDb()
    .select({ email: auctionAdmins.email })
    .from(auctionAdmins)
    .where(and(eq(auctionAdmins.auctionId, auctionId), eq(sql`lower(${auctionAdmins.email})`, viewer.email)))
    .limit(1);
  return Boolean(row);
}

/** auction_teams ids this viewer owns in a live auction (via team_owners). Empty for test auctions. */
export async function ownedTeamIds(viewer: Viewer | null, auctionId: string): Promise<string[]> {
  if (!viewer) return [];
  const rows = await getDb()
    .select({ id: auctionTeams.id })
    .from(auctionTeams)
    .innerJoin(auctions, eq(auctions.id, auctionTeams.auctionId))
    .innerJoin(teamOwners, eq(teamOwners.teamId, auctionTeams.teamId))
    .where(and(eq(auctionTeams.auctionId, auctionId), eq(auctions.mode, "live"), eq(sql`lower(${teamOwners.email})`, viewer.email)));
  return rows.map((r) => r.id);
}
