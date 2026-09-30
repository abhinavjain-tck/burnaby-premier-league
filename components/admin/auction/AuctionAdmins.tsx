import { addAuctionAdmin, removeAuctionAdmin } from "@/app/admin/auctions/actions";
import { ActionForm } from "@/components/admin/ActionForm";

/** Who may run the console for this auction, besides league admins. */
export function AuctionAdmins({ auctionId, emails }: { auctionId: string; emails: string[] }) {
  return (
    <div className="space-y-3">
      {emails.length === 0 ? (
        <p className="text-muted">Only league admins so far.</p>
      ) : (
        <ul className="divide-y divide-line">
          {emails.map((email) => (
            <li key={email} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 break-all">{email}</span>
              <ActionForm action={removeAuctionAdmin.bind(null, auctionId)}>
                <input type="hidden" name="email" value={email} />
                <button type="submit" className="inline-flex min-h-11 cursor-pointer items-center font-bold text-ball underline underline-offset-4">
                  Remove
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addAuctionAdmin.bind(null, auctionId)}>
        <label className="label" htmlFor="admin-email">
          Add by email
        </label>
        <div className="flex gap-2">
          <input id="admin-email" name="email" type="email" className="field" placeholder="operator@gmail.com" required />
          <button type="submit" className="btn-outline shrink-0">
            Add
          </button>
        </div>
      </ActionForm>
    </div>
  );
}
