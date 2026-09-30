"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkRoleChange, parseAdminEmail, parseRole } from "@/lib/auth/admins";
import { parseEmailList, requireSuperAdmin, type Role } from "@/lib/auth/roles";
import type { FormResult } from "@/lib/auction/form";
import { getDb } from "@/lib/db/client";
import { userRoles } from "@/lib/db/schema";

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

/** Runs the guards and the write in one transaction, so two super admins can't race past the "last one" check. */
async function change(actor: string, target: string, to: Role | "remove"): Promise<FormResult> {
  const envSupers = parseEmailList(process.env.SUPER_ADMIN_EMAILS);
  try {
    const error = await getDb().transaction(async (tx) => {
      // Lock the table so concurrent changes line up.
      await tx.execute(sql`lock table ${userRoles} in share row exclusive mode`);
      const rows = await tx.select({ email: userRoles.email, role: userRoles.role }).from(userRoles);
      const blocked = checkRoleChange({ actor, target, to, envSupers, rows });
      if (blocked) return blocked;
      // Match on lower(email): older rows may not be lowercase.
      await tx.delete(userRoles).where(eq(sql`lower(${userRoles.email})`, target));
      if (to !== "remove") await tx.insert(userRoles).values({ email: target, role: to });
      return null;
    });
    if (error) return { ok: false, message: error };
  } catch (err) {
    console.error("admins change failed", err);
    return { ok: false, message: "Could not save right now. Try again in a minute." };
  }
  revalidatePath("/admin/admins");
  return {
    ok: true,
    message: to === "remove" ? `Removed ${target}.` : `${target} is now ${to === "super_admin" ? "a super admin" : "an admin"}.`,
  };
}

/** Add someone, or change their role if they are already on the list. */
export async function saveAdmin(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const me = await requireSuperAdmin();
  const email = parseAdminEmail(text(formData, "email"));
  if (!email.ok) return { ok: false, message: email.message };
  const role = parseRole(text(formData, "role"));
  if (!role) return { ok: false, message: "Pick a role." };
  return change(me.email, email.email, role);
}

export async function removeAdmin(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const me = await requireSuperAdmin();
  const email = parseAdminEmail(text(formData, "email"));
  if (!email.ok) return { ok: false, message: email.message };
  return change(me.email, email.email, "remove");
}
