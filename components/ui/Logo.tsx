import { cx } from "./cx";

/** BPL mark: a gold ball with a seam on a pitch-green tile. Decorative; pair it with text. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cx("size-10 shrink-0", className)}>
      <rect width="40" height="40" rx="10" fill="#07371f" />
      <circle cx="20" cy="20" r="12" fill="#f5b301" />
      <path d="M13 11.5c4 5 4 12 0 17M27 11.5c-4 5-4 12 0 17" fill="none" stroke="#0b1510" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.2 2.2" />
    </svg>
  );
}
