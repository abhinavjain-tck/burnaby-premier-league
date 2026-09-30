"use client";

import { Pause } from "lucide-react";
import { useState } from "react";
import type { Snapshot } from "@/lib/auction/types";
import { lotView, remainingCount, soldFeed, statusText, teamById, type LotView } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { BidLine } from "./BidLine";
import { Countdown } from "./Countdown";
import { LiveStatus } from "./LiveStatus";
import { LotCard } from "./LotCard";
import { Purses } from "./Purses";
import { SoldFeed } from "./SoldFeed";
import { SquadSheet } from "./SquadSheet";
import { TeamBar } from "./TeamBar";
import { useAuctionLive, type AuctionLive } from "./useAuctionLive";

type Sponsors = {
  /** Server-rendered "presented by" rows; one is shown per lot, rotating by lot order. */
  sponsors?: React.ReactNode[];
};

/** The public board every phone on the ground shows. Keeps itself live. */
export function Board({ initial, sponsors }: Sponsors & { initial: Snapshot }) {
  return <BoardView live={useAuctionLive(initial)} sponsors={sponsors} />;
}

/**
 * The board, drawn from a live state someone else keeps current (the console passes its own,
 * so there's one channel and one poller per page). Two columns once there's room for them:
 * lot on the left, purses and sales on the right.
 */
export function BoardView({
  live,
  sponsors = [],
  header = true,
}: Sponsors & {
  live: Pick<AuctionLive, "snap" | "connected" | "clock">;
  /** Auction name, status and the Live pill. The console turns it off: its own bar already says all that. */
  header?: boolean;
}) {
  const { snap, connected, clock } = live;
  const [squadTeam, setSquadTeam] = useState<string | null>(null);
  const lot = lotView(snap, snap.onBlock);
  const leader = teamById(snap, lot?.live.currentTeamId);
  const lastSale = !lot ? soldFeed(snap)[0] : undefined;
  const status = snap.state.status;

  return (
    <div className="@container space-y-5">
      {header && (
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow truncate">{snap.auction.name}</p>
            <p className="font-display text-xl leading-tight font-extrabold uppercase sm:text-2xl">
              {statusText(snap)} · <span className="num">{remainingCount(snap)}</span> lots to go
            </p>
          </div>
          <LiveStatus connected={connected} />
        </header>
      )}

      {status === "paused" && (
        <p className="flex items-center justify-center gap-2 rounded-md bg-gold p-3 text-center font-display text-2xl font-extrabold text-ink uppercase">
          <Pause aria-hidden className="size-6" /> Paused. Back shortly.
        </p>
      )}

      <div className="grid gap-5 @min-[62rem]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @min-[62rem]:items-start">
        <div className="space-y-5">
          {lot ? (
            <section aria-label="On the block" className="card overflow-hidden">
              <div className="space-y-4 p-4">
                <LotCard lot={lot} big />
                <BidLine amount={lot.live.currentBid} team={leader} teams={snap.teams} base={lot.live.base} big />
                <Countdown clock={clock} big />
              </div>
              {sponsors.length > 0 && sponsors[lot.order % sponsors.length]}
            </section>
          ) : lastSale ? (
            <LastSale key={lastSale.id} snap={snap} lot={lastSale} running={status === "open"} />
          ) : (
            <p className="card p-8 text-center font-display text-3xl font-extrabold uppercase">
              {status === "completed" ? "That's the auction. Thanks, everyone." : "Waiting for the first lot…"}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <Purses snap={snap} leaderId={leader?.id} onOpen={setSquadTeam} />
          <SoldFeed snap={snap} />
        </div>
      </div>

      <SquadSheet snap={snap} teamId={squadTeam} onClose={() => setSquadTeam(null)} />
    </div>
  );
}

/** Big "SOLD" card between lots, so people at the back see what just happened. Stamps in once per sale. */
function LastSale({ snap, lot, running }: { snap: Snapshot; lot: LotView; running: boolean }) {
  const team = teamById(snap, lot.live.soldTo);
  return (
    <section aria-label="Last sale" className="card space-y-4 overflow-hidden p-5 text-center">
      <p className="inline-block rounded-md border-[5px] border-ball px-5 py-1 font-display text-7xl leading-none font-extrabold tracking-wider text-ball uppercase animate-sold-in">
        Sold
      </p>
      <p className="font-display text-4xl leading-tight font-extrabold break-words uppercase">{lot.playerName}</p>
      {team && (
        <TeamBar team={team} teams={snap.teams} className="text-3xl">
          <span className="num">{fmt(lot.live.price ?? 0)}</span> · {team.name}
        </TeamBar>
      )}
      {running && <p className="font-semibold text-muted">Next lot coming up…</p>}
    </section>
  );
}
