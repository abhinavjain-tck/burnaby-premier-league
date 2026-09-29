"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/roles";
import { getDb } from "@/lib/db/client";
import { playerRegistrations } from "@/lib/db/schema";
import { TIERS } from "@/lib/registration/options";
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
