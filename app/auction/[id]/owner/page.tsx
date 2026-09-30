import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OwnerView } from "@/components/auction/OwnerView";
import { SignInGate } from "@/components/auction/SignInGate";
import { NotConfigured } from "@/components/NotConfigured";
import { PageShell } from "@/components/ui/PageShell";
import { getViewer } from "@/lib/auth/roles";
import { ownedTeamIds } from "@/lib/auction/access";
import { getPublicSnapshot } from "@/lib/auction/snapshot";
import { isDbConfigured, isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "Owner view", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Read-only team view. Owners see their own team (live auctions); league admins can pick any team. */
export default async function OwnerPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const viewer = await getViewer();
  if (!isDbConfigured() || !isSupabaseConfigured()) {
    return (
      <PageShell current="auction">
        <NotConfigured>The owner view works once the database and Supabase sign-in are connected.</NotConfigured>
      </PageShell>
    );
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const next = `/auction/${id}/owner`;
  if (!viewer) return <SignInGate next={next} why="Team owners: sign in with the Google account the league has on file." />;

  const snap = await getPublicSnapshot(id);
  if (!snap) notFound();
  const allowed = viewer.role ? snap.teams.map((t) => t.id) : await ownedTeamIds(viewer, id);
  if (allowed.length === 0) return <SignInGate next={next} email={viewer.email} why="This page is for team owners." />;

  const wanted = typeof query.team === "string" ? query.team : "";
  const teamId = allowed.includes(wanted) ? wanted : allowed[0];
  return (
    <PageShell current="auction" className="space-y-4 py-4">
      {allowed.length > 1 && (
        <nav aria-label="Pick a team" className="flex flex-wrap gap-2">
          {snap.teams
            .filter((t) => allowed.includes(t.id))
            .map((t) => (
              <Link
                key={t.id}
                href={`${next}?team=${t.id}`}
                aria-current={t.id === teamId ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-display text-lg font-extrabold uppercase ${t.id === teamId ? "border-ink bg-ink text-white" : "border-edge bg-paper text-ink hover:border-ink"}`}
              >
                {t.short}
              </Link>
            ))}
        </nav>
      )}
      <OwnerView key={teamId} initial={snap} teamId={teamId} />
    </PageShell>
  );
}
