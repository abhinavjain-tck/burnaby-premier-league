import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { LogoMark } from "@/components/ui/Logo";
import { getViewer } from "@/lib/auth/roles";
import { AdminNav } from "./AdminNav";

/** Header and tabs. Reads the viewer itself (cached per request) so only super admins see the Admins tab. */
export async function AdminBar({ email }: { email: string }) {
  const viewer = await getViewer();
  return (
    <header className="bg-pitch text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-2">
        <Link href="/admin/registrations" className="flex min-h-12 items-center gap-2 rounded-md focus-visible:outline-4 focus-visible:outline-gold">
          <LogoMark className="size-9" />
          <span className="font-display text-2xl font-extrabold uppercase">BPL admin</span>
        </Link>
        <form action={signOut} className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden truncate text-white/85 sm:inline">{email}</span>
          <button
            type="submit"
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-white/40 px-3 font-bold hover:bg-white/10 focus-visible:outline-4 focus-visible:outline-gold"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        </form>
      </div>
      <div className="mx-auto max-w-5xl px-2">
        <AdminNav showAdmins={viewer?.role === "super_admin"} />
      </div>
    </header>
  );
}
