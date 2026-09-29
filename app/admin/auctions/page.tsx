import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar } from "@/components/admin/AdminBar";
import { NewAuctionForm } from "@/components/admin/NewAuctionForm";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { listAuctions } from "@/lib/auction/admin";
import { DEFAULT_CONFIG } from "@/lib/auction/config";
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
        <main className="mx-auto max-w-4xl p-4">
          <NotConfigured>Auctions show up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }

  const rows = await listAuctions();
  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <h1 className="text-2xl font-black">Auctions</h1>
        {rows.length === 0 ? (
          <p className="text-muted">No auctions yet. Start with a test one to rehearse.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/auctions/${a.id}`} className="block rounded-lg border-2 border-ink p-3">
                  <span className="block text-lg font-black">
                    {a.name}{" "}
                    <span className={`rounded px-2 text-sm ${a.mode === "live" ? "bg-red-700 text-white" : "bg-zinc-200"}`}>{a.mode}</span>
                  </span>
                  <span className="text-muted">
                    {a.status} · {a.lots} lots · {a.version} events
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-3 rounded-lg border-2 border-ink p-4">
          <h2 className="text-xl font-black">New auction</h2>
          <NewAuctionForm defaultConfig={DEFAULT_JSON} />
        </section>
      </main>
    </>
  );
}
