"use client";

import Image from "next/image";
import { useState } from "react";
import { createUploadUrl } from "@/app/register/actions";
import { compressImage, MAX_INPUT_BYTES } from "@/lib/image/compress";
import { createClient } from "@/lib/supabase/client";

type Props = {
  kind: "photo" | "proof";
  /** Hidden form field that receives the public URL (photo) or storage path (proof). */
  name: string;
  label: string;
  hint?: string;
  initialValue?: string | null;
  storageReady: boolean;
  onBusyChange?: (busy: boolean) => void;
  error?: string;
};

/** Compress in the browser, then upload straight to Supabase Storage with a signed URL. */
export function PhotoInput({ kind, name, label, hint, initialValue, storageReady, onBusyChange, error }: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const [preview, setPreview] = useState(kind === "photo" ? (initialValue ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  if (!storageReady) {
    return (
      <div>
        <p className="label">{label}</p>
        <p className="text-muted">Photo upload available once storage is set up.</p>
      </div>
    );
  }

  const setWorking = (on: boolean) => {
    setBusy(on);
    onBusyChange?.(on);
  };

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFailed(false);
    if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
      setFailed(true);
      setMessage("Pick an image under 20 MB.");
      return;
    }
    setWorking(true);
    try {
      setMessage("Shrinking…");
      const blob = await compressImage(file, kind === "photo" ? 1024 : 1600);
      const ticket = await createUploadUrl(kind, blob.type);
      if (!ticket.ok) throw new Error(ticket.error);
      setMessage("Uploading…");
      const { error: uploadError } = await createClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: blob.type });
      if (uploadError) throw new Error("Upload failed. Check your signal and try again.");
      setValue(ticket.value);
      if (kind === "photo") setPreview(URL.createObjectURL(blob));
      setMessage(kind === "photo" ? "Photo added. Save to keep it." : "Screenshot uploaded. Save to keep it.");
    } catch (err) {
      setFailed(true);
      setMessage(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setWorking(false);
    }
  }

  const inputId = `${name}-file`;
  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex items-center gap-4">
        {preview && (
          <Image src={preview} alt="" width={96} height={96} unoptimized className="h-24 w-24 rounded-lg border-2 border-ink object-cover" />
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={onChange}
          disabled={busy}
          className="block w-full text-base file:mr-3 file:min-h-12 file:rounded-lg file:border-2 file:border-ink file:bg-white file:px-4 file:font-bold"
        />
      </div>
      <input type="hidden" name={name} value={value} />
      <p aria-live="polite" className={failed ? "error" : "mt-1 text-sm text-muted"}>
        {message}
      </p>
      {error && !message && <p className="error">{error}</p>}
    </div>
  );
}
