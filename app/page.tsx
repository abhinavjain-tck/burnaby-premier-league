import { ArrowRight, CalendarDays, Gavel, MapPin, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/home/EventCard";
import { NotConfigured } from "@/components/NotConfigured";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";
import { ButtonLink } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { isDbConfigured } from "@/lib/config";
import { EVENT } from "@/lib/event";
import { getFeeInfo, type FeeInfo } from "@/lib/registration/queries";

// Static and cached; sponsors refresh every minute.
export const revalidate = 60;

const STEPS = [
  { icon: UserPlus, title: "Register", text: "Name, WhatsApp and role. Add a photo and stats for your auction card any time before the day." },
  { icon: Gavel, title: "Get picked", text: "Four captains bid for players on Sunday 4 Oct. Watch it live on your phone." },
  { icon: Trophy, title: "Play the season", text: `Your team gets in touch on WhatsApp. Matches are on ${EVENT.matches.dates}.` },
];

function Hero() {
  return (
    <section
      aria-labelledby="hero-h"
      className="relative overflow-hidden bg-pitch text-white"
      // Mown-pitch stripes. Decorative and low contrast on purpose; text sits on solid green.
      style={{ backgroundImage: "repeating-linear-gradient(90deg, rgb(255 255 255 / 0.04) 0 48px, transparent 48px 96px)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 pt-8 pb-10 sm:pt-14 sm:pb-16">
        <p className="rounded-sm bg-gold px-2 py-1 text-sm font-bold tracking-wider text-ink uppercase">Burnaby Premier League</p>
        <div>
          <h1 id="hero-h" className="font-display text-6xl leading-[0.9] font-extrabold uppercase sm:text-8xl">
            BPL Season 4
          </h1>
          <p className="mt-2 text-lg font-semibold text-white/90">
            {EVENT.presenter} presents {EVENT.title}, an {EVENT.tagline.toLowerCase()}.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-lg font-semibold sm:flex-row sm:gap-6">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-6 text-gold" />
            Player auction: <strong className="font-bold">Sunday 4 Oct, 11:30 AM</strong>
          </p>
          <p className="flex items-center gap-2">
            <MapPin aria-hidden className="size-6 text-gold" />
            Sperling cricket ground, live on every phone
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/register" variant="accent" size="xl" className="w-full px-10 sm:w-auto">
            Register
          </ButtonLink>
          <Link
            href="/auction"
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-md border-2 border-white/80 px-6 text-xl font-bold text-white hover:bg-white/10 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Auction board <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
        <p className="font-semibold text-white/90">No account needed. Takes 3 minutes.</p>
      </div>
    </section>
  );
}

/** Fee from admin settings. The page still renders without the database. */
async function feeInfo(): Promise<FeeInfo> {
  if (!isDbConfigured()) return {};
  try {
    return await getFeeInfo();
  } catch {
    return {};
  }
}

export default async function Home() {
  const fee = await feeInfo();
  return (
    <PageShell current="home" width="wide" before={<Hero />} className="space-y-10">
      {!isDbConfigured() && <NotConfigured>Sponsors show up here once the database is connected.</NotConfigured>}

      <div className="mx-auto max-w-md">
        <SponsorSlot placement="hero" />
      </div>

      <EventCard fee={fee} />

      <section aria-labelledby="how-h" className="space-y-4">
        <SectionHeader id="how-h" eyebrow="How it works" title="Three steps to a team" />
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card flex gap-4 p-4 sm:flex-col">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch-soft text-pitch">
                <s.icon aria-hidden className="size-6" strokeWidth={2.25} />
              </span>
              <div>
                <p className="font-display text-2xl leading-tight font-extrabold uppercase">
                  <span className="num text-gold-ink">{i + 1}.</span> {s.title}
                </p>
                <p className="text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="board-h" className="card flex flex-col gap-4 border-l-8 border-l-gold p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="board-h" className="font-display text-3xl leading-tight font-extrabold uppercase">
            The auction board
          </h2>
          <p className="text-muted">Rules, teams and the player pool now. Live bids, purses and every sale on the day.</p>
        </div>
        <ButtonLink href="/auction" variant="primary" size="lg" className="shrink-0">
          Open the board <ArrowRight aria-hidden className="size-5" />
        </ButtonLink>
      </section>
    </PageShell>
  );
}
