import { addConfirmedPlayers, addFakePlayers, clearTestLots, shuffleSets } from "@/app/admin/auctions/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import type { Snapshot } from "@/lib/auction/types";

/** Fill the pool and set the running order. Adding only before the auction opens; shuffling also while paused. */
export function SeedLots({ snap }: { snap: Snapshot }) {
  const id = snap.auction.id;
  const status = snap.state.status;
  const draft = status === "draft";
  const test = snap.auction.mode === "test";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {draft && (
        <ActionForm action={addConfirmedPlayers.bind(null, id)}>
          <button type="submit" className="btn w-full">
            Add confirmed players
          </button>
        </ActionForm>
      )}
      {draft && test && (
        <ActionForm action={addFakePlayers.bind(null, id)}>
          <button type="submit" className="btn-outline w-full">
            Add 48 fake players
          </button>
        </ActionForm>
      )}
      {(draft || status === "paused") && snap.lots.length > 1 && (
        <ActionForm action={shuffleSets.bind(null, id)}>
          <button type="submit" className="btn-outline w-full">
            Shuffle order within sets
          </button>
        </ActionForm>
      )}
      {test && snap.auction.version === 0 && snap.lots.length > 0 && (
        <ActionForm action={clearTestLots.bind(null, id)}>
          <button type="submit" className="btn-danger w-full">
            Remove all lots
          </button>
        </ActionForm>
      )}
    </div>
  );
}
