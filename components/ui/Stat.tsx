import type { ReactNode } from "react";
import { cx } from "./cx";

type Size = "md" | "lg" | "xl";
const VALUE: Record<Size, string> = {
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

/** Big number with a small label above. Use inside a <dl>. Numbers are tabular so they don't jump. */
export function Stat({ label, value, sub, size = "md", className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; size?: Size; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="eyebrow truncate">{label}</dt>
      <dd className={cx("num font-display leading-none font-extrabold text-ink", VALUE[size])}>{value}</dd>
      {sub && <dd className="mt-1 text-sm font-semibold text-muted">{sub}</dd>}
    </div>
  );
}
