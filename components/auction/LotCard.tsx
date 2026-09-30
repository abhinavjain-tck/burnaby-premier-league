import { BandChip, RoleChip } from "@/components/ui/Badge";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { setLabel, type LotView } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import type { ReactNode } from "react";

type Props = {
  lot: LotView;
  big?: boolean;
  /** Replaces the "Lot 12 · Batters" line. */
  eyebrow?: ReactNode;
  /** Replaces the base price line. The carousel shows a finished lot's result there. */
  detail?: ReactNode;
};

/** The player on the block. `big` for the board, compact for the console. */
export function LotCard({ lot, big = false, eyebrow, detail }: Props) {
  const stats = lot.card.stats ?? {};
  const statLine: Array<[string, string | number]> = [];
  if (stats.matches !== undefined) statLine.push(["Matches", stats.matches]);
  if (stats.runs !== undefined) statLine.push(["Runs", stats.runs]);
  if (stats.wickets !== undefined) statLine.push(["Wkts", stats.wickets]);
  if (stats.best) statLine.push(["Best", stats.best]);
  const styles = [lot.card.battingStyle, lot.card.bowlingStyle].filter(Boolean).join(" · ");
  return (
    <article aria-label={`Lot ${lot.order}: ${lot.playerName}`} className="space-y-3">
      <p className="eyebrow">
        {eyebrow ?? (
          <>
            Lot <span className="num">{lot.order}</span> · {setLabel(lot.setName)}
          </>
        )}
      </p>
      <div className="flex gap-3 sm:gap-4">
        <PlayerPhoto name={lot.playerName} url={lot.photoUrl} size={big ? "xl" : "md"} />
        <div className="min-w-0 flex-1">
          <h2 className={`${big ? "text-4xl sm:text-5xl" : "text-3xl"} font-display leading-[0.95] font-extrabold break-words uppercase`}>{lot.playerName}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RoleChip role={lot.role} />
            <BandChip tier={lot.tier} />
          </div>
          {detail ?? (
            <p className="mt-2 font-semibold">
              Base <span className="num font-display text-xl font-extrabold">{fmt(lot.live.base)}</span>
            </p>
          )}
        </div>
      </div>
      {big && (styles || statLine.length > 0) && (
        <div className="space-y-2">
          {styles && <p className="font-semibold text-muted">{styles}</p>}
          {statLine.length > 0 && (
            <dl className="grid grid-cols-4 divide-x divide-line rounded-md border border-line bg-canvas text-center">
              {statLine.map(([label, value]) => (
                <div key={label} className="px-1 py-1.5">
                  <dt className="text-xs font-bold text-muted uppercase">{label}</dt>
                  <dd className="num font-display text-xl leading-tight font-extrabold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}
