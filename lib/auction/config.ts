/**
 * Auction rules as numbers. Stored in auctions.config (jsonb), with seasons.config
 * and then these defaults filling any gaps. All money is integer lakhs.
 * Shared by server and phones: no server imports here.
 */
import { z } from "zod";
import { LADDER, maxBid, stepFor, type Rung } from "../money";

export const TIER_KEYS = ["M", "A", "B", "C"] as const;
export type Tier = (typeof TIER_KEYS)[number];

/** JSON has no Infinity, so the last rung stores upTo: null. */
export type LadderRung = { upTo: number | null; step: number };

export interface AuctionConfig {
  purseLakhs: number;
  minSquad: number;
  maxSquad: number;
  basePrices: Record<Tier, number>;
  ladder: LadderRung[];
  ownerPresoldLakhs: number;
  /** Base for a requeued (accelerated round) lot = original base × this. 1 or 0.5. */
  unsoldBaseMultiplier: number;
}

export const DEFAULT_CONFIG: AuctionConfig = {
  purseLakhs: 30000,
  minSquad: 11,
  maxSquad: 13,
  basePrices: { M: 2000, A: 1000, B: 500, C: 200 },
  ladder: LADDER.map((r) => ({ upTo: Number.isFinite(r.upTo) ? r.upTo : null, step: r.step })),
  ownerPresoldLakhs: 2500,
  unsoldBaseMultiplier: 1,
};

const lakhs = z.number().int().nonnegative();
const positiveLakhs = z.number().int().positive();
const squad = z.number().int().min(1).max(30);

const ladderSchema = z
  .array(z.object({ upTo: positiveLakhs.nullable(), step: positiveLakhs }))
  .min(1)
  .refine((rungs) => rungs[rungs.length - 1].upTo === null, "The last rung needs upTo: null (no upper limit)")
  .refine(
    (rungs) => rungs.slice(0, -1).every((r, i) => r.upTo !== null && (i === 0 || r.upTo > (rungs[i - 1].upTo ?? 0))),
    "Rungs must go up in order",
  );

const fields = {
  purseLakhs: positiveLakhs,
  minSquad: squad,
  maxSquad: squad,
  basePrices: z.object({ M: positiveLakhs, A: positiveLakhs, B: positiveLakhs, C: positiveLakhs }),
  ladder: ladderSchema,
  ownerPresoldLakhs: lakhs,
  unsoldBaseMultiplier: z.number().positive().max(1),
};

const schema = z
  .object(fields)
  .refine((c) => c.minSquad <= c.maxSquad, { message: "minSquad can't be more than maxSquad", path: ["minSquad"] });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Keep only the valid keys of one layer, so one bad value never breaks the rest. */
function layer(raw: unknown): Partial<AuctionConfig> {
  if (!isObject(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!(key in raw) || key === "basePrices") continue;
    const parsed = field.safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
  }
  const prices = raw.basePrices;
  if (isObject(prices)) {
    const valid = TIER_KEYS.filter((t) => positiveLakhs.safeParse(prices[t]).success);
    if (valid.length) out.basePrices = Object.fromEntries(valid.map((t) => [t, prices[t]]));
  }
  return out as Partial<AuctionConfig>;
}

function merge(base: AuctionConfig, over: Partial<AuctionConfig>): AuctionConfig {
  return { ...base, ...over, basePrices: { ...base.basePrices, ...over.basePrices } };
}

/**
 * The config an auction runs with: defaults ← seasons.config ← auctions.config.
 * Bad or missing values fall back instead of throwing: the board must always render.
 */
export function resolveConfig(auctionConfig: unknown, seasonConfig?: unknown): AuctionConfig {
  const merged = merge(merge(DEFAULT_CONFIG, layer(seasonConfig)), layer(auctionConfig));
  return merged.minSquad <= merged.maxSquad ? merged : { ...merged, minSquad: DEFAULT_CONFIG.minSquad, maxSquad: DEFAULT_CONFIG.maxSquad };
}

/** Strict check for the admin JSON editor. Missing keys take defaults; wrong ones are errors. */
export function parseConfigJson(text: string): { ok: true; config: AuctionConfig } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Config is not valid JSON." };
  }
  if (!isObject(raw)) return { ok: false, error: "Config must be a JSON object." };
  const candidate = merge(DEFAULT_CONFIG, raw as Partial<AuctionConfig>);
  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join(".") || "config"}: ${issue.message}` };
  }
  return { ok: true, config: parsed.data };
}

/** Ladder in lib/money's shape (Infinity for the open-ended rung). */
export const ladderOf = (config: AuctionConfig): Rung[] =>
  config.ladder.map((r) => ({ upTo: r.upTo ?? Infinity, step: r.step }));

/** Minimum raise at this price under this auction's ladder. */
export const stepAt = (config: AuctionConfig, current: number): number => stepFor(current, ladderOf(config));

/** Cheapest base price: what the squad guard keeps back for each empty slot. */
export const lowestBase = (config: AuctionConfig): number => Math.min(...TIER_KEYS.map((t) => config.basePrices[t]));

/** IPL squad guard for one team under this config. */
export const maxBidFor = (config: AuctionConfig, team: { purseLeft: number; squadSize: number }): number =>
  maxBid(team.purseLeft, team.squadSize, config.minSquad, lowestBase(config));

/** Base price for a tier; players with no tier yet start at the lowest tier. */
export const baseForTier = (config: AuctionConfig, tier: string | null | undefined): number =>
  config.basePrices[(TIER_KEYS as readonly string[]).includes(tier ?? "") ? (tier as Tier) : "C"];

/** Base for a requeued lot: original base × multiplier, rounded to the ladder step at that price. */
export function requeueBase(config: AuctionConfig, originalBase: number): number {
  const raw = Math.round(originalBase * config.unsoldBaseMultiplier);
  const step = stepAt(config, raw);
  return Math.max(step, Math.round(raw / step) * step);
}
