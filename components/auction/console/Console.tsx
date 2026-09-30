"use client";

import { ArrowRight, Ban, CircleAlert, ExternalLink, Gavel, Info, Pause, Play, Redo2, SkipForward, Timer, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fetchConsoleSnapshot, startClock } from "@/app/auction/actions";
import { nextQueuedLot } from "@/lib/auction/rules";
import type { Snapshot } from "@/lib/auction/types";
import { lotView, remainingCount, statusText, teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { cx } from "@/components/ui/cx";
import { BoardView } from "../Board";
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

type Props = {
  initial: Snapshot;
  boardHref: string;
  /** Board "presented by" rows, rendered on the server. */
  sponsors?: ReactNode[];
  /** Sponsor band under the board, rendered on the server. */
  sponsorBand?: ReactNode;
};

type View = "console" | "board";

/**
 * The operator's screen. Records what the auctioneer calls, with the public board alongside:
 * two columns on a laptop, a Console | Board toggle on a phone. The board reads the console's
 * own live state, so the page keeps one realtime channel and one poller.
 */
export function Console({ initial, boardHref, sponsors, sponsorBand }: Props) {
  const live = useAuctionLive(initial, { load: fetchConsoleSnapshot, eventLimit: 20 });
  const { snap, connected, clock } = live;
  const { send, pending, notice, setNotice } = useCommand(live);
  const [view, setView] = useState<View>("console");
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
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <div className="sticky top-0 z-30 bg-ink text-white shadow-card">
        <header className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wider text-white/85 uppercase">
              Console · {snap.auction.name} {snap.auction.mode === "test" ? "(test)" : ""}
            </p>
            <p className="font-display text-xl leading-tight font-extrabold uppercase">
              {statusText(snap)} · <span className="num">{remainingCount(snap)}</span> to go · <span className="num">v{snap.auction.version}</span>
            </p>
          </div>
          <LiveStatus connected={connected} />
        </header>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <div className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[42rem_minmax(0,1fr)]">
        <main id="console" className={cx(view !== "console" && "hidden", "lg:block lg:overflow-y-auto")}>
          <div className="mx-auto max-w-2xl space-y-4 px-3 pt-3 pb-28 lg:pb-8">
            {notice && (
              <p
                role="alert"
                className={`flex items-center gap-2 rounded-md border-2 p-3 text-lg font-bold motion-safe:animate-rise ${
                  notice.tone === "error" ? "border-ball bg-ball-soft text-ink" : "border-gold-dark bg-gold-soft text-ink"
                }`}
              >
                {notice.tone === "error" ? <CircleAlert aria-hidden className="size-6 shrink-0 text-ball" /> : <Info aria-hidden className="size-6 shrink-0" />}
                {notice.text}
              </p>
            )}

            {status === "draft" && (
              <button type="button" disabled={busy} onClick={() => void send({ type: "START" })} className="btn min-h-16 w-full text-2xl">
                <Play aria-hidden className="size-6" /> Open the auction
              </button>
            )}

            {lot ? (
              <section aria-label="On the block" className="space-y-4">
                <div className="card space-y-4 p-4">
                  <LotCard lot={lot} />
                  <BidLine amount={lot.live.currentBid} team={leader} teams={snap.teams} base={lot.live.base} />
                </div>

                <BidButtons snap={snap} disabled={busy} onBid={(teamId, amount) => void send({ type: "BID", lotId: lot.id, teamId, amount })} />
                <CustomBid snap={snap} disabled={busy} onBid={(teamId, amount) => void send({ type: "BID", lotId: lot.id, teamId, amount })} />

                <Countdown clock={clock} />
                <button type="button" disabled={busy || !open} onClick={() => void runClock()} className="btn-outline w-full">
                  <Timer aria-hidden className="size-5" /> Start {CLOCK_SECONDS} s clock
                </button>

                <button
                  type="button"
                  disabled={busy || !open || !leader || lot.live.currentBid === undefined}
                  onClick={() =>
                    leader &&
                    lot.live.currentBid !== undefined &&
                    setConfirming({ lotId: lot.id, teamId: leader.id, amount: lot.live.currentBid, version: snap.auction.version })
                  }
                  className="btn min-h-20 w-full font-display text-3xl font-extrabold uppercase"
                >
                  <Gavel aria-hidden className="size-7" />
                  SOLD{leader && lot.live.currentBid !== undefined ? ` · ${leader.short} ${fmt(lot.live.currentBid)}` : ""}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy || !open || lot.live.currentBid !== undefined} onClick={() => void send({ type: "UNSOLD", lotId: lot.id })} className="btn-danger min-h-14">
                    <Ban aria-hidden className="size-5" /> UNSOLD
                  </button>
                  <button type="button" disabled={busy || status === "draft"} onClick={() => void send({ type: "SKIP", lotId: lot.id })} className="btn-outline min-h-14">
                    <SkipForward aria-hidden className="size-5" /> SKIP
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
                  className="btn min-h-20 w-full text-xl"
                >
                  {nextLot ? (
                    <>
                      Next lot: <strong className="font-display text-2xl uppercase">{nextLot.playerName}</strong> <ArrowRight aria-hidden className="size-6" />
                    </>
                  ) : (
                    "No lots left in the pool"
                  )}
                </button>
              )
            )}

            <div className="grid grid-cols-3 gap-2">
              <button type="button" disabled={busy || snap.undoSeq === null} onClick={() => void send({ type: "UNDO" })} className="btn-outline px-2">
                <Undo2 aria-hidden className="size-5" /> Undo
              </button>
              <button type="button" disabled={busy || snap.redoSeq === null} onClick={() => void send({ type: "REDO" })} className="btn-outline px-2">
                <Redo2 aria-hidden className="size-5" /> Redo
              </button>
              {status === "paused" ? (
                <button type="button" disabled={busy} onClick={() => void send({ type: "RESUME" })} className="btn-accent px-2">
                  <Play aria-hidden className="size-5" /> Resume
                </button>
              ) : (
                <button type="button" disabled={busy || !open} onClick={() => void send({ type: "PAUSE" })} className="btn-outline px-2">
                  <Pause aria-hidden className="size-5" /> Pause
                </button>
              )}
            </div>

            <EventList snap={snap} />
            <UnsoldList snap={snap} disabled={busy || status === "completed"} onRequeue={(lotId) => void send({ type: "REQUEUE", lotId })} />

            <p className="text-center text-sm">
              <Link href={boardHref} target="_blank" className="link">
                Open the public board in a new tab <ExternalLink aria-hidden className="size-4" />
              </Link>
            </p>
          </div>
        </main>

        <section
          id="board"
          aria-label="Public board"
          className={cx(view !== "board" && "hidden", "border-line bg-canvas lg:block lg:overflow-y-auto lg:border-l")}
        >
          <div className="space-y-5 px-4 pt-4 pb-8">
            <BoardView live={live} sponsors={sponsors} header={false} />
            {sponsorBand && (
              <div className="rounded-lg border border-line bg-paper px-4 py-5">
                <p className="eyebrow mb-2 text-center">Thanks to our sponsors</p>
                {sponsorBand}
              </div>
            )}
          </div>
        </section>
      </div>

      {confirming && teamById(snap, confirming.teamId) && (
        <SoldSheet
          player={snap.lots.find((l) => l.id === confirming.lotId)?.playerName ?? ""}
          team={teamById(snap, confirming.teamId)!}
          teams={snap.teams}
          amount={confirming.amount}
          onConfirm={() => confirmSale(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
      {selling && sellingTeam && <CancelToast text={`Selling to ${sellingTeam.short} for ${fmt(selling.amount)}…`} onCancel={cancelSale} />}
    </div>
  );
}

/** Phones and tablets: flip between the console and the board. Laptops show both, so it hides. */
function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const tabs: Array<[View, string]> = [
    ["console", "Console"],
    ["board", "Board"],
  ];
  return (
    <div role="tablist" aria-label="Show" className="grid grid-cols-2 gap-1 px-3 pb-2 lg:hidden">
      {tabs.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          aria-controls={v}
          onClick={() => onChange(v)}
          className="min-h-11 rounded-md border-2 border-white/40 font-display text-xl font-extrabold tracking-wide text-white uppercase focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold aria-selected:border-paper aria-selected:bg-paper aria-selected:text-ink"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
