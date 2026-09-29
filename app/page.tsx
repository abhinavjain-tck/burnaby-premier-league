import Link from "next/link";
import { NotConfigured } from "@/components/NotConfigured";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";
import { isDbConfigured } from "@/lib/config";

// Static and cached; sponsors refresh every minute.
export const revalidate = 60;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6">
      {!isDbConfigured() && <NotConfigured>Sponsors show up here once the database is connected.</NotConfigured>}

      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <p className="font-bold tracking-wide text-brand uppercase">Burnaby Premier League</p>
        <h1 className="text-5xl font-black">BPL Season 4</h1>
        <p className="text-xl">
          Player auction <strong className="block text-2xl">Sunday 4 Oct 2026</strong>
        </p>
        <SponsorSlot placement="hero" />
        <Link href="/register" className="btn w-full max-w-xs text-xl">
          Register
        </Link>
        <p className="text-muted">No account needed. Takes 3 minutes.</p>
      </section>

      <footer>
        <SponsorSlot placement="strip" />
      </footer>
    </main>
  );
}
