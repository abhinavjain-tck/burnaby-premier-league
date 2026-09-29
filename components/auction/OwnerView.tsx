"use client";

import type { Snapshot } from "@/lib/auction/types";
import { lotView, ROLE_SHORT, teamById, teamStats, upcoming } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { roleLabel } from "@/lib/registration/options";
import { LiveStatus } from "./LiveStatus";
import { TeamBar } from "./TeamBar";
import { useAuctionLive } from "./useAuctionLive";

/** Read-only view for one team owner: money, squad, what's on the block and what's next. */
export function OwnerView({ initial, teamId }: { initial: Snapshot; teamId: string }) {
  const { snap, connected } = useAuctionLive(initial);
  const team = teamById(snap, teamId);
  if (!team) return <p className="p-4">That team isn&apos;t in this auction.</p>;
  const stats = teamStats(snap, team);
  const lot = lotView(snap, snap.onBlock);
  const leader = teamById(snap, lot?.live.currentTeamId);
  const next = upcoming(snap, 5);

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-bold text-muted uppercase">{snap.auction.name}</p>
        <LiveStatus connected={connected} />
      </div>
      <TeamBar team={team} className="text-3xl">
        {team.name}
      </TeamBar>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border-2 border-ink p-2">
          <dt className="text-xs font-bold text-muted uppercase">Purse left</dt>
          <dd className="text-2xl font-black tabular-nums">{fmt(stats.purseLeft)}</dd>
        </div>
        <div className="rounded-lg border-2 border-ink p-2">
          <dt className="text-xs font-bold text-muted uppercase">Squad</dt>
          <dd className="text-2xl font-black tabular-nums">
            {stats.squadSize}/{snap.config.maxSquad}
          </dd>
        </div>
        <div className="rounded-lg border-2 border-ink p-2">
          <dt className="text-xs font-bold text-muted uppercase">Max bid now</dt>
          <dd className="text-2xl font-black tabular-nums">{stats.squadSize >= snap.config.maxSquad ? "—" : fmt(stats.maxBid)}</dd>
        </div>
      </dl>
      <p className="font-semibold">
        Squad:{" "}
        {Object.entries(stats.roles)
          .map(([role, n]) => `${n} ${ROLE_SHORT[role] ?? role}`)
          .join(" · ")}
        {stats.squadSize < snap.config.minSquad && <span className="text-muted"> · need {snap.config.minSquad - stats.squadSize} more</span>}
      </p>

      <section aria-labelledby="live-h" className="rounded-lg border-2 border-ink p-3">
        <h2 id="live-h" className="text-lg font-black">
          Live now
        </h2>
        {lot ? (
          <p className="text-xl">
            <strong>{lot.playerName}</strong> ({roleLabel(lot.role)}) ·{" "}
            {lot.live.currentBid !== undefined && leader ? (
              <strong>
                {fmt(lot.live.currentBid)} · {leader.id === team.id ? "you" : leader.short}
              </strong>
            ) : (
              <>base {fmt(lot.live.base)}, no bid yet</>
            )}
          </p>
        ) : (
          <p className="text-muted">Nothing on the block.</p>
        )}
      </section>

      <section aria-labelledby="next-h">
        <h2 id="next-h" className="text-lg font-black">
          Coming up
        </h2>
        {next.length === 0 ? (
          <p className="text-muted">No more lots queued.</p>
        ) : (
          <ol className="divide-y divide-zinc-200">
            {next.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-bold">{l.playerName}</span> <span className="text-muted">· {roleLabel(l.role)}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">{fmt(l.live.base)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
