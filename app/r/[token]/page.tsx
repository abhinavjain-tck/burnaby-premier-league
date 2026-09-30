import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { NotConfigured, UNAVAILABLE_MESSAGE } from "@/components/NotConfigured";
import { CardPreview, toCard } from "@/components/registration/CardPreview";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { isDbConfigured, isStorageConfigured, NotConfiguredError } from "@/lib/config";
import { editPath } from "@/lib/registration/messages";
import { getRegistrationByToken, type FeeInfo, type Registration, type Stats, getFeeInfo } from "@/lib/registration/queries";
import { isEditToken } from "@/lib/registration/token";

// Private page: keep it out of search engines, and never send the token in a Referer header.
export const metadata: Metadata = {
  title: "Your registration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATUS_TONE = { registered: "gold", confirmed: "pitch", withdrawn: "neutral" } as const;

const STATUS_TEXT = {
  registered: "Registered · awaiting payment check",
  confirmed: "Confirmed · payment received",
  withdrawn: "Withdrawn",
} as const;

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** The player's private edit page. The only place phone and email are shown outside admin. */
export default async function EditRegistrationPage({ params, searchParams }: Props) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!isDbConfigured()) {
    return (
      <PageShell>
        <NotConfigured>Edit links work once the database is connected.</NotConfigured>
      </PageShell>
    );
  }
  if (!isEditToken(token)) notFound();
  let reg: Registration | null = null;
  let fee: FeeInfo = {};
  try {
    reg = await getRegistrationByToken(token);
    if (reg) fee = await getFeeInfo();
  } catch (err) {
    if (!(err instanceof NotConfiguredError)) console.error("EditRegistrationPage: db read failed", err);
    return (
      <PageShell>
        {err instanceof NotConfiguredError ? (
          <NotConfigured>Edit links work once the database is connected.</NotConfigured>
        ) : (
          <NotConfigured title="Temporarily unavailable">{UNAVAILABLE_MESSAGE}</NotConfigured>
        )}
      </PageShell>
    );
  }
  if (!reg) notFound();

  const stats = (reg.stats ?? {}) as Stats;
  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <SectionHeader as="h1" eyebrow="BPL Season 4" title={query.new ? "You're in the pool" : "Your registration"} />
        <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
          Status: <Badge tone={STATUS_TONE[reg.status]}>{STATUS_TEXT[reg.status]}</Badge>
        </p>
      </div>

      <section className="space-y-3 rounded-lg border-2 border-gold bg-gold-soft p-4">
        <p className="flex gap-3">
          <KeyRound aria-hidden className="size-6 shrink-0 text-gold-ink" />
          <span>
            <strong>This is your private edit link.</strong> Save it. Anyone with it can edit your card, so don&apos;t post it in the group.
          </span>
        </p>
        <CopyButton label="Copy my edit link" path={editPath(token)} />
      </section>

      <section aria-labelledby="card-h" className="space-y-3">
        <h2 id="card-h" className="eyebrow text-center">
          Your auction card
        </h2>

        <CardPreview card={toCard(reg)} />
      </section>

      <RegistrationForm
        mode="edit"
        token={token}
        storageReady={isStorageConfigured()}
        fee={fee}
        initial={{
          fullName: reg.fullName,
          phone: reg.phone,
          email: str(reg.email),
          role: str(reg.role),
          battingStyle: str(reg.battingStyle),
          bowlingStyle: str(reg.bowlingStyle),
          bio: str(reg.bio),
          matches: str(stats.matches),
          runs: str(stats.runs),
          wickets: str(stats.wickets),
          best: str(stats.best),
          cricheroesUrl: str(reg.cricheroesUrl),
          photoUrl: str(reg.photoUrl),
          hasPaymentProof: Boolean(reg.paymentProofUrl),
        }}
      />
    </PageShell>
  );
}
