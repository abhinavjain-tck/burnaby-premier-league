"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** `next` is the same-site path to land on after sign-in. */
export function GoogleSignInButton({ next = "/admin/registrations" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={signIn} disabled={busy} className="btn w-full">
        {busy ? "Opening Google…" : "Sign in with Google"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
