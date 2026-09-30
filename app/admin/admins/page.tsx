import type { Metadata } from "next";
import { asc, sql } from "drizzle-orm";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminBar } from "@/components/admin/AdminBar";
import { RemoveAdminForm } from "@/components/admin/RemoveAdminForm";
import { NotConfigured } from "@/components/NotConfigured";
import { Badge } from "@/components/ui/Badge";
import { parseEmailList, requireSuperAdmin, type Role } from "@/lib/auth/roles";
import { isDbConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { userRoles } from "@/lib/db/schema";
import { saveAdmin } from "./actions";

export const metadata: Metadata = { title: "Admins", robots: { index: false, follow: false } };

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", super_admin: "Super admin" };

function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={role === "super_admin" ? "pitch" : "outline"}>{ROLE_LABEL[role]}</Badge>;
}

export default async function AdminsPage() {
  const me = await requireSuperAdmin();
  const shell = (children: React.ReactNode) => (
    <>
      <AdminBar email={me.email} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">{children}</main>
    </>
  );

  if (!isDbConfigured()) return shell(<NotConfigured>Admins show up once DATABASE_URL is set.</NotConfigured>);

  const envSupers = parseEmailList(process.env.SUPER_ADMIN_EMAILS);
  let rows: { email: string; role: Role }[];
  try {
    rows = await getDb()
      .select({ email: sql<string>`lower(${userRoles.email})`, role: userRoles.role })
      .from(userRoles)
      .orderBy(asc(userRoles.email));
  } catch (err) {
    console.error("AdminsPage read failed", err);
    return shell(<NotConfigured title="Temporarily unavailable">Could not load admins. Try again in a minute.</NotConfigured>);
  }
  // An email in Vercel always counts as super admin, so it shows once, as read-only.
  const dbRows = rows
    .filter((r) => !envSupers.includes(r.email))
    .sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "super_admin" ? -1 : 1));

  return shell(
    <>
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Admins</h1>

      <section aria-labelledby="add-admin" className="card max-w-2xl space-y-3 p-4">
        <h2 id="add-admin" className="font-display text-2xl font-extrabold uppercase">
          Add or change
        </h2>
        <ActionForm action={saveAdmin}>
          <label className="block space-y-1">
            <span className="font-bold">Email</span>
            <input name="email" type="email" required maxLength={200} autoComplete="off" placeholder="name@gmail.com" className="field" />
          </label>
          <label className="block space-y-1">
            <span className="font-bold">Role</span>
            <select name="role" defaultValue="admin" className="field">
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </label>
          <button type="submit" className="btn">
            Save
          </button>
        </ActionForm>
        <p className="hint">They sign in with this Google email at /admin.</p>
      </section>

      <section aria-labelledby="who" className="max-w-2xl space-y-3">
        <h2 id="who" className="font-display text-2xl font-extrabold uppercase">
          Who can sign in
        </h2>
        <ul className="space-y-3">
          {envSupers.map((email) => (
            <li key={email} className="card flex flex-wrap items-center justify-between gap-2 p-4">
              <span className="min-w-0 font-bold break-all">{email}</span>
              <span className="flex flex-wrap items-center gap-2">
                <RoleBadge role="super_admin" />
                <Badge tone="neutral" title="Set in the SUPER_ADMIN_EMAILS setting. Change it there.">
                  Set in Vercel
                </Badge>
              </span>
            </li>
          ))}
          {dbRows.map((r) => {
            const isMe = r.email === me.email;
            return (
              <li key={r.email} className="card space-y-3 p-4" data-testid="admin-row" data-email={r.email}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 font-bold break-all">
                    {r.email}
                    {isMe && <span className="ml-2 text-sm font-semibold text-muted">(you)</span>}
                  </span>
                  <RoleBadge role={r.role} />
                </div>
                {isMe ? (
                  <p className="hint">You can&apos;t remove or demote yourself.</p>
                ) : (
                  <div className="flex flex-wrap items-start gap-3">
                    <ActionForm action={saveAdmin}>
                      <input type="hidden" name="email" value={r.email} />
                      <div className="flex gap-2">
                        <select name="role" defaultValue={r.role} aria-label={`Role for ${r.email}`} className="field w-auto">
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                        <button type="submit" className="btn-outline" aria-label={`Change role for ${r.email}`}>
                          Change
                        </button>
                      </div>
                    </ActionForm>
                    <RemoveAdminForm email={r.email} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {dbRows.length === 0 && <p className="text-muted">No one else has been added yet.</p>}
      </section>
    </>,
  );
}
