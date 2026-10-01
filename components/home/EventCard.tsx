import { Banknote, CalendarDays, CircleDot, Gavel, MapPin, type LucideIcon } from "lucide-react";
import { EVENT, mapsLink } from "@/lib/event";
import type { FeeInfo } from "@/lib/registration/queries";

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pitch-soft text-pitch">
        <Icon aria-hidden className="size-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-wide text-muted uppercase">{label}</p>
        <div className="font-semibold">{children}</div>
      </div>
    </li>
  );
}

/** Auction, match days, ground, format and fee, one row each. */
export function EventCard({ fee }: { fee: FeeInfo }) {
  const feeText = fee.text ?? EVENT.fee.text;
  const feeEmail = fee.email ?? EVENT.fee.email;
  return (
    <section aria-labelledby="event-h" className="card p-5">
      <h2 id="event-h" className="mb-4 font-display text-3xl leading-tight font-extrabold uppercase">
        Event
      </h2>
      <ul className="divide-y divide-line">
        <Row icon={Gavel} label="Auction">
          {EVENT.auction.when}
          <span className="block font-normal text-muted">{EVENT.auction.where}</span>
        </Row>
        <Row icon={CalendarDays} label="Matches">
          {EVENT.matches.dates}, {EVENT.matches.time}
        </Row>
        <Row icon={MapPin} label="Ground">
          {EVENT.venue.name}
          <a href={mapsLink(EVENT.venue.address)} target="_blank" rel="noopener noreferrer" className="link block font-normal">
            {EVENT.venue.address}
          </a>
        </Row>
        <Row icon={CircleDot} label="Format">
          {EVENT.format}
        </Row>
        <Row icon={Banknote} label="Fee">
          {feeText} by e-Transfer to <span className="break-all">{feeEmail}</span>
          <span className="block font-normal text-muted">{EVENT.cutoff}</span>
        </Row>
      </ul>
    </section>
  );
}
