"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchConsoleSnapshot, startClock } from "@/app/auction/actions";
import { nextQueuedLot } from "@/lib/auction/rules";
import type { Snapshot } from "@/lib/auction/types";
import { lotView, remainingCount, statusText, teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { BidLine } from "../BidLine";
import { Countdown } from "../Countdown";
import { LiveStatus } from "../LiveStatus";
import { LotCard } from "../LotCard";
import { useAuctionLive } from "../useAuctionLive";
import { BidButtons } from "./BidButtons";
import { CustomBid } from "./CustomBid";
import { EventList } from "./EventList";
import { CancelToast, SoldSheet } from "./SoldSheet";
import { UnsoldList } from "./UnsoldList";
import { useCommand } from "./useCommand";

type Sale = { lotId: string; teamId: string; amount: number; version: number };

const CANCEL_WINDOW_MS = 2000;
const CLOCK_SECONDS = 10;

/** The operator's phone. Records what the auctioneer calls. */
export function Console({ initial, boardHref }: { initial: Snapshot; boardHref: string }) {
  const live = useAuctionLive(initial, { load: fetchConsoleSnapshot, eventLimit: 20 });
  const { snap, connected, clock } = live;
  const { send, pending, notice, setNotice } = useCommand(live);
  const [confirming, setConfirming] = useState<Sale | null>(null);
  const [selling, setSelling] = useState<Sale | null>(null);
  const sellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (sellTimer.current) clearTimeout(sellTimer.current);
  }, []);

  const status = snap.state.status;
  const open = status === "open";
  const busy = pending || selling !== null;
  const lot = lotView(snap, snap.onBlock);
  const leader = teamById(snap, lot?.live.currentTeamId);
  const nextLotId = nextQueuedLot(snap.state, snap.lots.map((l) => l.id));
  const nextLot = snap.lots.find((l) => l.id === nextLotId);

  function confirmSale(sale: Sale) {
    setConfirming(null);
    setSelling(sale);
    sellTimer.current = setTimeout(() => {
      sellTimer.current = null;
      setSelling(null);
      // The version from when SOLD was tapped: if anything changed since, the server says so.
      void send({ type: "SOLD", lotId: sale.lotId, teamId: sale.teamId, amount: sale.amount }, sale.version);
    }, CANCEL_WINDOW_MS);
  }

  function cancelSale() {
    if (sellTimer.current) clearTimeout(sellTimer.current);
    sellTimer.current = null;
    setSelling(null);
    setNotice({ text: "Sale cancelled. Nothing saved.", tone: "info" });
  }

  async function runClock() {
    const res = await startClock(snap.auction.id, CLOCK_SECONDS).catch(() => null);
    if (res?.ok) live.startClock(res.clock?.seconds ?? CLOCK_SECONDS);
    else setNotice({ text: "Couldn't start the clock. Check signal.", tone: "error" });
  }

  const sellingTeam = selling ? teamById(snap, selling.teamId) : undefined;

  return (
    <main className="mx-auto max-w-xl space-y-4 px-3 py-3 pb-28">
      <header className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-muted uppercase">
            Console · {snap.auction.name} {snap.auction.mode === "test" ? "(test)" : ""}
          </p>
          <p className="text-lg font-black">
            {statusText(snap)} · {remainingCount(snap)} to go · v{snap.auction.version}
          </p>
        </div>
        <LiveStatus connected={connected} />
      </header>

      {notice && (
        <p role="alert" className={`rounded-lg p-3 text-lg font-bold ${notice.tone === "error" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-950"}`}>
          {notice.text}
        </p>
      )}

      {status === "draft" && (
        <button type="button" disabled={busy} onClick={() => void send({ type: "START" })} className="btn w-full text-xl">
          Open the auction
        </button>
      )}

      {lot ? (
        <section aria-label="On the block" className="space-y-3">
          <LotCard lot={lot} />
          <BidLine amount={lot.live.currentBid} team={leader} base={lot.live.base} />
          <BidButtons snap={snap} disabled={busy} onBid={(teamId, amount) => void send({ type: "BID", lotId: lot.id, teamId, amount })} />
          <CustomBid snap={snap} disabled={busy} onBid={(teamId, amount) => void send({ type: "BID", lotId: lot.id, teamId, amount })} />

          <Countdown clock={clock} />
          <button type="button" disabled={busy || !open} onClick={() => void runClock()} className="btn-outline w-full">
            Start {CLOCK_SECONDS} s clock
          </button>

          <button
            type="button"
            disabled={busy || !open || !leader || lot.live.currentBid === undefined}
            onClick={() =>
              leader &&
              lot.live.currentBid !== undefined &&
              setConfirming({ lotId: lot.id, teamId: leader.id, amount: lot.live.currentBid, version: snap.auction.version })
            }
            className="btn min-h-16 w-full text-2xl"
          >
            SOLD{leader && lot.live.currentBid !== undefined ? ` · ${leader.short} ${fmt(lot.live.currentBid)}` : ""}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy || !open || lot.live.currentBid !== undefined} onClick={() => void send({ type: "UNSOLD", lotId: lot.id })} className="btn-outline">
              UNSOLD
            </button>
            <button type="button" disabled={busy || status === "draft"} onClick={() => void send({ type: "SKIP", lotId: lot.id })} className="btn-outline">
              SKIP
            </button>
          </div>
        </section>
      ) : (
        status !== "draft" &&
        status !== "completed" && (
          <button
            type="button"
            disabled={busy || !open || !nextLotId}
            onClick={() => nextLotId && void send({ type: "START_LOT", lotId: nextLotId })}
            className="btn min-h-16 w-full text-xl"
          >
            {nextLot ? `Next lot: ${nextLot.playerName}` : "No lots left in the pool"}
          </button>
        )
      )}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={busy || snap.undoSeq === null} onClick={() => void send({ type: "UNDO" })} className="btn-outline">
          ↶ Undo
        </button>
        <button type="button" disabled={busy || snap.redoSeq === null} onClick={() => void send({ type: "REDO" })} className="btn-outline">
          ↷ Redo
        </button>
        {status === "paused" ? (
          <button type="button" disabled={busy} onClick={() => void send({ type: "RESUME" })} className="btn-outline">
            Resume
          </button>
        ) : (
          <button type="button" disabled={busy || !open} onClick={() => void send({ type: "PAUSE" })} className="btn-outline">
            Pause
          </button>
        )}
      </div>

      <EventList snap={snap} />
      <UnsoldList snap={snap} disabled={busy || status === "completed"} onRequeue={(lotId) => void send({ type: "REQUEUE", lotId })} />

      <p className="text-center">
        <Link href={boardHref} target="_blank" className="font-bold text-brand underline">
          Open the public board
        </Link>
      </p>

      {confirming && teamById(snap, confirming.teamId) && (
        <SoldSheet
          player={snap.lots.find((l) => l.id === confirming.lotId)?.playerName ?? ""}
          team={teamById(snap, confirming.teamId)!}
          amount={confirming.amount}
          onConfirm={() => confirmSale(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
      {selling && sellingTeam && <CancelToast text={`Selling to ${sellingTeam.short} for ${fmt(selling.amount)}…`} onCancel={cancelSale} />}
    </main>
  );
}
