import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/roles";
import { buildSnapshot } from "@/lib/auction/build";
import { eventsCsv, lotsCsv } from "@/lib/auction/csv";
import { findAuction, loadAll } from "@/lib/auction/queries";
import { isDbConfigured } from "@/lib/config";
import { getDb } from "@/lib/db/client";

type Ctx = { params: Promise<{ id: string }> };

/** GET ?kind=events|lots → CSV download. Admins only. */
export async function GET(request: NextRequest, { params }: Ctx) {
  await requireAdmin();
  const { id } = await params;
  if (!isDbConfigured()) return new Response("Not configured yet: DATABASE_URL is not set.", { status: 503 });
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const db = getDb();
  const row = await findAuction(db, id);
  if (!row) return new Response("Not found", { status: 404 });

  const loaded = await loadAll(db, row);
  const snap = buildSnapshot({ auction: loaded.info, config: loaded.config, teams: loaded.teams, lots: loaded.lots, events: loaded.events });
  const kind = request.nextUrl.searchParams.get("kind") === "lots" ? "lots" : "events";
  const body = kind === "lots" ? lotsCsv(snap.lots, snap.state, snap.teams) : eventsCsv(loaded.events, snap.lots, snap.teams);
  const day = new Date().toISOString().slice(0, 10);
  const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "auction";

  // BOM so Excel reads names as UTF-8.
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bpl-${slug}-${kind}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
