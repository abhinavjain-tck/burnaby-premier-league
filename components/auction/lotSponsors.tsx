import { countSponsors, SponsorSlot } from "@/components/sponsors/SponsorSlot";

/** One server-rendered "Lot brought to you by" card per sponsor. The board picks one per lot. */
export async function lotSponsors(): Promise<React.ReactNode[]> {
  const n = await countSponsors("auction_lot");
  return Array.from({ length: n }, (_, i) => <SponsorSlot key={i} placement="auction_lot" pick={i} />);
}
