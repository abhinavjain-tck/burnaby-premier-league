import { lowestBase, TIER_KEYS, type AuctionConfig } from "@/lib/auction/config";
import { fmt } from "@/lib/money";

const TIER_NAME: Record<string, string> = { M: "Marquee", A: "Tier A", B: "Tier B", C: "Tier C" };

/** The auction rules, straight from the config numbers, so the page never disagrees with the console. */
export function Rules({ config }: { config: AuctionConfig }) {
  const guardExample = Math.max(0, 10000 - (config.minSquad - 6 - 1) * lowestBase(config));
  return (
    <section aria-labelledby="rules-h" className="space-y-3">
      <h2 id="rules-h" className="font-display text-3xl leading-tight font-extrabold uppercase">
        How the auction works
      </h2>
      <ul className="card space-y-3 p-4 pl-9 marker:text-pitch [&>li]:list-disc [&>li]:pl-1">
        <li>
          Every team starts with <strong>{fmt(config.purseLakhs)}</strong>. Squads are <strong>{config.minSquad}</strong> to{" "}
          <strong>{config.maxSquad}</strong> players.
        </li>
        {config.ownerPresoldLakhs > 0 && (
          <li>Each owner is in their own team before lot 1, at {fmt(config.ownerPresoldLakhs)}.</li>
        )}
        <li>
          Base prices: {TIER_KEYS.map((t) => `${TIER_NAME[t]} ${fmt(config.basePrices[t])}`).join(" · ")}. Bidding starts at base.
        </li>
        <li>Marquee players go first, then one set per role. Order inside a set is shuffled on the day, in front of everyone.</li>
        <li>
          Raises go up in steps:{" "}
          {config.ladder
            .map((r, i) => {
              const from = i === 0 ? 0 : (config.ladder[i - 1].upTo ?? 0);
              return r.upTo === null ? `${fmt(from)} and up +${fmt(r.step)}` : `below ${fmt(r.upTo)} +${fmt(r.step)}`;
            })
            .join(" · ")}
          . A jump bid must be a whole number of steps.
        </li>
        <li>
          A team must keep enough to fill its squad at {fmt(lowestBase(config))} a player. Example: {fmt(10000)} left with 6
          players means a max bid of {fmt(guardExample)}.
        </li>
        <li>
          No bid at base means unsold. Unsold players come back at the end at{" "}
          {config.unsoldBaseMultiplier === 1 ? "their base price" : `${Math.round(config.unsoldBaseMultiplier * 100)}% of base`}.
        </li>
        <li>The auctioneer&apos;s call is final. Any ruling goes in the event log, and the full log is shared after.</li>
      </ul>
    </section>
  );
}
