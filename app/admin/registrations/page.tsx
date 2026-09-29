import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar } from "@/components/admin/AdminBar";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { isDbConfigured } from "@/lib/config";
import { roleLabel } from "@/lib/registration/options";
import { listRegistrations, REG_STATUSES, type RegStatus } from "@/lib/registration/queries";

export const metadata: Metadata = { title: "Registrations", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FILTERS: Array<{ label: string; status?: RegStatus }> = [
  { label: "All" },
  ...REG_STATUSES.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), status: s })),
];

export default async function RegistrationsPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { status: raw } = await searchParams;
  const status = REG_STATUSES.find((s) => s === raw);

  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-4xl p-4">
          <NotConfigured>The registrations table shows up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }

  const rows = await listRegistrations(status);
  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="text-2xl font-black">Registrations ({rows.length})</h1>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.status === status;
            return (
              <Link
                key={f.label}
                href={f.status ? `/admin/registrations?status=${f.status}` : "/admin/registrations"}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border-2 border-ink px-4 py-2 font-bold ${active ? "bg-ink text-white" : "bg-white"}`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 && <p className="text-muted">No registrations yet.</p>}

        {/* Phones: one card per player */}
        <ul className="space-y-2 md:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/registrations/${row.id}`} className="block rounded-lg border-2 border-ink p-3">
                <span className="block text-lg font-black">{row.fullName}</span>
                <span className="text-muted">
                  {roleLabel(row.role)} · Tier {row.tier ?? "—"} · {row.status} · {row.paidAt ? "Paid" : "Not paid"}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Laptops: a table */}
        {rows.length > 0 && (
          <table className="hidden w-full border-collapse text-left md:table">
            <thead>
              <tr className="border-b-2 border-ink">
                {["Name", "Role", "Tier", "Status", "Paid"].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-300 hover:bg-zinc-100">
                  <td className="p-2 font-bold">
                    <Link href={`/admin/registrations/${row.id}`} className="underline">
                      {row.fullName}
                    </Link>
                  </td>
                  <td className="p-2">{roleLabel(row.role)}</td>
                  <td className="p-2">{row.tier ?? "—"}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2">{row.paidAt ? "Paid" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
