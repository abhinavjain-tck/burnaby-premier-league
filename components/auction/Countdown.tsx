"use client";

import { useEffect, useState } from "react";
import type { Clock } from "./useAuctionLive";

/** "Going once…" countdown. Ticks only while a clock is running (battery). */
export function Countdown({ clock, big = false }: { clock: Clock | null; big?: boolean }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!clock) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t > clock.endsAt + 2500) clearInterval(timer);
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [clock]);

  if (!clock || now === 0) return null;
  const left = Math.min(clock.seconds, Math.ceil((clock.endsAt - now) / 1000));
  if (left < -1) return null; // linger on "0" for a moment, then go away
  return (
    <p role="timer" aria-live="off" className={`rounded-lg bg-ink text-center font-black text-white tabular-nums ${big ? "py-3 text-5xl" : "py-2 text-3xl"}`}>
      {left > 0 ? `Going… ${left}` : "Time!"}
    </p>
  );
}
