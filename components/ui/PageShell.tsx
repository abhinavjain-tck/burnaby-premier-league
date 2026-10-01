import Link from "next/link";
import type { ReactNode } from "react";
import { countSponsors, SponsorSlot } from "@/components/sponsors/SponsorSlot";
import { cx } from "./cx";
import { LogoMark } from "./Logo";

type Width = "narrow" | "wide";
const WIDTH: Record<Width, string> = { narrow: "max-w-xl", wide: "max-w-6xl" };

/** Site header: brand on the left, Auction and Register on the right. */
export function SiteHeader({ current }: { current?: "home" | "register" | "auction" }) {
  return (
    <header className="bg-pitch text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-12 items-center gap-2 rounded-md focus-visible:outline-4 focus-visible:outline-gold" aria-label="BPL home">
          <LogoMark />
          <span className="leading-none">
            <span className="block font-display text-2xl font-extrabold tracking-wide">BPL</span>
            <span className="block text-xs font-semibold tracking-wider whitespace-nowrap text-white/85 uppercase">Season 4</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/auction"
            aria-current={current === "auction" ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-md px-3 font-bold text-white underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-gold aria-[current=page]:underline"
          >
            Auction
          </Link>
          {current !== "register" && (
            <Link href="/register" className="btn-accent min-h-11 px-3 text-base whitespace-nowrap">
              Register now
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Footer: sponsor band on white, then a small dark line. */
export async function SiteFooter({ sponsors = true }: { sponsors?: boolean }) {
  const show = sponsors && (await countSponsors("strip")) > 0;
  return (
    <footer className="mt-12">
      {show && (
        <div className="border-t-2 border-t-ink bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-5">
            <p className="eyebrow mb-3 text-center">Thanks to our sponsors</p>
            <SponsorSlot placement="strip" />
          </div>
        </div>
      )}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm">
          <p className="font-semibold">Burnaby Premier League · Season 4</p>
          <Link href="/admin" className="inline-flex min-h-11 items-center font-semibold text-white/90 underline underline-offset-4">
            League admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

/**
 * Standard public page: header, a centred <main>, footer with the sponsor band.
 * Phones first: 16px gutters, content up to 36rem (narrow) or 72rem (wide).
 */
export function PageShell({
  children,
  width = "narrow",
  current,
  sponsors = true,
  before,
  className,
}: {
  children: ReactNode;
  /** Full-width block between the header and <main> content, e.g. a hero. Rendered inside <main>. */
  before?: ReactNode;
  width?: Width;
  current?: "home" | "register" | "auction";
  sponsors?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader current={current} />
      <main id="main" className="flex-1">
        {before}
        <div className={cx("mx-auto w-full px-4 py-6", WIDTH[width], className)}>{children}</div>
      </main>
      <SiteFooter sponsors={sponsors} />
    </div>
  );
}
