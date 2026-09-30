import Image from "next/image";
import { cx } from "./cx";

type Size = "sm" | "md" | "lg" | "xl";
const BOX: Record<Size, { px: number; cls: string }> = {
  sm: { px: 48, cls: "size-12 text-lg rounded-md" },
  md: { px: 80, cls: "size-20 text-2xl rounded-lg" },
  lg: { px: 112, cls: "size-28 text-4xl rounded-lg" },
  xl: { px: 160, cls: "size-32 text-5xl rounded-xl sm:size-40" },
};

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** Square player photo. Falls back to big initials on a pitch-green tile. */
export function PlayerPhoto({ name, url, size = "md", alt = "", className }: { name: string; url: string | null | undefined; size?: Size; alt?: string; className?: string }) {
  const box = BOX[size];
  if (url) {
    return <Image src={url} alt={alt} width={box.px * 2} height={box.px * 2} unoptimized className={cx(box.cls, "shrink-0 bg-canvas object-cover", className)} />;
  }
  return (
    <div aria-hidden className={cx(box.cls, "grid shrink-0 place-items-center bg-pitch font-display font-extrabold text-white", className)}>
      {initials(name) || "?"}
    </div>
  );
}
