"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/roles";
import type { FormResult } from "@/lib/auction/form";
import { getDb, isUniqueViolation } from "@/lib/db/client";
import { playerRegistrations } from "@/lib/db/schema";
import { TIERS } from "@/lib/registration/options";
import { normalisePhone } from "@/lib/registration/validate";
import { createClient } from "@/lib/supabase/server";

const Id = z.uuid();
const r = playerRegistrations;

function done() {
  revalidatePath("/admin/registrations", "layout"); // list and detail
}

/** Tick paid. A registered player becomes confirmed; a withdrawn one stays withdrawn. */
export async function markPaid(id: string) {
  const admin = await requireAdmin();
  if (!Id.safeParse(id).success) return;
  await getDb()
    .update(r)
    .set({
      paidAt: new Date(),
      paidMarkedBy: admin.email,
      status: sql`case when ${r.status} = 'registered' then 'confirmed'::reg_status else ${r.status} end`,
    })
    .where(eq(r.id, id));
  done();
}

export async function setTier(id: string, formData: FormData) {
  await requireAdmin();
  const tier = z.enum(TIERS).safeParse(formData.get("tier"));
  if (!Id.safeParse(id).success || !tier.success) return;
  await getDb().update(r).set({ tier: tier.data }).where(eq(r.id, id));
  done();
}

const Phone = z.string().regex(/^\d{10,15}$/, "Enter the WhatsApp number with area code");

/** Fill in or fix a player's WhatsApp number. Same cleanup and one-per-season rule as /register. */
export async function setPhone(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  if (!Id.safeParse(id).success) return { ok: false, message: "Unknown player." };
  const phone = Phone.safeParse(normalisePhone(String(formData.get("phone") ?? "")));
  if (!phone.success) return { ok: false, message: phone.error.issues[0].message };
  const db = getDb();
  const [me] = await db.select({ seasonId: r.seasonId }).from(r).where(eq(r.id, id)).limit(1);
  if (!me) return { ok: false, message: "Unknown player." };
  const [taken] = await db
    .select({ name: r.fullName })
    .from(r)
    .where(and(eq(r.seasonId, me.seasonId), eq(r.phone, phone.data), ne(r.id, id)))
    .limit(1);
  if (taken) return { ok: false, message: `${taken.name} already has this number.` };
  try {
    await db.update(r).set({ phone: phone.data }).where(eq(r.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "Another player already has this number." };
    throw err;
  }
  done();
  return { ok: true, message: "Phone saved." };
}

export async function withdraw(id: string) {
  await requireAdmin();
  if (!Id.safeParse(id).success) return;
  await getDb().update(r).set({ status: "withdrawn" }).where(eq(r.id, id));
  done();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin");
}
