/**
 * All amounts in the ledger are integer lakhs.
 * 1 crore = 100 lakh. 300 cr purse = 30_000 L. No decimals anywhere in the DB.
 */
export const LAKH_PER_CRORE = 100;

export const crore = (n: number): number => Math.round(n * LAKH_PER_CRORE);

/** 1250 → "12.5 cr", 50 → "50 L", 30000 → "300 cr" */
export function fmt(lakhs: number): string {
  if (lakhs < LAKH_PER_CRORE) return `${lakhs} L`;
  const cr = lakhs / LAKH_PER_CRORE;
  return `${Number.isInteger(cr) ? cr : cr.toFixed(cr * 10 % 1 === 0 ? 1 : 2)} cr`;
}

/** Bid increment ladder (in lakhs). Edit in seasons.config later; this is the default. */
export const LADDER: Array<{ upTo: number; step: number }> = [
  { upTo: crore(10), step: 50 },
  { upTo: crore(50), step: crore(1) },
  { upTo: crore(100), step: crore(2.5) },
  { upTo: Infinity, step: crore(5) },
];

export function stepFor(current: number): number {
  for (const rung of LADDER) if (current < rung.upTo) return rung.step;
  return LADDER[LADDER.length - 1].step;
}

/** IPL-style squad guard: leave enough purse to fill the minimum squad at the lowest base. */
export function maxBid(purseLeft: number, squadSize: number, minSquad: number, lowestBase: number): number {
  const slotsAfterThis = Math.max(0, minSquad - squadSize - 1);
  return Math.max(0, purseLeft - slotsAfterThis * lowestBase);
}
