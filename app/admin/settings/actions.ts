"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import { seasons, teams } from "@/lib/db/schema";
import { getSettingsSeason } from "@/lib/registration/queries";
import { leagueSettingsSchema, teamSchema, type TeamInput } from "@/lib/registration/settings";

function back(params: string): never {
  revalidatePath("/admin/settings");
  revalidatePath("/register");
  redirect(`/admin/settings?${params}`);
}

const fail = (msg: string) => back(`error=${encodeURIComponent(msg)}`);

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

export async function saveLeagueSettings(formData: FormData) {
  await requireAdmin();
  const parsed = leagueSettingsSchema.safeParse({
    fee_text: text(formData, "fee_text"),
    etransfer_email: text(formData, "etransfer_email"),
    registration_open: formData.get("registration_open") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const season = await getSettingsSeason();
    if (!season) return fail("No season found.");
    // `||` merges top-level keys and leaves any others in config alone.
    await getDb()
      .update(seasons)
      .set({ config: sql`${seasons.config} || ${JSON.stringify(parsed.data)}::jsonb` })
      .where(eq(seasons.id, season.id));
  } catch (err) {
    console.error("saveLeagueSettings failed", err);
    return fail("Could not save right now. Try again in a minute.");
  }
  return back("saved=league");
}

export async function saveTeams(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("id").filter((v): v is string => typeof v === "string");
  const rows: TeamInput[] = [];
  for (const id of ids) {
    const parsed = teamSchema.safeParse({
      id,
      name: text(formData, `name_${id}`),
      short: text(formData, `short_${id}`),
      colour: text(formData, `colour_${id}`),
      logoUrl: text(formData, `logo_${id}`),
    });
    if (!parsed.success) return fail(`${text(formData, `name_${id}`) || "Team"}: ${parsed.error.issues[0].message}`);
    rows.push(parsed.data);
  }

  try {
    const season = await getSettingsSeason();
    if (!season) return fail("No season found.");
    await getDb().transaction(async (tx) => {
      for (const t of rows) {
        // seasonId in the where clause: only teams of this season can be edited.
        await tx
          .update(teams)
          .set({ name: t.name, short: t.short, colour: t.colour, logoUrl: t.logoUrl })
          .where(and(eq(teams.id, t.id), eq(teams.seasonId, season.id)));
      }
    });
  } catch (err) {
    console.error("saveTeams failed", err);
    return fail("Could not save right now. Try again in a minute.");
  }
  return back("saved=teams");
}
