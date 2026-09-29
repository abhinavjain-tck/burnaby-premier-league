import { randomUUID } from "node:crypto";
import { adminCommand } from "@/app/admin/auctions/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import type { Snapshot } from "@/lib/auction/types";
import { LAKH_PER_CRORE } from "@/lib/money";

/** Put an owner (or any player) on a team at a fixed price before lot 1. Logged as a PRESOLD event. */
export function Presell({ snap }: { snap: Snapshot }) {
  const queued = snap.lots.filter((l) => snap.state.lots[l.id]?.status === "queued");
  if (snap.state.status === "completed" || queued.length === 0) return null;
  return (
    <ActionForm action={adminCommand.bind(null, snap.auction.id)}>
      <input type="hidden" name="type" value="PRESOLD" />
      <input type="hidden" name="version" value={snap.auction.version} />
      <input type="hidden" name="key" value={randomUUID()} />
      <div>
        <label className="label" htmlFor="presell-lot">
          Player
        </label>
        <select id="presell-lot" name="lotId" className="field" required defaultValue="">
          <option value="" disabled>
            Pick a player
          </option>
          {queued.map((l) => (
            <option key={l.id} value={l.id}>
              {l.playerName} (lot {l.order})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="presell-team">
            Team
          </label>
          <select id="presell-team" name="teamId" className="field" required defaultValue="">
            <option value="" disabled>
              Pick a team
            </option>
            {snap.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="presell-amount">
            Price (crores)
          </label>
          <input
            id="presell-amount"
            name="amountCr"
            className="field"
            inputMode="decimal"
            required
            defaultValue={snap.config.ownerPresoldLakhs / LAKH_PER_CRORE}
          />
        </div>
      </div>
      <button type="submit" className="btn-outline w-full">
        Pre-sell
      </button>
    </ActionForm>
  );
}
