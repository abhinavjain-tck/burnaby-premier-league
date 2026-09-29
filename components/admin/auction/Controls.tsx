import { randomUUID } from "node:crypto";
import { adminCommand } from "@/app/admin/auctions/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import type { Snapshot } from "@/lib/auction/types";

type Step = { type: "START" | "PAUSE" | "RESUME" | "COMPLETE"; label: string; primary?: boolean };

const STEPS: Record<Snapshot["state"]["status"], Step[]> = {
  draft: [{ type: "START", label: "Open the auction", primary: true }],
  open: [
    { type: "PAUSE", label: "Pause" },
    { type: "COMPLETE", label: "Complete" },
  ],
  paused: [
    { type: "RESUME", label: "Resume", primary: true },
    { type: "COMPLETE", label: "Complete" },
  ],
  completed: [],
};

/** Open / Pause / Resume / Complete. Same command path as the console, so they land in the event log. */
export function Controls({ snap }: { snap: Snapshot }) {
  const steps = STEPS[snap.state.status];
  if (steps.length === 0) return <p className="font-bold">This auction is finished. Undo from the console if that was a mistake.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {steps.map((s) => (
        <ActionForm key={s.type} action={adminCommand.bind(null, snap.auction.id)}>
          <input type="hidden" name="type" value={s.type} />
          <input type="hidden" name="version" value={snap.auction.version} />
          <input type="hidden" name="key" value={randomUUID()} />
          <button type="submit" className={`${s.primary ? "btn" : "btn-outline"} w-full`}>
            {s.label}
          </button>
        </ActionForm>
      ))}
    </div>
  );
}
