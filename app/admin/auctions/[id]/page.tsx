import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { promoteToLive, rotateShareToken } from "@/app/admin/auctions/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminBar } from "@/components/admin/AdminBar";
import { AuctionAdmins } from "@/components/admin/auction/AuctionAdmins";
import { Controls } from "@/components/admin/auction/Controls";
import { LotTable } from "@/components/admin/auction/LotTable";
import { Presell } from "@/components/admin/auction/Presell";
import { SeedLots } from "@/components/admin/auction/SeedLots";
import { CopyButton } from "@/components/CopyButton";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { listAuctionAdmins } from "@/lib/auction/admin";
import { findAuction } from "@/lib/auction/queries";
import { testBoardPath } from "@/lib/auction/share";
import { getSnapshot } from "@/lib/auction/snapshot";
import { statusText } from "@/lib/auction/view";
import { isDbConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Auction", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border-2 border-ink p-4">
      <h2 className="text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

export default async function AuctionAdminPage({ params }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-2xl p-4">
          <NotConfigured>Auction setup shows up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const [row, snap, admins] = await Promise.all([findAuction(getDb(), id), getSnapshot(id, { events: 20, withActor: true }), listAuctionAdmins(id)]);
  if (!row || !snap) notFound();

  const test = row.mode === "test";
  const boardPath = test ? testBoardPath(row.shareToken) : "/auction";
  const exportHref = (kind: "events" | "lots") => `/admin/auctions/${id}/export?kind=${kind}`;

  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-2xl space-y-5 p-4">
        <Link href="/admin/auctions" className="font-bold text-brand underline">
          ← All auctions
        </Link>
        <header>
          <h1 className="text-3xl font-black">{row.name}</h1>
          <p className="text-lg">
            <span className={`rounded px-2 font-bold ${test ? "bg-zinc-200" : "bg-red-700 text-white"}`}>{row.mode}</span> · {statusText(snap)} ·{" "}
            {snap.lots.length} lots · {snap.auction.version} events
          </p>
        </header>

        <nav className="grid grid-cols-3 gap-2" aria-label="Screens">
          <Link href={`/auction/${id}/console`} className="btn">
            Console
          </Link>
          <Link href={boardPath} className="btn-outline">
            Board
          </Link>
          <Link href={`/auction/${id}/owner`} className="btn-outline">
            Owner view
          </Link>
        </nav>

        {test && (
          <Section title="Private link">
            <p>Anyone with this link can watch. Only auction admins can run it. It never shows up in menus.</p>
            <p className="font-mono text-sm break-all">{boardPath}</p>
            <CopyButton label="Copy link" path={boardPath} />
            <ActionForm action={rotateShareToken.bind(null, id)}>
              <button type="submit" className="font-bold underline">
                Make a new link (old one stops working)
              </button>
            </ActionForm>
          </Section>
        )}

        <Section title="Run">
          <Controls snap={snap} />
        </Section>

        <Section title="Players">
          <SeedLots snap={snap} />
          <LotTable snap={snap} />
        </Section>

        <Section title="Pre-sell (owners)">
          <Presell snap={snap} />
        </Section>

        <Section title="Auction admins">
          <AuctionAdmins auctionId={id} emails={admins} />
        </Section>

        <Section title="Export">
          <p>The event log and final lots as CSV. Post them in the group after the auction.</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={exportHref("events")} className="btn-outline">
              Events CSV
            </a>
            <a href={exportHref("lots")} className="btn-outline">
              Lots CSV
            </a>
          </div>
        </Section>

        {test && (
          <Section title="Promote to live">
            <p>Copy this rehearsal&apos;s rules, sets and running order to the live auction. Only before the live one opens.</p>
            <ActionForm action={promoteToLive.bind(null, id)}>
              <button type="submit" className="btn-outline w-full">
                Promote config to live auction
              </button>
            </ActionForm>
          </Section>
        )}
      </main>
    </>
  );
}
