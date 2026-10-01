import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Gavel } from "lucide-react";
import { AdminBar } from "@/components/admin/AdminBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewAuctionForm } from "@/components/admin/NewAuctionForm";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { listAuctions } from "@/lib/auction/admin";
import { DEFAULT_CONFIG } from "@/lib/auction/config";
import { latestSeasonConfig } from "@/lib/auction/snapshot";
import { LAKH_PER_CRORE } from "@/lib/money";
import { isDbConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "Auctions", robots: { index: false, follow: false } };

// The purse has its own field, so leave it out of the JSON (undefined drops out).
const DEFAULT_JSON = JSON.stringify({ ...DEFAULT_CONFIG, purseLakhs: undefined }, null, 2);

export default async function AuctionsPage() {
  const admin = await requireAdmin();
  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <NotConfigured>Auctions show up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }

  const [rows, season] = await Promise.all([listAuctions(), latestSeasonConfig()]);
  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Auctions</h1>
        {rows.length === 0 ? (
          <EmptyState icon={Gavel} title="No auctions yet">
            Start with a test one to rehearse.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/auctions/${a.id}`} className="card flex items-center gap-3 p-4 hover:border-edge">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-2xl leading-tight font-extrabold uppercase">{a.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-muted">
                      <StatusBadge status={a.mode} />
                      <StatusBadge status={a.status} />
                      <span className="num text-sm font-semibold">
                        {a.lots} lots · {a.version} events
                      </span>
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="card space-y-3 p-4">
          <h2 className="font-display text-2xl font-extrabold uppercase">New auction</h2>
          <NewAuctionForm defaultConfig={DEFAULT_JSON} defaultPurseCr={season.purseLakhs / LAKH_PER_CRORE} />
        </section>
      </main>
    </>
  );
}
