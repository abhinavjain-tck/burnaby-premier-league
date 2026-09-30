import { Badge, type Tone } from "@/components/ui/Badge";

const TONES: Record<string, Tone> = {
  // registrations
  registered: "gold",
  confirmed: "pitch",
  withdrawn: "neutral",
  // lots
  queued: "neutral",
  on_block: "gold",
  sold: "pitch",
  unsold: "ball",
  skipped: "outline",
  // auctions
  draft: "neutral",
  open: "pitch",
  paused: "gold",
  completed: "ink",
  live: "ball",
  test: "outline",
};

/** One coloured badge for any status word used in admin. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}
