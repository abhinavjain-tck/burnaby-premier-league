import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { BandChip, RoleChip } from "@/components/ui/Badge";
import { initials } from "@/components/ui/PlayerPhoto";
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

/** The player's auction card, styled like a trading card: green frame, big photo, name plate, stat row. */
export function CardPreview({ card }: { card: CardData }) {
  const stats = (card.stats ?? {}) as Stats;
  const numbers: Array<[string, string | number | undefined]> = [
    ["Matches", stats.matches],
    ["Runs", stats.runs],
    ["Wkts", stats.wickets],
    ["Best", stats.best],
  ];
  const styles = [card.battingStyle, card.bowlingStyle].filter(Boolean).join(" · ");
  return (
    <article aria-label="Auction card preview" className="mx-auto w-full max-w-sm rounded-xl bg-pitch p-2 shadow-pop">
      <div className="overflow-hidden rounded-lg border-2 border-gold bg-paper">
        <div className="relative bg-pitch-dark">
          {card.photoUrl ? (
            <Image src={card.photoUrl} alt={card.fullName} width={640} height={480} unoptimized className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div aria-hidden className="grid aspect-[4/3] w-full place-items-center font-display text-8xl font-extrabold text-white/90">
              {initials(card.fullName) || "?"}
            </div>
          )}
          <span className="absolute top-2 left-2 rounded-sm bg-ink/85 px-2 py-1 font-display text-sm font-bold tracking-wider text-white uppercase">
            BPL · S4
          </span>
          {card.tier && (
            <span className="absolute top-2 right-2">
              <BandChip tier={card.tier} />
            </span>
          )}
        </div>
        <div className="border-t-4 border-gold px-4 pt-3 pb-3">
          <h3 className="font-display text-3xl leading-[0.95] font-extrabold break-words uppercase">{card.fullName}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleChip role={card.role} />
            {styles && <span className="text-sm font-semibold text-muted">{styles}</span>}
          </div>
          {card.bio && <p className="mt-2 text-ink">{card.bio}</p>}
        </div>
        <dl className="grid grid-cols-4 divide-x divide-line border-t border-line bg-canvas text-center">
          {numbers.map(([label, value]) => (
            <div key={label} className="px-1 py-2">
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
              <dd className="num font-display text-2xl leading-tight font-extrabold">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        {card.cricheroesUrl && (
          <a
            href={card.cricheroesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 border-t border-line font-bold text-pitch underline underline-offset-4"
          >
            CricHeroes profile <ExternalLink aria-hidden className="size-4" />
          </a>
        )}
      </div>
    </article>
  );
}
