import { z } from "zod";
import type { Role } from "./roles";

/** Trim and lowercase, so "  Sam@Example.com " and "sam@example.com" are the same person. */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns the clean email, or an error message to show. */
export function parseAdminEmail(value: string): { ok: true; email: string } | { ok: false; message: string } {
  const email = normaliseEmail(value);
  if (!email) return { ok: false, message: "Enter an email." };
  if (email.length > 200 || !z.email().safeParse(email).success) return { ok: false, message: "Enter a valid email." };
  return { ok: true, email };
}

export function parseRole(value: unknown): Role | null {
  return value === "admin" || value === "super_admin" ? value : null;
}

type Change = {
  /** Who is doing it. */
  actor: string;
  /** Who it happens to. */
  target: string;
  /** New role, or "remove". */
  to: Role | "remove";
  /** Emails from SUPER_ADMIN_EMAILS (already lowercase). */
  envSupers: string[];
  /** Rows from user_roles. */
  rows: { email: string; role: Role }[];
};

/** Decides if a role change is allowed. Pure, so it is easy to test. Returns an error message, or null if fine. */
export function checkRoleChange({ actor, target, to, envSupers, rows }: Change): string | null {
  const t = normaliseEmail(target);
  const me = normaliseEmail(actor);
  if (envSupers.includes(t)) return "That super admin is set in Vercel. Change it there.";
  if (t === me && to !== "super_admin") return "You can't remove or demote yourself.";

  // Who is a super admin once this change is done?
  const supers = new Set(envSupers);
  for (const r of rows) {
    if (normaliseEmail(r.email) !== t && r.role === "super_admin") supers.add(normaliseEmail(r.email));
  }
  if (to === "super_admin") supers.add(t);
  if (supers.size === 0) return "There must be at least one super admin.";
  return null;
}
