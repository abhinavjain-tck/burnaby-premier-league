import "server-only";
import { channelName } from "./channel";

/**
 * Push one message to every phone on channel auction:{id} through Supabase
 * Realtime's REST broadcast endpoint. Never throws: the command already
 * committed, and phones fall back to polling. Returns whether it went out.
 */
export async function broadcast(auctionId: string, event: "event" | "clock", payload: unknown): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false; // not configured: phones poll
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: channelName(auctionId), event, payload }] }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`Auction broadcast failed: HTTP ${res.status}`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Auction broadcast failed", err);
    return false;
  }
}
