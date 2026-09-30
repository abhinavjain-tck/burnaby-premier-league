"use client";

import { Radio } from "lucide-react";
import { useState } from "react";
import { RoleChip } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { Stat } from "@/components/ui/Stat";
import { teamColour } from "@/components/ui/team";
import { squadOf } from "@/lib/auction/squad";
import type { Snapshot } from "@/lib/auction/types";
import { lotView, ROLE_SHORT, teamById, teamStats, upcoming } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { LiveStatus } from "./LiveStatus";
import { SquadList, SquadSheet } from "./SquadSheet";
import { TeamBar, TeamChip } from "./TeamBar";
import { useAuctionLive } from "./useAuctionLive";

/** Read-only view for one team owner: money, squad, what's on the block and what's next. */
export function OwnerView({ initial, teamId }: { initial: Snapshot; teamId: string }) {
  const { snap, connected } = useAuctionLive(initial);
  const [otherTeam, setOtherTeam] = useState<string | null>(null);
  const team = teamById(snap, teamId);
  const squad = squadOf(snap, teamId);
  if (!team || !squad) return <p className="p-4">That team isn&apos;t in this auction.</p>;
  const stats = teamStats(snap, team);
  const lot = lotView(snap, snap.onBlock);
  const leader = teamById(snap, lot?.live.currentTeamId);
  const next = upcoming(snap, 5);
  const full = stats.squadSize >= snap.config.maxSquad;
  const slotsLeft = Math.max(0, snap.config.maxSquad - stats.squadSize);
  const needed = Math.max(0, snap.config.minSquad - stats.squadSize);
  // Rough budget: purse spread evenly over the players still needed for a minimum squad.
  const perSlot = needed > 0 ? Math.floor(stats.purseLeft / needed) : null;
  const youLead = leader?.id === team.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow truncate">{snap.auction.name}</p>
        <LiveStatus connected={connected} />
      </div>

      <section aria-label="Your team" className="card overflow-hidden">
        <TeamBar team={team} teams={snap.teams} className="rounded-none px-4 py-3 text-4xl">
          {team.name}
        </TeamBar>
        {squad.captain && (
          <p className="flex items-center gap-2 border-b border-line px-4 py-2">
            <PlayerPhoto name={squad.captain.name} url={squad.captain.photoUrl} size="xs" />
            <span className="min-w-0 truncate font-bold">
              <span className="text-muted">Capt.</span> {squad.captain.name}
            </span>
          </p>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-4">
          <Stat label="Purse left" value={fmt(stats.purseLeft)} size="xl" className="col-span-2" />
          <Stat label="Max bid now" value={full ? "—" : fmt(stats.maxBid)} size="lg" />
          <Stat label="Slots left" value={slotsLeft} sub={`${stats.squadSize} of ${snap.config.maxSquad} signed`} size="lg" />
          <Stat
            label={`Per player to reach ${snap.config.minSquad}`}
            value={perSlot === null ? "—" : fmt(perSlot)}
            sub={needed > 0 ? `${needed} more needed` : "Minimum squad done"}
            size="lg"
            className="col-span-2"
          />
        </dl>
        <div className="flex flex-wrap gap-1.5 border-t border-line bg-canvas px-4 py-3">
          <span className="mr-1 text-sm font-bold text-muted uppercase">Squad</span>
          {Object.entries(stats.roles).map(([role, n]) => (
            <span key={role} className="num rounded-sm border border-edge bg-paper px-2 text-sm font-bold uppercase">
              {n} {ROLE_SHORT[role] ?? role}
            </span>
          ))}
        </div>
      </section>

      <Card
        title={
          <span className="flex items-center gap-2">
            <Radio aria-hidden className="size-6 text-ball" /> Live now
          </span>
        }
        accent={youLead ? teamColour(team, snap.teams) : undefined}
      >
        {lot ? (
          <div className="space-y-2">
            <p className="font-display text-3xl leading-tight font-extrabold uppercase">{lot.playerName}</p>
            <RoleChip role={lot.role} />
            {lot.live.currentBid !== undefined && leader ? (
              <p className="flex flex-wrap items-center gap-3">
                <span className="num font-display text-5xl leading-none font-extrabold">{fmt(lot.live.currentBid)}</span>
                {youLead ? (
                  <span className="rounded-sm bg-pitch px-2 py-1 font-bold text-white uppercase">You lead</span>
                ) : (
                  <TeamChip team={leader} teams={snap.teams} className="min-h-8 text-lg" />
                )}
              </p>
            ) : (
              <p className="text-lg font-semibold text-muted">
                Base <span className="num">{fmt(lot.live.base)}</span>, no bid yet
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted">Nothing on the block.</p>
        )}
      </Card>

      <Card title="Your squad" aside={<span className="num font-bold text-muted">{squad.size}/{squad.maxSquad}</span>} pad={false}>
        <div className="border-t border-line">
          <SquadList squad={squad} />
        </div>
      </Card>

      <Card title="Coming up" pad={false}>
        {next.length === 0 ? (
          <p className="px-4 pb-4 text-muted">No more lots queued.</p>
        ) : (
          <ol className="divide-y divide-line border-t border-line">
            {next.map((l) => (
              <li key={l.id} className="flex min-h-12 items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1 truncate font-bold">{l.playerName}</span>
                <RoleChip role={l.role} short />
                <span className="num w-16 shrink-0 text-right font-display text-xl font-extrabold">{fmt(l.live.base)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Other squads">
        <div className="grid grid-cols-3 gap-2">
          {snap.teams
            .filter((t) => t.id !== team.id)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOtherTeam(t.id)}
                aria-haspopup="dialog"
                aria-label={`${t.name} squad`}
                className="btn-outline min-h-12 px-2"
              >
                <TeamChip team={t} teams={snap.teams} />
              </button>
            ))}
        </div>
      </Card>

      <SquadSheet snap={snap} teamId={otherTeam} onClose={() => setOtherTeam(null)} />
    </div>
  );
}
