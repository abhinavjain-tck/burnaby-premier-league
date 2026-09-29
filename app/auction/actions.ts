"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth/roles";
import { canOperate } from "@/lib/auction/access";
import { broadcast } from "@/lib/auction/broadcast";
import { liveOf } from "@/lib/auction/build";
import { isIdempotencyKey, parseCommand } from "@/lib/auction/command-schema";
import { AuctionRuleError, runCommand, VersionConflict } from "@/lib/auction/commands";
import { getSnapshot } from "@/lib/auction/snapshot";
import type { ClockMessage, CommandResponse, LiveSnapshot, Snapshot } from "@/lib/auction/types";
import { isDbConfigured } from "@/lib/config";

const isId = (id: unknown): id is string => z.uuid().safeParse(id).success;

/**
 * Public snapshot for the board: last 10 events, no emails.
 * "live" returns only the part that changes per event (what polling asks for).
 */
export async function fetchSnapshot(id: string, part: "full" | "live" = "full"): Promise<Snapshot | LiveSnapshot | null> {
  if (!isDbConfigured() || !isId(id)) return null;
  const snap = await getSnapshot(id, { events: 10 });
  return snap && part === "live" ? liveOf(snap) : snap;
}

/** Console snapshot: last 20 events with who did them. Auction admins and league admins only. */
export async function fetchConsoleSnapshot(id: string, part: "full" | "live" = "full"): Promise<Snapshot | LiveSnapshot | null> {
  if (!isDbConfigured() || !isId(id)) return null;
  if (!(await canOperate(await getViewer(), id))) return null;
  const snap = await getSnapshot(id, { events: 20, withActor: true });
  return snap && part === "live" ? liveOf(snap) : snap;
}

/** Run one console command. Never throws for expected failures; the console shows `message`. */
export async function sendCommand(
  id: string,
  command: unknown,
  meta: { expectedVersion: number; idempotencyKey: string },
): Promise<CommandResponse> {
  if (!isDbConfigured()) return { ok: false, code: "config", message: "Not configured yet: the database is not connected." };
  const viewer = await getViewer();
  if (!isId(id) || !viewer || !(await canOperate(viewer, id))) return { ok: false, code: "auth", message: "You're not an admin for this auction." };
  const cmd = parseCommand(command);
  if (!cmd || !Number.isInteger(meta?.expectedVersion) || !isIdempotencyKey(meta?.idempotencyKey)) {
    return { ok: false, code: "invalid", message: "That command didn't make sense. Refresh and try again." };
  }
  try {
    const result = await runCommand(id, cmd, { ...meta, actorEmail: viewer.email, snapshot: { events: 20, withActor: true } });
    return { ok: true, snapshot: result.snapshot, duplicate: result.duplicate };
  } catch (err) {
    if (err instanceof VersionConflict) {
      return { ok: false, code: "conflict", message: "Board changed, refreshed", snapshot: await getSnapshot(id, { events: 20, withActor: true }) };
    }
    if (err instanceof AuctionRuleError) return { ok: false, code: "rule", message: err.message };
    throw err;
  }
}

/** Show a 10-second "going once" countdown on every phone. Not saved anywhere. */
export async function startClock(id: string, seconds = 10): Promise<{ ok: boolean; clock?: ClockMessage }> {
  if (!isDbConfigured() || !isId(id)) return { ok: false };
  if (!(await canOperate(await getViewer(), id))) return { ok: false };
  const secs = Math.min(30, Math.max(3, Math.round(seconds)));
  const clock: ClockMessage = { type: "CLOCK", endsAt: Date.now() + secs * 1000, seconds: secs };
  await broadcast(id, "clock", clock);
  return { ok: true, clock };
}
