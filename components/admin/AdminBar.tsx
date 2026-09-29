import Link from "next/link";
import { signOut } from "@/app/admin/actions";

export function AdminBar({ email }: { email: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
      <Link href="/admin/registrations" className="text-lg font-black">
        BPL admin
      </Link>
      <form action={signOut} className="flex items-center gap-3 text-sm">
        <span className="text-muted">{email}</span>
        <button type="submit" className="font-bold underline">
          Sign out
        </button>
      </form>
    </header>
  );
}
