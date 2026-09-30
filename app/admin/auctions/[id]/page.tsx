import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { promoteToLive, rotateShareToken } from "@/app/admin/auctions/actions";
import { ArrowLeft, Download, Eye, Gavel, Monitor, RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/admin/ActionForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
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
        <main className="mx-auto max-w-5xl px-4 py-6">
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
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <Link href="/admin/auctions" className="link">
          <ArrowLeft aria-hidden className="size-5" /> All auctions
        </Link>
        <header className="space-y-2">
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">{row.name}</h1>
          <p className="flex flex-wrap items-center gap-2 font-semibold text-muted">
            <StatusBadge status={row.mode} /> <StatusBadge status={snap.state.status} />
            <span className="num">
              {statusText(snap)} · {snap.lots.length} lots · {snap.auction.version} events
            </span>
          </p>
        </header>

        <nav className="grid grid-cols-3 gap-2" aria-label="Screens">
          <Link href={`/auction/${id}/console`} className="btn px-2">
            <Gavel aria-hidden className="size-5" /> Console
          </Link>
          <Link href={boardPath} className="btn-outline px-2">
            <Monitor aria-hidden className="size-5" /> Board
          </Link>
          <Link href={`/auction/${id}/owner`} className="btn-outline px-2 leading-tight">
            <Eye aria-hidden className="size-5 shrink-0" /> Owners
          </Link>
        </nav>

        {test && (
          <Section title="Private link">
            <p>Anyone with this link can watch. Only auction admins can run it. It never shows up in menus.</p>
            <p className="rounded-md bg-canvas p-2 font-mono text-sm break-all">{boardPath}</p>
            <CopyButton label="Copy link" path={boardPath} />
            <ActionForm action={rotateShareToken.bind(null, id)}>
              <button type="submit" className="btn-ghost min-h-11 justify-start px-0 text-left text-base">
                <RefreshCw aria-hidden className="size-4" /> Make a new link (old one stops working)
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
            <a href={exportHref("events")} className="btn-outline px-2">
              <Download aria-hidden className="size-5" /> Events CSV
            </a>
            <a href={exportHref("lots")} className="btn-outline px-2">
              <Download aria-hidden className="size-5" /> Lots CSV
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
