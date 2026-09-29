import Image from "next/image";
import { roleLabel } from "@/lib/registration/options";
import type { Stats } from "@/lib/registration/queries";

/** Public-safe fields only. Never pass phone, email or payment data in here. */
export type CardData = {
  fullName: string;
  role: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  bio: string | null;
  stats: unknown;
  photoUrl: string | null;
  cricheroesUrl: string | null;
  tier?: string | null;
};

/** Copy only the card fields, so private columns can't ride along by accident. */
export const toCard = (r: CardData): CardData => ({
  fullName: r.fullName,
  role: r.role,
  battingStyle: r.battingStyle,
  bowlingStyle: r.bowlingStyle,
  bio: r.bio,
  stats: r.stats,
  photoUrl: r.photoUrl,
  cricheroesUrl: r.cricheroesUrl,
  tier: r.tier,
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export function CardPreview({ card }: { card: CardData }) {
  const stats = (card.stats ?? {}) as Stats;
  const numbers: Array<[string, string | number | undefined]> = [
    ["Matches", stats.matches],
    ["Runs", stats.runs],
    ["Wkts", stats.wickets],
    ["Best", stats.best],
  ];
  return (
    <article aria-label="Auction card preview" className="overflow-hidden rounded-xl border-2 border-ink bg-white">
      <div className="flex gap-4 p-4">
        {card.photoUrl ? (
          <Image src={card.photoUrl} alt={card.fullName} width={112} height={112} unoptimized className="h-28 w-28 shrink-0 rounded-lg object-cover" />
        ) : (
          <div aria-hidden className="grid h-28 w-28 shrink-0 place-items-center rounded-lg bg-zinc-200 text-3xl font-black">
            {initials(card.fullName)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-2xl leading-tight font-black break-words">{card.fullName}</h3>
          <p className="font-bold">
            {roleLabel(card.role)}
            {card.tier ? ` · Tier ${card.tier}` : ""}
          </p>
          <p className="text-muted">{[card.battingStyle, card.bowlingStyle].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {card.bio && <p className="px-4 pb-3">{card.bio}</p>}
      <dl className="grid grid-cols-4 border-t-2 border-ink text-center">
        {numbers.map(([label, value]) => (
          <div key={label} className="py-2">
            <dt className="text-xs font-bold uppercase text-muted">{label}</dt>
            <dd className="text-xl font-black">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      {card.cricheroesUrl && (
        <a href={card.cricheroesUrl} target="_blank" rel="noopener noreferrer" className="block border-t-2 border-ink px-4 py-3 font-bold text-brand underline">
          CricHeroes profile
        </a>
      )}
    </article>
  );
}
