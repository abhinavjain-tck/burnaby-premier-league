import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

type CardProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  /** Right side of the title row: a count, a link, a chip. */
  aside?: ReactNode;
  /** Colour strip along the top (team colour, sponsor, etc.). */
  accent?: string;
  pad?: boolean;
};

/** White panel with a thin border and soft shadow. The basic building block. */
export function Card({ title, aside, accent, pad = true, className, children, style, ...rest }: CardProps) {
  return (
    <section
      className={cx("card overflow-hidden", accent && "border-t-[6px]", className)}
      style={accent ? { borderTopColor: accent, ...style } : style}
      {...rest}
    >
      {title && (
        <header className={cx("flex items-center justify-between gap-3", pad ? "px-4 pt-4" : "px-4 py-3")}>
          <h2 className="font-display text-2xl leading-tight font-bold uppercase">{title}</h2>
          {aside}
        </header>
      )}
      <div className={cx(pad && "p-4", pad && Boolean(title) && "pt-3")}>{children}</div>
    </section>
  );
}
