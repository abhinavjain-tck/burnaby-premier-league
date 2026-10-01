import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { AdminBar } from "@/components/admin/AdminBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge, RoleChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { isDbConfigured } from "@/lib/config";
import { roleLabel } from "@/lib/registration/options";
import { isPendingPhone, isPlaceholderPlayer } from "@/lib/registration/phone";
import { listRegistrations, poolCount, REG_STATUSES, type RegStatus } from "@/lib/registration/queries";

export const metadata: Metadata = { title: "Registrations", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FILTERS: Array<{ label: string; status?: RegStatus }> = [
  { label: "All" },
  ...REG_STATUSES.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), status: s })),
];

/** Captain, placeholder and missing-phone flags for one row. */
function Flags({ row }: { row: { captainOf: string | null; phone: string } }) {
  return (
    <>
      {row.captainOf && <Badge tone="gold">Captain · {row.captainOf}</Badge>}
      {isPlaceholderPlayer(row.phone) && <Badge tone="ball">Placeholder</Badge>}
      {isPendingPhone(row.phone) && <Badge tone="neutral">No phone yet</Badge>}
    </>
  );
}

export default async function RegistrationsPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { status: raw } = await searchParams;
  const status = REG_STATUSES.find((s) => s === raw);

  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <NotConfigured>The registrations table shows up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }

  const rows = await listRegistrations(status);
  const all = status ? await listRegistrations() : rows;
  const pool = poolCount(all);
  const captains = all.filter((r) => r.captainOf).length;
  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase">
          Registrations <span className="num text-muted">({rows.length})</span>
        </h1>
        <p className="num font-semibold text-muted">
          <strong className="text-ink">{pool}</strong> in the auction pool (confirmed, not captains) · {captains} captains
        </p>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.status === status;
            return (
              <Link
                key={f.label}
                href={f.status ? `/admin/registrations?status=${f.status}` : "/admin/registrations"}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-bold ${
                  active ? "border-ink bg-ink text-white" : "border-edge bg-paper text-ink hover:border-ink"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 && (
          <EmptyState icon={Users} title="No registrations yet">
            New players show up here as soon as they register.
          </EmptyState>
        )}

        {/* Phones: one card per player */}
        <ul className="space-y-2 md:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/registrations/${row.id}`} className="card flex items-center gap-3 p-3 hover:border-edge">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{row.fullName}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <RoleChip role={row.role} short />
                    <StatusBadge status={row.status} />
                    <Badge tone={row.paidAt ? "pitch" : "outline"}>{row.paidAt ? "Paid" : "Not paid"}</Badge>
                    <Flags row={row} />
                  </span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-canvas font-display text-2xl font-extrabold" title="Band">
                  {row.tier ?? "—"}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Laptops: a table */}
        {rows.length > 0 && (
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-canvas text-sm tracking-wide text-muted uppercase">
                <tr>
                  {["Name", "Role", "Band", "Status", "Paid"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line px-4 py-2 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0 hover:bg-pitch-soft">
                    <td className="px-4 py-2 font-bold">
                      <Link href={`/admin/registrations/${row.id}`} className="underline decoration-2 underline-offset-4 hover:text-pitch">
                        {row.fullName}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1.5 empty:hidden">
                        <Flags row={row} />
                      </span>
                    </td>
                    <td className="px-4 py-2">{roleLabel(row.role)}</td>
                    <td className="px-4 py-2 font-display text-xl font-extrabold">{row.tier ?? "—"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2">{row.paidAt ? <Badge tone="pitch">Paid</Badge> : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
