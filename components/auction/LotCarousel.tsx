"use client";

import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Badge, BandChip, RoleChip } from "@/components/ui/Badge";
import { cx } from "@/components/ui/cx";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { nextLots, previousResults, type LotResult } from "@/lib/auction/carousel";
import type { Snapshot } from "@/lib/auction/types";
import { teamById, type LotView } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { LotCard } from "./LotCard";
import { TeamChip } from "./TeamBar";

type Props = {
  snap: Snapshot;
  /** What's on the block, as the page shows it today. Null between lots: a state card goes there instead. */
  live: ReactNode | null;
  /** Team-colour strip on the live card (owner view: "you lead"). */
  liveAccent?: string;
  prevCount?: number;
  nextCount?: number;
  /** Extra classes for the fixed "Back to live" button, e.g. to centre it over one column. */
  backClassName?: string;
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Previous · Live · Next, one card at a time. Swipe (CSS scroll-snap), arrows or the
 * keyboard to move. Snaps back to live when a new lot opens or a result lands, never on a bid.
 * Only for looking: it never feeds a lot id to a command.
 */
export function LotCarousel({ snap, live, liveAccent, prevCount = 5, nextCount = 3, backClassName }: Props) {
  const prev = previousResults(snap, prevCount);
  const next = nextLots(snap, nextCount);
  const liveIdx = prev.length;
  const total = prev.length + 2;

  const scroller = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(liveIdx);

  const nearest = useCallback((): number => {
    const el = scroller.current;
    if (!el) return 0;
    let best = 0;
    Array.from(el.children).forEach((c, i) => {
      const d = Math.abs((c as HTMLElement).offsetLeft - el.scrollLeft);
      if (d < Math.abs((el.children[best] as HTMLElement).offsetLeft - el.scrollLeft)) best = i;
    });
    return best;
  }, []);

  const go = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    const slide = el?.children[Math.max(0, Math.min(i, el.children.length - 1))] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
  }, []);

  // Back to live on first paint and whenever the lot on the block or the latest result changes.
  // Bids change neither, so browsing is left alone while bidding goes on.
  const changeKey = `${snap.onBlock ?? "-"}|${prev[0] ? `${prev[0].lot.id}:${prev[0].outcome}` : "-"}`;
  useLayoutEffect(() => {
    go(liveIdx, false);
    const raf = requestAnimationFrame(() => setIdx(nearest()));
    return () => cancelAnimationFrame(raf);
  }, [changeKey, liveIdx, go, nearest]);

  // Keep the same card in view when the width changes (rotation, window resize).
  const idxRef = useRef(idx);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => go(idxRef.current, false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [go]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      go(idx + (e.key === "ArrowLeft" ? -1 : 1));
    }
  };

  const onLive = idx === liveIdx;
  const labels: Array<{ label: string; target: number; active: boolean; disabled: boolean }> = [
    { label: "Prev", target: liveIdx - 1, active: idx < liveIdx, disabled: prev.length === 0 },
    { label: "Live", target: liveIdx, active: onLive, disabled: false },
    { label: "Next", target: liveIdx + 1, active: idx > liveIdx, disabled: false },
  ];

  return (
    <section aria-label="Lots" aria-roledescription="carousel" className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Show earlier card" disabled={idx <= 0} onClick={() => go(idx - 1)} className="btn-outline size-11 min-h-11 shrink-0 px-0">
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1">
          {labels.map((l, i) => (
            <span key={l.label} className="contents">
              {i > 0 && (
                <span aria-hidden className="font-bold text-muted">
                  ·
                </span>
              )}
              <button
                type="button"
                disabled={l.disabled}
                aria-current={l.active ? "true" : undefined}
                onClick={() => go(l.target)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 font-display text-xl font-extrabold tracking-wide text-muted uppercase focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40 aria-[current]:bg-ink aria-[current]:text-white"
              >
                {l.label === "Live" && <span aria-hidden className="inline-block size-2.5 rounded-full bg-ball" />}
                {l.label}
              </button>
            </span>
          ))}
        </div>
        <button type="button" aria-label="Show later card" disabled={idx >= total - 1} onClick={() => go(idx + 1)} className="btn-outline size-11 min-h-11 shrink-0 px-0">
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>

      <div
        ref={scroller}
        tabIndex={0}
        role="group"
        aria-label="Swipe or use arrow keys to see the last and next lots"
        onKeyDown={onKeyDown}
        onScroll={() => setIdx(nearest())}
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-lg [scrollbar-width:none] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold [&::-webkit-scrollbar]:hidden"
      >
        {[...prev].reverse().map((r, i) => (
          <Slide key={r.lot.id} label={`Previous: ${r.lot.playerName}`}>
            <PrevCard snap={snap} result={r} ago={prev.length - i} />
          </Slide>
        ))}
        <Slide label="Live" accent={live ? liveAccent : undefined}>
          {live ? (
            <>
              <span className="absolute top-3 right-3 inline-flex min-h-7 items-center gap-1.5 rounded-sm border-2 border-ball bg-paper px-2 text-sm leading-none font-extrabold tracking-wider text-ink uppercase">
                <span aria-hidden className="inline-block size-2.5 rounded-full bg-ball motion-safe:animate-pulse-dot" />
                Live
              </span>
              {live}
            </>
          ) : (
            <StateCard snap={snap} next={next[0]} />
          )}
        </Slide>
        <Slide label="Next up">
          <NextList lots={next} />
        </Slide>
      </div>

      {!onLive && (
        <button
          type="button"
          onClick={() => go(liveIdx)}
          className={cx(
            "btn fixed bottom-4 left-1/2 z-40 min-h-14 -translate-x-1/2 px-6 font-display whitespace-nowrap text-2xl font-extrabold uppercase shadow-pop motion-safe:animate-rise",
            backClassName,
          )}
        >
          <Radio aria-hidden className="size-6" /> Back to live
        </button>
      )}
    </section>
  );
}

function Slide({ label, accent, children }: { label: string; accent?: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      className={cx("card relative w-full shrink-0 self-start snap-center snap-always p-4", accent && "border-t-[6px]")}
      style={accent ? { borderTopColor: accent } : undefined}
    >
      {children}
    </div>
  );
}

function PrevCard({ snap, result, ago }: { snap: Snapshot; result: LotResult; ago: number }) {
  const team = result.outcome === "sold" ? teamById(snap, result.teamId) : undefined;
  return (
    <LotCard
      lot={result.lot}
      eyebrow={
        <>
          {ago === 1 ? "Last lot" : `${ago} lots ago`} · Lot <span className="num">{result.lot.order}</span>
        </>
      }
      detail={
        result.outcome === "sold" ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold uppercase">
            <Badge tone="pitch" className="min-h-8 text-base">
              Sold
            </Badge>
            <span aria-hidden className="text-muted">·</span>
            {team && <TeamChip team={team} teams={snap.teams} className="min-h-8 text-lg" />}
            <span aria-hidden className="text-muted">·</span>
            <span className="num">{fmt(result.price)}</span>
          </p>
        ) : (
          <p className="mt-2">
            <Badge tone="ball" className="min-h-8 text-base">
              Unsold
            </Badge>
          </p>
        )
      }
    />
  );
}

const STATE_TEXT: Record<Snapshot["state"]["status"], [title: string, sub: string]> = {
  draft: ["Not started", "The auction hasn't opened yet."],
  open: ["Between lots", "Waiting for the next player."],
  paused: ["Paused", "Bidding is on hold."],
  completed: ["Auction finished", "Every lot is done."],
};

/** Stands in for the live card when nothing is on the block. */
function StateCard({ snap, next }: { snap: Snapshot; next?: LotView }) {
  const [title, sub] = STATE_TEXT[snap.state.status];
  return (
    <div className="flex h-full flex-col justify-center gap-2 py-4 text-center">
      <p className="eyebrow">Nothing on the block</p>
      <p className="font-display text-4xl leading-none font-extrabold uppercase">{title}</p>
      <p className="font-semibold text-muted">{sub}</p>
      {next && snap.state.status !== "completed" && (
        <p className="text-lg font-bold">
          Next up: <span className="font-display text-2xl uppercase">{next.playerName}</span>
        </p>
      )}
    </div>
  );
}

function statLine(lot: LotView): string {
  const s = lot.card.stats ?? {};
  const parts: string[] = [];
  if (s.matches !== undefined) parts.push(`${s.matches} m`);
  if (s.runs !== undefined) parts.push(`${s.runs} runs`);
  if (s.wickets !== undefined) parts.push(`${s.wickets} wkts`);
  if (s.best) parts.push(`best ${s.best}`);
  return parts.join(" · ");
}

function NextList({ lots }: { lots: LotView[] }) {
  return (
    <div className="space-y-2">
      <p className="eyebrow">Next up</p>
      {lots.length === 0 ? (
        <p className="text-muted">No more lots queued.</p>
      ) : (
        <ol className="space-y-2">
          {lots.map((l) => {
            const stats = statLine(l);
            return (
              <li key={l.id} aria-label={`Lot ${l.order}: ${l.playerName}`} className="flex items-center gap-3 rounded-md border border-line bg-canvas p-2">
                <PlayerPhoto name={l.playerName} url={l.photoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl leading-tight font-extrabold uppercase">{l.playerName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <RoleChip role={l.role} short />
                    <BandChip tier={l.tier} />
                    {stats && <span className="num text-sm font-semibold text-muted">{stats}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-muted uppercase">Base</p>
                  <p className="num font-display text-xl leading-tight font-extrabold">{fmt(l.live.base)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
