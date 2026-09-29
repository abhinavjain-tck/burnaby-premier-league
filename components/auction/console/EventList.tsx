import { isMarker } from "@/lib/auction/log";
import type { Snapshot } from "@/lib/auction/types";
import { describeEvent } from "@/lib/auction/view";

// 24-hour clock in ground time; same output on server and phone, so no hydration mismatch.
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Vancouver", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() === 0 ? "" : clock.format(d);
};

/** Last 20 events, newest first. Undone ones are struck through; undo/redo markers are muted. */
export function EventList({ snap }: { snap: Snapshot }) {
  return (
    <details className="rounded-lg border-2 border-ink p-3">
      <summary className="cursor-pointer text-lg font-black">Events (last {snap.lastEvents.length})</summary>
      <ol className="mt-2 divide-y divide-zinc-200">
        {snap.lastEvents.map((e) => (
          <li key={e.seq} className={`py-2 ${isMarker(e.type) ? "text-muted" : ""}`}>
            <span className={e.undone ? "line-through decoration-2" : "font-semibold"}>
              <span className="mr-2 font-mono text-sm text-muted">#{e.seq}</span>
              {describeEvent(snap, e)}
            </span>
            {e.undone && <span className="ml-2 text-sm font-bold text-red-800">undone</span>}
            <span className="block text-xs text-muted">
              {time(e.at)}
              {e.actor ? ` · ${e.actor}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
