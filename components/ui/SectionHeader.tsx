import type { ReactNode } from "react";
import { cx } from "./cx";

/** Heading for a page section: optional eyebrow, a display-font title, optional right-side slot. */
export function SectionHeader({
  title,
  eyebrow,
  aside,
  id,
  as: Tag = "h2",
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  aside?: ReactNode;
  id?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const size = Tag === "h1" ? "text-4xl sm:text-5xl" : Tag === "h2" ? "text-3xl" : "text-2xl";
  return (
    <div className={cx("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <Tag id={id} className={cx("font-display leading-[0.95] font-extrabold uppercase", size)}>
          {title}
        </Tag>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
