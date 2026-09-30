"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import type { Clock } from "./useAuctionLive";

/** "Going once…" countdown: big number plus a bar that drains. Ticks only while a clock is running (battery). */
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
  const share = Math.max(0, Math.min(1, (clock.endsAt - now) / (clock.seconds * 1000)));
  const urgent = left <= 3;
  return (
    <div role="timer" aria-live="off" className="overflow-hidden rounded-md bg-ink text-white">
      <p className={`flex items-center justify-center gap-3 font-display font-extrabold uppercase ${big ? "py-3 text-5xl" : "py-2 text-3xl"}`}>
        <Timer aria-hidden className={big ? "size-9" : "size-7"} />
        <span className="num">{left > 0 ? `Going… ${left}` : "Time!"}</span>
      </p>
      <div aria-hidden className="h-2.5 bg-white/20">
        <div
          className={`h-full origin-left transition-transform duration-250 ease-linear ${urgent ? "bg-ball" : "bg-gold"}`}
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  );
}
