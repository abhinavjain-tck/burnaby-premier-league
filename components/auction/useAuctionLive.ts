"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSnapshot } from "@/app/auction/actions";
import { channelName } from "@/lib/auction/channel";
import { applyLive, CLOCK_STOPPERS, mergeLive, needsFullFetch } from "@/lib/auction/live";
import type { ClockMessage, LiveMessage, LiveSnapshot, Snapshot } from "@/lib/auction/types";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type Part = "full" | "live";
type Loader = (id: string, part: Part) => Promise<Snapshot | LiveSnapshot | null>;

export type Clock = { endsAt: number; seconds: number };

export type AuctionLive = {
  snap: Snapshot;
  /** Take a snapshot the server just handed back (the console after a command). Older ones are ignored. */
  replace: (next: Snapshot) => void;
  /** True while the realtime channel is joined. False means we're polling every 5 s. */
  connected: boolean;
  clock: Clock | null;
  startClock: (seconds: number) => void;
  refresh: (part?: Part) => Promise<void>;
};

const POLL_MS = 5000;
const isFull = (s: Snapshot | LiveSnapshot): s is Snapshot => "lots" in s;

/**
 * Keeps one auction snapshot current on a phone. Listens on Supabase Realtime
 * channel auction:{id}; applies each event with the shared reducer when it's the
 * next version, otherwise refetches. Refetches when the phone wakes up, and polls
 * every 5 s whenever the channel isn't joined (or Supabase isn't set up).
 */
export function useAuctionLive(initial: Snapshot, opts: { load?: Loader; eventLimit?: number } = {}): AuctionLive {
  const load = opts.load ?? fetchSnapshot;
  const eventLimit = opts.eventLimit ?? 10;
  const id = initial.auction.id;

  const [snap, setSnap] = useState(initial);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState<Clock | null>(null);
  const snapRef = useRef(initial);
  const busy = useRef(false);
  const queued = useRef<Part | null>(null);

  const commit = useCallback((next: Snapshot) => {
    const prev = snapRef.current;
    // A bid, sale or new lot ends any "going once" clock.
    if (next.auction.version > prev.auction.version && CLOCK_STOPPERS.has(next.lastEvents[0]?.type ?? "")) setClock(null);
    snapRef.current = next;
    setSnap(next);
  }, []);

  const replace = useCallback(
    (next: Snapshot) => {
      if (next.auction.version >= snapRef.current.auction.version) commit(next);
    },
    [commit],
  );

  const refresh = useCallback(
    async (part: Part = "live") => {
      // One fetch at a time; a request that comes in meanwhile runs once more afterwards.
      if (busy.current) {
        queued.current = queued.current === "full" ? "full" : part;
        return;
      }
      busy.current = true;
      let next: Part | null = part;
      while (next) {
        const want: Part = next;
        queued.current = null;
        try {
          let got = await load(id, want);
          if (got && !isFull(got) && needsFullFetch(snapRef.current, got)) got = await load(id, "full");
          const current = snapRef.current;
          if (got && isFull(got)) {
            if (got.auction.version >= current.auction.version) commit(got);
          } else if (got) {
            const merged = mergeLive(current, got);
            if (merged !== current) commit(merged);
          }
        } catch (err) {
          console.warn("Auction refresh failed; will retry", err);
        }
        next = queued.current;
      }
      busy.current = false;
    },
    [commit, id, load],
  );

  const startClock = useCallback((seconds: number) => setClock({ endsAt: Date.now() + seconds * 1000, seconds }), []);

  // Realtime. Our own clock comes from the console directly, so self: false.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(channelName(id), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "event" }, ({ payload }) => {
        const msg = payload as LiveMessage;
        const result = applyLive(snapRef.current, msg, eventLimit);
        if (result.kind === "applied") {
          commit(result.snapshot);
        } else if (result.kind === "refetch") {
          setClock(null);
          void refresh("live");
        } else if (result.kind === "reload") {
          void refresh("full");
        }
      })
      .on("broadcast", { event: "clock" }, ({ payload }) => {
        const msg = payload as ClockMessage;
        // Count from when it arrived, not the server's clock: phone clocks drift.
        if (msg?.seconds > 0) setClock({ endsAt: Date.now() + msg.seconds * 1000, seconds: msg.seconds });
      })
      .subscribe((status) => {
        const joined = status === "SUBSCRIBED";
        setConnected(joined);
        if (joined) void refresh("live"); // catch up on anything missed while offline
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [commit, eventLimit, id, refresh]);

  // Phones sleep all the time on the ground. Catch up the moment the screen is back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh("live");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Polling fallback while the channel is down.
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh("live");
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [connected, refresh]);

  return { snap, replace, connected, clock, startClock, refresh };
}
