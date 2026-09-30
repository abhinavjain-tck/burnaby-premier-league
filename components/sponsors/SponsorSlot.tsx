import { asc, sql } from "drizzle-orm";
import Image from "next/image";
import { cache } from "react";
import { isDbConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { sponsors } from "@/lib/db/schema";

type Placement = "hero" | "strip" | "reg_step" | "auction_lot";
type Sponsor = { id: string; name: string; logoUrl: string | null; url: string | null };

/** Cached per request, so several slots on one page share one query. */
const loadSponsors = cache(async (placement: Placement): Promise<Sponsor[]> => {
  if (!isDbConfigured()) return [];
  try {
    return await getDb()
      .select({ id: sponsors.id, name: sponsors.name, logoUrl: sponsors.logoUrl, url: sponsors.url })
      .from(sponsors)
      .where(
        sql`${sponsors.placements} @> ${JSON.stringify([placement])}::jsonb
            and ${sponsors.seasonId} = (select max(id) from seasons)`,
      )
      .orderBy(asc(sponsors.sortOrder));
  } catch (err) {
    // Sponsors are decoration: never take the page down because of them.
    console.error(`SponsorSlot(${placement}) failed`, err);
    return [];
  }
});

/** How many sponsors have this placement (0 when the DB is not set up). */
export const countSponsors = async (placement: Placement): Promise<number> => (await loadSponsors(placement)).length;

const safeHref = (url: string | null) => (url && /^https?:\/\//.test(url) ? url : null);

function Logo({ sponsor, className }: { sponsor: Sponsor; className: string }) {
  const body = sponsor.logoUrl ? (
    <Image src={sponsor.logoUrl} alt={sponsor.name} width={320} height={128} unoptimized className={`${className} w-auto max-w-[12rem] object-contain`} />
  ) : (
    <span className="font-display text-2xl leading-tight font-extrabold text-ink uppercase">{sponsor.name}</span>
  );
  const href = safeHref(sponsor.url);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {body}
    </a>
  ) : (
    body
  );
}

/**
 * Renders sponsors for one placement key from the sponsors table.
 * Renders nothing when there are none (or the DB is not set up).
 * `pick` chooses one sponsor for reg_step (one per step) and auction_lot (rotates by lot).
 * Look: always on white, full-colour logos, a small "presented by" label. Never competes with prices.
 */
export async function SponsorSlot({ placement, pick = 0 }: { placement: Placement; pick?: number }) {
  const list = await loadSponsors(placement);
  if (list.length === 0) return null;

  if (placement === "hero") {
    return (
      <section aria-label="Title sponsor" className="card flex w-full flex-col items-center gap-2 border-t-4 border-t-gold px-4 py-4">
        <p className="eyebrow">Presented by</p>
        <Logo sponsor={list[0]} className="h-16" />
      </section>
    );
  }

  if (placement === "auction_lot") {
    const sponsor = list[pick % list.length];
    return (
      <aside aria-label="Lot sponsor" className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-2">
        <span className="eyebrow">Lot presented by</span>
        <Logo sponsor={sponsor} className="h-9" />
      </aside>
    );
  }

  if (placement === "reg_step") {
    const sponsor = list[pick % list.length];
    return (
      <aside aria-label="Sponsor" className="flex items-center justify-between gap-3 rounded-md border border-line bg-paper px-4 py-2">
        <span className="eyebrow">Brought to you by</span>
        <Logo sponsor={sponsor} className="h-9" />
      </aside>
    );
  }

  return (
    <aside aria-label="Sponsors" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
      {list.map((s) => (
        <Logo key={s.id} sponsor={s} className="h-10" />
      ))}
    </aside>
  );
}
