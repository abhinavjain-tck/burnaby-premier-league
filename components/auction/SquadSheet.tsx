"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge, BandChip, RoleChip } from "@/components/ui/Badge";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { Stat } from "@/components/ui/Stat";
import { teamStyle } from "@/components/ui/team";
import { squadOf, type Squad, type SquadPlayer } from "@/lib/auction/squad";
import type { Snapshot } from "@/lib/auction/types";
import { fmt } from "@/lib/money";

type Props = { snap: Snapshot; teamId: string | null; onClose: () => void };

/**
 * One team's squad so far. Bottom sheet on phones, side panel on laptops.
 * Native <dialog>: focus moves in and back out, Escape closes. It reads the same
 * live snapshot as the board, so a sale shows up here as soon as it lands.
 */
export function SquadSheet({ snap, teamId, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const squad = teamId ? squadOf(snap, teamId) : null;
  const open = squad !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // No page scroll behind the sheet.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="squad-h"
      onClose={onClose}
      // A tap on the dimmed backdrop lands on the dialog itself.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-xl bg-paper p-0 text-ink shadow-pop backdrop:bg-ink/60 open:flex open:flex-col motion-safe:open:animate-rise lg:inset-y-0 lg:right-0 lg:left-auto lg:h-dvh lg:max-h-none lg:w-[30rem] lg:rounded-t-none lg:rounded-l-xl"
    >
      {squad && <SquadBody squad={squad} snap={snap} onClose={() => ref.current?.close()} />}
    </dialog>
  );
}

function SquadBody({ squad, snap, onClose }: { squad: Squad; snap: Snapshot; onClose: () => void }) {
  const { team } = squad;
  return (
    <>
      <header className="flex shrink-0 items-center gap-3 py-2 pr-2 pl-4" style={teamStyle(team, snap.teams)}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase opacity-90">Squad so far</p>
          <h2 id="squad-h" className="font-display text-3xl leading-tight font-extrabold break-words uppercase">
            {team.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close"
          className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-md border-2 border-current focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <X aria-hidden className="size-7" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SquadTotals squad={squad} />
        <SquadList squad={squad} />
      </div>
    </>
  );
}

/** Players, spent, purse left and how many more to reach the minimum. */
export function SquadTotals({ squad }: { squad: Squad }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line bg-canvas p-4 sm:grid-cols-4">
      <Stat label="Players" value={`${squad.size}/${squad.maxSquad}`} />
      <Stat label="Spent" value={fmt(squad.spent)} />
      <Stat label="Purse left" value={fmt(squad.purseLeft)} />
      <Stat label="Still need" value={squad.needed > 0 ? squad.needed : "Done"} />
    </dl>
  );
}

/** Captain first, then each buy. Photo, name, chips, short stats and price. */
export function SquadList({ squad }: { squad: Squad }) {
  if (squad.players.length === 0) {
    return <p className="p-6 text-center font-semibold text-muted">No players yet.</p>;
  }
  return (
    <ol aria-label={`${squad.team.name} players`} className="divide-y divide-line">
      {squad.players.map((p) => (
        <SquadRow key={p.id} p={p} />
      ))}
    </ol>
  );
}

function statLine(s: SquadPlayer["stats"]): string {
  const parts: string[] = [];
  if (s.matches !== undefined) parts.push(`${s.matches} m`);
  if (s.runs !== undefined) parts.push(`${s.runs} runs`);
  if (s.wickets !== undefined) parts.push(`${s.wickets} wkts`);
  return parts.join(" · ");
}

function SquadRow({ p }: { p: SquadPlayer }) {
  const stats = statLine(p.stats);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <PlayerPhoto name={p.name} url={p.photoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="leading-tight font-bold break-words">{p.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {p.captain && <Badge tone="pitch">Captain</Badge>}
          <RoleChip role={p.role} short />
          <BandChip tier={p.tier} />
        </div>
        {stats && <p className="num mt-1 text-sm font-semibold text-muted">{stats}</p>}
      </div>
      <p className="num shrink-0 text-right font-display text-2xl leading-tight font-extrabold">{fmt(p.price)}</p>
    </li>
  );
}
