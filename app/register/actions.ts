"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { isDbConfigured, isStorageConfigured } from "@/lib/config";
import { getDb, isUniqueViolation } from "@/lib/db/client";
import { playerRegistrations } from "@/lib/db/schema";
import { editPath } from "@/lib/registration/messages";
import { getActiveSeason } from "@/lib/registration/queries";
import { isEditToken, newEditToken } from "@/lib/registration/token";
import { parseRegistration, type SaveState } from "@/lib/registration/validate";
import { createServiceClient } from "@/lib/supabase/server";

/** Public URL prefix of the photos bucket. Registrations may only point here. */
function photoPrefix(): string | null {
  if (!isStorageConfigured()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/photos/`;
}

/**
 * Register (no token) or edit (hidden `token` field) a player.
 * New registrations redirect to the private edit page.
 */
export async function saveRegistration(_prev: SaveState, formData: FormData): Promise<SaveState> {
  if (!isDbConfigured()) {
    return { status: "error", message: "Not configured yet: registration opens once the database is connected." };
  }
  const parsed = parseRegistration(formData, photoPrefix());
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const { paymentProofPath, ...fields } = parsed.data;
  // payment_proof_url holds the storage path. Only overwrite it when a new screenshot came in.
  const values = paymentProofPath ? { ...fields, paymentProofUrl: paymentProofPath } : fields;
  const db = getDb();
  const token = formData.get("token");

  if (typeof token === "string" && token !== "") {
    if (!isEditToken(token)) return { status: "error", message: "This edit link is not valid." };
    try {
      const updated = await db
        .update(playerRegistrations)
        .set(values)
        .where(eq(playerRegistrations.editToken, token))
        .returning({ id: playerRegistrations.id });
      if (updated.length === 0) return { status: "error", message: "We couldn't find your registration. Check your link." };
    } catch (err) {
      if (isUniqueViolation(err)) return { status: "duplicate" }; // changed phone to one already registered
      throw err;
    }
    revalidatePath(editPath(token));
    return { status: "saved" };
  }

  const season = await getActiveSeason();
  if (!season) return { status: "error", message: "Registration is closed." };

  const [existing] = await db
    .select({ id: playerRegistrations.id })
    .from(playerRegistrations)
    .where(and(eq(playerRegistrations.seasonId, season.id), eq(playerRegistrations.phone, fields.phone)))
    .limit(1);
  if (existing) return { status: "duplicate" };

  const editToken = newEditToken();
  try {
    await db.insert(playerRegistrations).values({ ...values, seasonId: season.id, editToken });
  } catch (err) {
    if (isUniqueViolation(err)) return { status: "duplicate" }; // two submits raced
    throw err;
  }
  redirect(`${editPath(editToken)}?new=1`);
}

export type UploadTicket =
  | { ok: true; bucket: string; path: string; token: string; value: string }
  | { ok: false; error: string };

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/**
 * Signed upload URL for a player photo (public bucket) or payment screenshot (private bucket).
 * `value` is what the form stores: the public URL for photos, the path for payment proofs.
 */
export async function createUploadUrl(kind: "photo" | "proof", contentType: string): Promise<UploadTicket> {
  if (!isStorageConfigured()) return { ok: false, error: "Photo upload available once storage is set up." };
  if (kind !== "photo" && kind !== "proof") return { ok: false, error: "Unknown upload type." };
  const ext = EXTENSIONS[contentType];
  if (!ext) return { ok: false, error: "Use a JPG, PNG or WebP image." };

  const bucket = kind === "photo" ? "photos" : "payment-proofs";
  const { data, error } = await createServiceClient().storage.from(bucket).createSignedUploadUrl(`${randomUUID()}.${ext}`);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", error);
    return { ok: false, error: "Upload isn't working right now. Try again in a minute." };
  }
  return {
    ok: true,
    bucket,
    path: data.path,
    token: data.token,
    value: kind === "photo" ? `${photoPrefix()}${data.path}` : data.path,
  };
}
