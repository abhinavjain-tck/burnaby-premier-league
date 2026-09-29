/** Black or white text, whichever reads better on a team colour (WCAG relative luminance). */
export function textOn(hex: string): "#ffffff" | "#0a0a0a" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // Contrast with white is (1.05)/(l+0.05); with near-black roughly (l+0.05)/0.053. Pick the larger.
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.053 ? "#ffffff" : "#0a0a0a";
}

/** Only accept #rrggbb from config and forms, so nothing odd lands in a style attribute. */
export const safeColour = (hex: string | null | undefined, fallback = "#0a0a0a"): string =>
  hex && /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : fallback;
