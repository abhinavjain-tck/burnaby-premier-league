import Image from "next/image";
import type { LotView } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { roleLabel } from "@/lib/registration/options";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** The player on the block. `big` for the board, compact for the console. */
export function LotCard({ lot, big = false }: { lot: LotView; big?: boolean }) {
  const stats = lot.card.stats ?? {};
  const photo = big ? "h-28 w-28 text-4xl" : "h-20 w-20 text-2xl";
  const statLine = [
    stats.matches !== undefined && `${stats.matches} m`,
    stats.runs !== undefined && `${stats.runs} r`,
    stats.wickets !== undefined && `${stats.wickets} w`,
    stats.best && `best ${stats.best}`,
  ].filter(Boolean);
  return (
    <article aria-label={`Lot ${lot.order}: ${lot.playerName}`} className="flex gap-3">
      {lot.photoUrl ? (
        <Image src={lot.photoUrl} alt="" width={112} height={112} unoptimized className={`${photo} shrink-0 rounded-lg object-cover`} />
      ) : (
        <div aria-hidden className={`${photo} grid shrink-0 place-items-center rounded-lg bg-zinc-200 font-black`}>
          {initials(lot.playerName)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-muted uppercase">
          Lot {lot.order} · {lot.setName}
        </p>
        <h2 className={`${big ? "text-4xl" : "text-2xl"} leading-tight font-black break-words`}>{lot.playerName}</h2>
        <p className="font-bold">
          {roleLabel(lot.role)}
          {lot.tier ? ` · Tier ${lot.tier}` : ""} · Base {fmt(lot.live.base)}
        </p>
        {big && (lot.card.battingStyle || lot.card.bowlingStyle) && (
          <p className="text-muted">{[lot.card.battingStyle, lot.card.bowlingStyle].filter(Boolean).join(" · ")}</p>
        )}
        {big && statLine.length > 0 && <p className="font-semibold">{statLine.join(" · ")}</p>}
      </div>
    </article>
  );
}
