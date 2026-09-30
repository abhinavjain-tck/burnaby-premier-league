"use client";

import { useState } from "react";
import { removeAdmin } from "@/app/admin/admins/actions";
import { ActionForm } from "./ActionForm";

/** Remove needs a second tap: "Remove" turns into "Yes, remove" and "Keep". */
export function RemoveAdminForm({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <ActionForm action={removeAdmin}>
      <input type="hidden" name="email" value={email} />
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-danger">
            Yes, remove
          </button>
          <button type="button" className="btn-outline" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </div>
      ) : (
        <button type="button" className="btn-outline" aria-label={`Remove ${email}`} onClick={() => setConfirming(true)}>
          Remove
        </button>
      )}
    </ActionForm>
  );
}
