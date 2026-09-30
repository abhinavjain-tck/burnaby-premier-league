import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isDbConfigured, isSupabaseConfigured } from "../config";
import { getDb } from "../db/client";
import { userRoles } from "../db/schema";
import { createClient } from "../supabase/server";

export type Role = "admin" | "super_admin";
export type Viewer = { email: string; role: Role | null };
export type Admin = Viewer & { role: Role };

/** "A@x.com, b@y.com" → ["a@x.com", "b@y.com"] */
export function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function roleFor(email: string): Promise<Role | null> {
  // Bootstrap: env list works before anyone has written to user_roles.
  if (parseEmailList(process.env.SUPER_ADMIN_EMAILS).includes(email)) return "super_admin";
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(sql`lower(${userRoles.email})`, email))
    .limit(1);
  return row?.role ?? null;
}

/** Signed-in Google user and their role, or null if nobody is signed in. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  await connection(); // per-request, even when Supabase is not set up (never prerender an admin page)
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : "";
  if (!email) return null;
  return { email, role: await roleFor(email) };
});

/** Returns the admin viewer, or redirects to the /admin sign-in page. Call at the top of every admin page and action. */
export async function requireAdmin(): Promise<Admin> {
  const viewer = await getViewer();
  if (!viewer?.role) redirect("/admin");
  return viewer as Admin;
}

/** Like requireAdmin, but only super admins get through. Everyone else goes back to /admin. */
export async function requireSuperAdmin(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") redirect("/admin");
  return admin;
}
