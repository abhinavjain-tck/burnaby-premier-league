import { cx } from "@/components/ui/cx";

/** Only real Instagram profile URLs. */
const safeInstagram = (url: string | null | undefined) => (url && /^https:\/\/(www\.)?instagram\.com\/[^/]+/.test(url) ? url : null);

/** "thecuratedknot" from https://www.instagram.com/thecuratedknot/ */
export const instagramHandle = (url: string) => new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";

const FOCUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold";

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5 flex-none">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Maroon "Follow @handle" button (white on #7D222F is about 11:1).
 * `link` is the quiet text version for tight spots, like the board lot strip.
 * Renders nothing unless the sponsor has an Instagram URL.
 */
export function FollowInstagram({
  url,
  variant = "button",
  className,
}: {
  url: string | null | undefined;
  variant?: "button" | "link";
  className?: string;
}) {
  const href = safeInstagram(url);
  if (!href) return null;
  const handle = instagramHandle(href);
  if (!handle) return null;
  const label = `Follow @${handle} on Instagram`;
  if (variant === "link") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={cx("inline-flex min-h-11 items-center rounded-md px-1 text-sm font-bold text-[#7D222F] underline underline-offset-[3px]", FOCUS, className)}
      >
        Follow
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#7D222F] bg-[#7D222F] px-4 text-base font-bold whitespace-nowrap text-white hover:border-[#5f1a24] hover:bg-[#5f1a24]",
        FOCUS,
        className,
      )}
    >
      <InstagramGlyph />
      <span>Follow @{handle}</span>
    </a>
  );
}
