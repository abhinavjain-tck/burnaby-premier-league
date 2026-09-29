"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/roles";
import * as admin from "@/lib/auction/admin";
import { isIdempotencyKey, parseCommand } from "@/lib/auction/command-schema";
import { AuctionRuleError, runCommand, VersionConflict } from "@/lib/auction/commands";
import { parseConfigJson } from "@/lib/auction/config";
import type { FormResult } from "@/lib/auction/form";
import { crore, fmt } from "@/lib/money";

const Id = z.uuid();

/** Run an admin step and turn expected failures into a message for the form. */
async function attempt(id: string, work: () => Promise<string>): Promise<FormResult> {
  await requireAdmin();
  if (!Id.safeParse(id).success) return { ok: false, message: "Unknown auction." };
  try {
    const message = await work();
    revalidatePath(`/admin/auctions/${id}`);
    revalidatePath("/admin/auctions");
    return { ok: true, message };
  } catch (err) {
    if (err instanceof admin.AdminError || err instanceof AuctionRuleError) return { ok: false, message: err.message };
    if (err instanceof VersionConflict) {
      revalidatePath(`/admin/auctions/${id}`);
      return { ok: false, message: "Board changed, refreshed. Check and try again." };
    }
    throw err;
  }
}

const NewAuction = z.object({
  name: z.string().trim().min(2, "Give it a name").max(80),
  mode: z.enum(["test", "live"]),
  purseCr: z.coerce.number().positive("Purse must be more than 0").max(100000),
  config: z.string().max(10_000),
});

export async function createAuction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const parsed = NewAuction.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const config = parseConfigJson(parsed.data.config || "{}");
  if (!config.ok) return { ok: false, message: config.error };
  let id: string;
  try {
    id = await admin.createAuction({
      name: parsed.data.name,
      mode: parsed.data.mode,
      config: { ...config.config, purseLakhs: crore(parsed.data.purseCr) },
    });
  } catch (err) {
    if (err instanceof admin.AdminError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath("/admin/auctions");
  redirect(`/admin/auctions/${id}`);
}

export async function addConfirmedPlayers(id: string): Promise<FormResult> {
  return attempt(id, async () => {
    const n = await admin.addConfirmedPlayers(id);
    return n === 0 ? "No new confirmed players to add." : `Added ${n} confirmed players.`;
  });
}

export async function addFakePlayers(id: string): Promise<FormResult> {
  return attempt(id, async () => `Added ${await admin.addFakePlayers(id, 48)} test players.`);
}

export async function shuffleSets(id: string): Promise<FormResult> {
  return attempt(id, async () => {
    await admin.shuffleSets(id);
    return "Shuffled inside each set.";
  });
}

export async function clearTestLots(id: string): Promise<FormResult> {
  return attempt(id, async () => {
    await admin.clearTestLots(id);
    return "All lots removed.";
  });
}

export async function addAuctionAdmin(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  return attempt(id, async () => {
    const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
    if (!email.success) throw new admin.AdminError("Enter a valid email.");
    await admin.addAuctionAdmin(id, email.data);
    return "Added. They sign in with Google to use the console.";
  });
}

export async function removeAuctionAdmin(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  return attempt(id, async () => {
    await admin.removeAuctionAdmin(id, String(formData.get("email") ?? ""));
    return "Removed.";
  });
}

export async function rotateShareToken(id: string): Promise<FormResult> {
  return attempt(id, async () => {
    await admin.rotateShareToken(id);
    return "New link made. The old one no longer works.";
  });
}

export async function promoteToLive(id: string): Promise<FormResult> {
  return attempt(id, async () => {
    const { matched } = await admin.promoteToLive(id);
    return `Copied to the live auction. ${matched} players matched by registration.`;
  });
}

/** Open / Pause / Resume / Complete / Pre-sell from the admin page. Goes through the same command path as the console. */
export async function adminCommand(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const viewer = await requireAdmin();
  return attempt(id, async () => {
    const type = String(formData.get("type") ?? "");
    const amountCr = String(formData.get("amountCr") ?? "").trim() || null;
    const cmd = parseCommand({
      type,
      ...(formData.get("lotId") ? { lotId: String(formData.get("lotId")) } : {}),
      ...(formData.get("teamId") ? { teamId: String(formData.get("teamId")) } : {}),
      ...(amountCr !== null ? { amount: crore(Number(amountCr)) } : {}),
    });
    const expectedVersion = Number(formData.get("version"));
    const idempotencyKey = String(formData.get("key") ?? "");
    if (!cmd || !Number.isInteger(expectedVersion) || !isIdempotencyKey(idempotencyKey)) throw new admin.AdminError("Fill in every field.");
    const res = await runCommand(id, cmd, { expectedVersion, idempotencyKey, actorEmail: viewer.email });
    if (res.duplicate) return "Already done.";
    if (cmd.type === "PRESOLD") return `Pre-sold for ${fmt(cmd.amount)}.`;
    return "Done.";
  });
}
