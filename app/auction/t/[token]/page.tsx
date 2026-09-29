import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Board } from "@/components/auction/Board";
import { lotSponsors } from "@/components/auction/lotSponsors";
import { NotConfigured } from "@/components/NotConfigured";
import { isShareToken } from "@/lib/auction/share";
import { findTestAuctionByToken, getPublicSnapshot } from "@/lib/auction/snapshot";
import { isDbConfigured } from "@/lib/config";

// Unlisted: keep it out of search, and don't leak the token in a Referer header.
export const metadata: Metadata = {
  title: "Test auction",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

/** Board for a test auction, reached only by its private link. */
export default async function TestAuctionBoard({ params }: Props) {
  const { token } = await params;
  await connection();
  if (!isDbConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-6">
        <NotConfigured>Test auctions work once the database is connected.</NotConfigured>
      </main>
    );
  }
  if (!isShareToken(token)) notFound();
  const row = await findTestAuctionByToken(token);
  const snap = row ? await getPublicSnapshot(row.id) : null;
  if (!snap) notFound();
  return <Board initial={snap} sponsors={await lotSponsors()} />;
}
