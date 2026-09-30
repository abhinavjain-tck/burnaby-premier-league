import { Wifi, WifiOff } from "lucide-react";

/** Small pill that tells people whether the board is live or catching up by polling. */
export function LiveStatus({ connected }: { connected: boolean }) {
  return (
    <p
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-bold whitespace-nowrap ${
        connected ? "border-pitch bg-pitch-soft text-pitch" : "border-gold-dark bg-gold-soft text-ink"
      }`}
      aria-live="polite"
    >
      {connected ? (
        <>
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-ball motion-safe:animate-pulse-dot" />
          <Wifi aria-hidden className="size-4" />
          Live
        </>
      ) : (
        <>
          <WifiOff aria-hidden className="size-4" />
          Updating every 5 s
        </>
      )}
    </p>
  );
}
