"use client";

import { createAuction } from "@/app/admin/auctions/actions";
import { ActionForm } from "./ActionForm";

/** New auction: name, test or live, purse, and the rules as JSON (defaults filled in). */
export function NewAuctionForm({ defaultConfig }: { defaultConfig: string }) {
  return (
    <ActionForm action={createAuction}>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" className="field" required placeholder="Rehearsal 1" />
      </div>
      <fieldset>
        <legend className="label">Mode</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="choice">
            <input type="radio" name="mode" value="test" defaultChecked /> Test (fake teams, private link)
          </label>
          <label className="choice">
            <input type="radio" name="mode" value="live" /> Live (real teams, one per season)
          </label>
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="purseCr">
          Purse per team (crores)
        </label>
        <input id="purseCr" name="purseCr" className="field" inputMode="decimal" defaultValue="300" required />
      </div>
      <div>
        <label className="label" htmlFor="config">
          Rules (JSON, amounts in lakhs; purse comes from the field above)
        </label>
        <textarea id="config" name="config" className="field font-mono text-sm" rows={14} defaultValue={defaultConfig} spellCheck={false} />
      </div>
      <button type="submit" className="btn w-full">
        Create auction
      </button>
    </ActionForm>
  );
}
