import type { Metadata } from "next";
import { connection } from "next/server";
import { Board } from "@/components/auction/Board";
import { lotSponsors } from "@/components/auction/lotSponsors";
import { PrePage } from "@/components/auction/PrePage";
import { NotConfigured } from "@/components/NotConfigured";
import { DEFAULT_CONFIG } from "@/lib/auction/config";
import { findLiveAuction, getPublicSnapshot, latestSeasonConfig } from "@/lib/auction/snapshot";
import { isDbConfigured } from "@/lib/config";

export const metadata: Metadata = {
  title: "Auction",
  description: "BPL Season 4 player auction: live board, purses and every sale.",
};

/** One link for everyone: the rules until bidding opens, then the live board. */
export default async function AuctionPage() {
  await connection(); // always per request: the auction changes by the second
  if (!isDbConfigured()) {
    return <PrePage config={DEFAULT_CONFIG} snap={null} notice={<NotConfigured>The live board shows up once the database is connected.</NotConfigured>} />;
  }

  const live = await findLiveAuction();
  const snap = live ? await getPublicSnapshot(live.id) : null;
  if (!snap || snap.state.status === "draft") {
    return <PrePage config={snap?.config ?? (await latestSeasonConfig())} snap={snap} />;
  }
  return <Board initial={snap} sponsors={await lotSponsors()} />;
}
