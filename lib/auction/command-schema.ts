/** Shape check for commands coming off a phone. Rules are checked later, against state. */
import { z } from "zod";
import type { Command } from "./types";

const id = z.uuid();
const lakhs = z.number().int().nonnegative().max(10_000_000);
const text = z.string().trim().max(500);

export const CommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("START") }),
  z.object({ type: z.literal("PAUSE") }),
  z.object({ type: z.literal("RESUME") }),
  z.object({ type: z.literal("COMPLETE") }),
  z.object({ type: z.literal("PRESOLD"), lotId: id, teamId: id, amount: lakhs }),
  z.object({ type: z.literal("START_LOT"), lotId: id }),
  z.object({ type: z.literal("BID"), lotId: id, teamId: id, amount: lakhs }),
  z.object({ type: z.literal("SOLD"), lotId: id, teamId: id, amount: lakhs }),
  z.object({ type: z.literal("UNSOLD"), lotId: id }),
  z.object({ type: z.literal("SKIP"), lotId: id }),
  z.object({ type: z.literal("REQUEUE"), lotId: id, base: lakhs.optional() }),
  z.object({ type: z.literal("ADJUST_PURSE"), teamId: id, delta: z.number().int().min(-10_000_000).max(10_000_000), note: text }),
  z.object({ type: z.literal("NOTE"), text }),
  z.object({ type: z.literal("UNDO") }),
  z.object({ type: z.literal("REDO") }),
]);

export const parseCommand = (raw: unknown): Command | null => {
  const parsed = CommandSchema.safeParse(raw);
  return parsed.success ? (parsed.data as Command) : null;
};

/** Client-made idempotency keys are UUIDs; accept any short token-ish string. */
export const isIdempotencyKey = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v);
