import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { NotConfigured } from "@/components/NotConfigured";
import { CardPreview, toCard } from "@/components/registration/CardPreview";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { isDbConfigured, isStorageConfigured } from "@/lib/config";
import { editPath } from "@/lib/registration/messages";
import { getRegistrationByToken, type Stats, getFeeInfo } from "@/lib/registration/queries";
import { isEditToken } from "@/lib/registration/token";

// Private page: keep it out of search engines, and never send the token in a Referer header.
export const metadata: Metadata = {
  title: "Your registration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

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
      <main className="mx-auto max-w-xl px-4 py-6">
        <NotConfigured>Edit links work once the database is connected.</NotConfigured>
      </main>
    );
  }
  if (!isEditToken(token)) notFound();
  const reg = await getRegistrationByToken(token);
  if (!reg) notFound();

  const stats = (reg.stats ?? {}) as Stats;
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-black">{query.new ? "You're in the pool" : "Your registration"}</h1>
      <p className="text-lg font-bold">Status: {STATUS_TEXT[reg.status]}</p>

      <section className="space-y-3 rounded-xl border-2 border-brand bg-emerald-50 p-4">
        <p>
          <strong>This is your private edit link.</strong> Save it. Anyone with it can edit your card, so don&apos;t post it in the group.
        </p>
        <CopyButton label="Copy my edit link" path={editPath(token)} />
      </section>

      <CardPreview card={toCard(reg)} />

      <RegistrationForm
        mode="edit"
        token={token}
        storageReady={isStorageConfigured()}
        fee={await getFeeInfo()}
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
    </main>
  );
}
