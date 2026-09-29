import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Console } from "@/components/auction/console/Console";
import { SignInGate } from "@/components/auction/SignInGate";
import { NotConfigured } from "@/components/NotConfigured";
import { getViewer } from "@/lib/auth/roles";
import { canOperate } from "@/lib/auction/access";
import { testBoardPath } from "@/lib/auction/share";
import { getSnapshot } from "@/lib/auction/snapshot";
import { findAuction } from "@/lib/auction/queries";
import { isDbConfigured, isSupabaseConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Console", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** Operator's phone. Auction admins for this auction, or any league admin. */
export default async function ConsolePage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer(); // also marks the page per-request
  if (!isDbConfigured() || !isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-6">
        <NotConfigured>The console works once the database and Supabase sign-in are connected.</NotConfigured>
      </main>
    );
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const next = `/auction/${id}/console`;
  if (!viewer) return <SignInGate next={next} why="The console is for the auction team. Sign in with your Google account." />;
  if (!(await canOperate(viewer, id))) {
    return <SignInGate next={next} email={viewer.email} why="Only this auction's admins can use the console." />;
  }

  const row = await findAuction(getDb(), id);
  const snap = row ? await getSnapshot(id, { events: 20, withActor: true }) : null;
  if (!row || !snap) notFound();
  return <Console initial={snap} boardHref={row.mode === "live" ? "/auction" : testBoardPath(row.shareToken)} />;
}
