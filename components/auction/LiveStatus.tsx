/** Tiny line that tells people whether the board is live or catching up by polling. */
export function LiveStatus({ connected }: { connected: boolean }) {
  return (
    <p className="flex shrink-0 items-center gap-2 text-sm font-semibold whitespace-nowrap text-muted" aria-live="polite">
      <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${connected ? "bg-green-700" : "bg-amber-600"}`} />
      {connected ? "Live" : "Updating every 5 s"}
    </p>
  );
}
