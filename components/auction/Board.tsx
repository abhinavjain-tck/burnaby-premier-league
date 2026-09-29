"use client";

import type { Snapshot } from "@/lib/auction/types";
import { lotView, remainingCount, soldFeed, statusText, teamById, type LotView } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { BidLine } from "./BidLine";
import { Countdown } from "./Countdown";
import { LiveStatus } from "./LiveStatus";
import { LotCard } from "./LotCard";
import { Purses } from "./Purses";
import { SoldFeed } from "./SoldFeed";
import { TeamBar } from "./TeamBar";
import { useAuctionLive } from "./useAuctionLive";

type Props = {
  initial: Snapshot;
  /** Server-rendered "brought to you by" cards; one is shown per lot, rotating by lot order. */
  sponsors?: React.ReactNode[];
};

/** The public board every phone on the ground shows. */
export function Board({ initial, sponsors = [] }: Props) {
  const { snap, connected, clock } = useAuctionLive(initial);
  const lot = lotView(snap, snap.onBlock);
  const leader = teamById(snap, lot?.live.currentTeamId);
  const lastSale = !lot ? soldFeed(snap)[0] : undefined;
  const status = snap.state.status;

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-4">
      <header className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-muted uppercase">{snap.auction.name}</p>
          <p className="text-lg font-black">
            {statusText(snap)} · {remainingCount(snap)} lots to go
          </p>
        </div>
        <LiveStatus connected={connected} />
      </header>

      {status === "paused" && <p className="rounded-lg bg-amber-100 p-3 text-center text-xl font-black">Paused. Back shortly.</p>}

      {lot ? (
        <section aria-label="On the block" className="space-y-4">
          <LotCard lot={lot} big />
          <BidLine amount={lot.live.currentBid} team={leader} base={lot.live.base} big />
          <Countdown clock={clock} big />
          {sponsors.length > 0 && sponsors[lot.order % sponsors.length]}
        </section>
      ) : lastSale ? (
        <LastSale snap={snap} lot={lastSale} running={status === "open"} />
      ) : (
        <p className="py-6 text-center text-2xl font-black">
          {status === "completed" ? "That's the auction. Thanks, everyone." : "Waiting for the first lot…"}
        </p>
      )}

      <Purses snap={snap} />
      <SoldFeed snap={snap} />
    </main>
  );
}

/** Big "SOLD" card between lots, so people at the back see what just happened. */
function LastSale({ snap, lot, running }: { snap: Snapshot; lot: LotView; running: boolean }) {
  const team = teamById(snap, lot.live.soldTo);
  return (
    <section aria-label="Last sale" className="space-y-2 text-center">
      <p className="text-5xl font-black">SOLD</p>
      <p className="text-3xl font-black">{lot.playerName}</p>
      {team && (
        <TeamBar team={team} className="text-2xl">
          {fmt(lot.live.price ?? 0)} · {team.name}
        </TeamBar>
      )}
      {running && <p className="text-muted">Next lot coming up…</p>}
    </section>
  );
}
