import { asc, sql } from "drizzle-orm";
import Image from "next/image";
import { cache } from "react";
import { cx } from "@/components/ui/cx";
import { isDbConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { sponsors } from "@/lib/db/schema";
import { FollowInstagram } from "./FollowInstagram";

type Placement = "hero" | "strip" | "reg_step" | "auction_lot";
type Sponsor = {
  id: string;
  name: string;
  tier: string;
  logoUrl: string | null;
  url: string | null;
  instagramUrl: string | null;
  tagline: string | null;
};

/** Cached per request, so several slots on one page share one query. */
const loadSponsors = cache(async (placement: Placement): Promise<Sponsor[]> => {
  if (!isDbConfigured()) return [];
  try {
    return await getDb()
      .select({
        id: sponsors.id,
        name: sponsors.name,
        tier: sponsors.tier,
        logoUrl: sponsors.logoUrl,
        url: sponsors.url,
        instagramUrl: sponsors.instagramUrl,
        tagline: sponsors.tagline,
      })
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

const LINK_FOCUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Title sponsors get their brand maroon; others use plain ink. */
const nameTone = (s: Sponsor) => (s.tier === "title" ? "text-tck" : "text-ink");

/** Local files (/sponsors/x.png) go through next/image; remote logos stay as they are. */
const isLocal = (src: string) => src.startsWith("/");

function Logo({ sponsor, className }: { sponsor: Sponsor; className: string }) {
  const body = sponsor.logoUrl ? (
    <Image
      src={sponsor.logoUrl}
      alt={sponsor.name}
      width={320}
      height={128}
      unoptimized={!isLocal(sponsor.logoUrl)}
      className={`${className} w-auto max-w-[12rem] object-contain`}
    />
  ) : (
    <span className="font-display text-2xl leading-tight font-extrabold text-ink uppercase">{sponsor.name}</span>
  );
  const href = safeHref(sponsor.url);
  return href ? (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={cx("inline-flex min-h-11 items-center rounded-md", LINK_FOCUS)}>
      {body}
    </a>
  ) : (
    body
  );
}

/** Square logo (500x500 with padding) that overlaps its row so the mark reads big without a tall row. */
function Mark({ sponsor, size, className }: { sponsor: Sponsor; size: number; className?: string }) {
  if (!sponsor.logoUrl) return null;
  return (
    <Image
      src={sponsor.logoUrl}
      alt=""
      width={size}
      height={size}
      unoptimized={!isLocal(sponsor.logoUrl)}
      className={cx("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Logo plus name as one link to the sponsor site (plain text when there is no URL). */
function MarkAndName({
  sponsor,
  size,
  markClass,
  nameClass,
  className,
}: {
  sponsor: Sponsor;
  size: number;
  markClass?: string;
  nameClass: string;
  className?: string;
}) {
  const href = safeHref(sponsor.url);
  const inner = (
    <>
      <Mark sponsor={sponsor} size={size} className={markClass} />
      <span className={cx("wordmark", nameTone(sponsor), nameClass)}>{sponsor.name}</span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={cx("inline-flex min-h-11 items-center rounded-md", LINK_FOCUS, className)}>
      {inner}
    </a>
  ) : (
    <span className={cx("inline-flex min-h-11 items-center", className)}>{inner}</span>
  );
}

/**
 * Renders sponsors for one placement key from the sponsors table.
 * Renders nothing when there are none (or the DB is not set up).
 * `pick` chooses one sponsor for reg_step (one per step) and auction_lot (rotates by lot).
 * Look: always on white (cream in the lot strip), full-colour logos, a small "presented by" label.
 * Never competes with prices.
 */
export async function SponsorSlot({ placement, pick = 0 }: { placement: Placement; pick?: number }) {
  const list = await loadSponsors(placement);
  if (list.length === 0) return null;

  if (placement === "hero") {
    const s = list.find((x) => x.tier === "title") ?? list[0];
    if (s.tier !== "title") {
      return (
        <section aria-label="Sponsor" className="card flex w-full flex-col items-center gap-2 border-t-4 border-t-gold px-4 py-4">
          <p className="eyebrow">Presented by</p>
          <Logo sponsor={s} className="h-16" />
        </section>
      );
    }
    const href = safeHref(s.url);
    const mark = <Mark sponsor={s} size={128} className="-my-3.5" />;
    return (
      <section aria-label="Title sponsor" className="card flex w-full flex-col items-center border-t-4 border-t-gold px-4 py-4 text-center">
        <p className="eyebrow">Presented by</p>
        {href ? (
          <a href={href} target="_blank" rel="sponsored noopener noreferrer" aria-label={s.name} className={cx("rounded-md", LINK_FOCUS)}>
            {mark}
          </a>
        ) : (
          mark
        )}
        {href ? (
          <a href={href} target="_blank" rel="sponsored noopener noreferrer" className={cx("wordmark mt-0.5 rounded-md pl-[0.18em] text-[15px] leading-tight", nameTone(s), LINK_FOCUS)}>
            {s.name}
          </a>
        ) : (
          <p className={cx("wordmark mt-0.5 pl-[0.18em] text-[15px] leading-tight", nameTone(s))}>{s.name}</p>
        )}
        {s.tagline && <p className="mt-1.5 mb-3.5 text-base text-muted">{s.tagline}</p>}
        <FollowInstagram url={s.instagramUrl} className="w-full sm:w-auto" />
      </section>
    );
  }

  if (placement === "auction_lot") {
    const s = list[pick % list.length];
    return (
      <aside aria-label="Lot sponsor" className="flex min-h-11 items-center gap-1.5 border-t border-line bg-tck-cream px-2.5 py-1.5 whitespace-nowrap sm:gap-2 sm:px-3">
        <span className="eyebrow text-[10px] tracking-[0.04em] sm:text-[11px] sm:tracking-wider">Presented by</span>
        <MarkAndName
          sponsor={s}
          size={48}
          markClass="-mx-1 -my-2.5 size-[42px]! sm:size-12!"
          nameClass="text-[10px] tracking-[0.05em] sm:text-[10.5px] sm:tracking-[0.1em]"
          className="min-w-0 gap-2"
        />
        <span className="flex-1" />
        <FollowInstagram url={s.instagramUrl} variant="link" />
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
    <aside aria-label="Sponsors" className="flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
      {list.map((s) => (
        <div key={s.id} className="flex flex-col items-center gap-3">
          {s.logoUrl && s.tier === "title" ? (
            <MarkAndName sponsor={s} size={76} markClass="-my-[18px]" nameClass="text-sm" className="flex-wrap justify-center gap-3" />
          ) : (
            <Logo sponsor={s} className="h-10" />
          )}
          <FollowInstagram url={s.instagramUrl} className="min-h-11 px-3.5 text-[15px]" />
        </div>
      ))}
    </aside>
  );
}
