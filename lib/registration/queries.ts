import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { playerRegistrations, regStatus, seasons, teams } from "../db/schema";

export type Registration = typeof playerRegistrations.$inferSelect;
export type RegStatus = Registration["status"];
export type Stats = { matches?: number; runs?: number; wickets?: number; best?: string };

export const REG_STATUSES = regStatus.enumValues;

/** League settings an admin edits in seasons.config (JSON). All optional. */
export type SeasonConfig = {
  fee_text?: string; // e.g. "$60 per player"
  etransfer_email?: string; // where players send the e-Transfer
  registration_open?: boolean; // false closes /register (missing means open)
};

export type FeeInfo = { text?: string; email?: string };

export const feeFrom = (config: unknown): FeeInfo => {
  const c = (config ?? {}) as SeasonConfig;
  return { text: c.fee_text || undefined, email: c.etransfer_email || undefined };
};

/** The season currently taking registrations, or null if none is open. */
export async function getActiveSeason() {
  const [row] = await getDb()
    .select({ id: seasons.id, name: seasons.name, config: seasons.config })
    .from(seasons)
    .where(eq(seasons.status, "registration"))
    .orderBy(desc(seasons.id))
    .limit(1);
  return row ?? null;
}

/** Fee details for the registration form: from the open season, else the newest season. */
export async function getFeeInfo(): Promise<FeeInfo> {
  const [row] = await getDb().select({ config: seasons.config }).from(seasons).orderBy(desc(seasons.status), desc(seasons.id)).limit(1);
  return feeFrom(row?.config);
}

/** The season the settings page edits: the open one, else the newest. */
export async function getSettingsSeason() {
  const [row] = await getDb()
    .select({ id: seasons.id, name: seasons.name, config: seasons.config })
    .from(seasons)
    .orderBy(desc(seasons.status), desc(seasons.id))
    .limit(1);
  return row ?? null;
}

export async function listTeams(seasonId: number) {
  return getDb().select().from(teams).where(eq(teams.seasonId, seasonId)).orderBy(teams.name);
}

export async function getRegistrationByToken(token: string): Promise<Registration | null> {
  const [row] = await getDb().select().from(playerRegistrations).where(eq(playerRegistrations.editToken, token)).limit(1);
  return row ?? null;
}

export async function getRegistrationById(id: string): Promise<Registration | null> {
  const [row] = await getDb().select().from(playerRegistrations).where(eq(playerRegistrations.id, id)).limit(1);
  return row ?? null;
}

/** Name of the team this player captains, or null. */
export async function captainTeamOf(registrationId: string): Promise<string | null> {
  const [row] = await getDb().select({ name: teams.name }).from(teams).where(eq(teams.captainRegistrationId, registrationId)).limit(1);
  return row?.name ?? null;
}

/** Players in the auction pool: confirmed and not a team's captain. */
export const poolCount = (rows: Array<{ status: string; captainOf: string | null }>): number =>
  rows.filter((r) => r.status === "confirmed" && !r.captainOf).length;

/** Admin list. Newest first. */
export async function listRegistrations(status?: RegStatus) {
  return getDb()
    .select({
      id: playerRegistrations.id,
      fullName: playerRegistrations.fullName,
      role: playerRegistrations.role,
      tier: playerRegistrations.tier,
      status: playerRegistrations.status,
      paidAt: playerRegistrations.paidAt,
      phone: playerRegistrations.phone,
      captainOf: teams.name,
    })
    .from(playerRegistrations)
    .leftJoin(teams, eq(teams.captainRegistrationId, playerRegistrations.id))
    .where(status ? eq(playerRegistrations.status, status) : undefined)
    .orderBy(desc(playerRegistrations.createdAt));
}
