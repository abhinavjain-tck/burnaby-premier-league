"use client";

import { useCallback, useEffect, useState } from "react";
import { sendCommand } from "@/app/auction/actions";
import type { Command, CommandResponse } from "@/lib/auction/types";
import type { AuctionLive } from "../useAuctionLive";

export type Notice = { text: string; tone: "info" | "error" };

const RETRY_DELAYS_MS = [700, 1800];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Random idempotency key. crypto.randomUUID needs https; fall back to getRandomValues. */
function newKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sends console commands. Each tap gets one idempotency key and the version the
 * operator was looking at; network retries reuse both, so a flaky connection
 * can never record the same bid twice.
 */
export function useCommand(live: AuctionLive) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { snap, replace, refresh } = live;
  const id = snap.auction.id;
  const version = snap.auction.version;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const send = useCallback(
    async (command: Command, expectedVersion: number = version): Promise<boolean> => {
      const meta = { expectedVersion, idempotencyKey: newKey() };
      setPending(true);
      let res: CommandResponse | null = null;
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length && !res; attempt++) {
        try {
          res = await sendCommand(id, command, meta);
        } catch {
          if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
      setPending(false);
      if (!res) {
        setNotice({ text: "No signal. Check the board, then tap again.", tone: "error" });
        void refresh("live");
        return false;
      }
      if (res.ok) {
        replace(res.snapshot);
        if (res.duplicate) setNotice({ text: "Already saved.", tone: "info" });
        return true;
      }
      if (res.code === "conflict") {
        if (res.snapshot) replace(res.snapshot);
        setNotice({ text: "Board changed, refreshed", tone: "info" });
        return false;
      }
      setNotice({ text: res.message, tone: "error" });
      return false;
    },
    [id, refresh, replace, version],
  );

  return { send, pending, notice, setNotice };
}
