import type { Metadata } from "next";
import { Lock, ShieldCheck } from "lucide-react";
import { connection } from "next/server";
import { NotConfigured, UNAVAILABLE_MESSAGE } from "@/components/NotConfigured";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { isDbConfigured, isStorageConfigured, NotConfiguredError } from "@/lib/config";
import { feeFrom, getActiveSeason } from "@/lib/registration/queries";
import { isRegistrationOpen } from "@/lib/registration/settings";

export const metadata: Metadata = { title: "Register" };

/** Never throws: a DB hiccup becomes `failed`, so the page shows a calm notice instead of a 500. */
async function loadSeason() {
  try {
    return { season: await getActiveSeason(), failed: false };
  } catch (err) {
    if (err instanceof NotConfiguredError) return { season: null, failed: false };
    console.error("RegisterPage: getActiveSeason failed", err);
    return { season: null, failed: true };
  }
}

export default async function RegisterPage() {
  await connection(); // always check the live season, never a build-time snapshot
  const dbReady = isDbConfigured();
  const { season, failed } = dbReady ? await loadSeason() : { season: null, failed: false };
  const open = !failed && (!dbReady || (season !== null && isRegistrationOpen(season.config)));

  return (
    <PageShell current="register" className="space-y-5">
      <SectionHeader as="h1" eyebrow="BPL Season 4" title="Register to play" />
      <p className="text-lg">
        Only step 1 is required. You get a private link to finish your auction card later. No account needed.
      </p>

      {!dbReady && (
        <NotConfigured>Registration opens once the database is connected. You can look at the form, but it will not save yet.</NotConfigured>
      )}

      {failed && <NotConfigured title="Temporarily unavailable">{UNAVAILABLE_MESSAGE}</NotConfigured>}

      {failed ? null : open ? (
        <RegistrationForm
          mode="new"
          storageReady={isStorageConfigured()}
          fee={feeFrom(season?.config)}
          stepSponsors={[0, 1, 2].map((i) => (
            <SponsorSlot key={i} placement="reg_step" pick={i} />
          ))}
        />
      ) : (
        <EmptyState icon={Lock} title="Registration is closed">
          <p>Registration is closed for this season.</p>
        </EmptyState>
      )}

      <div className="flex gap-3 rounded-md bg-pitch-soft p-4 text-sm">
        <ShieldCheck aria-hidden className="size-5 shrink-0 text-pitch" />
        <p>
          <strong>Public:</strong> your name, photo, role, styles, bio, stats and team. <strong>Private:</strong> your phone, email and
          payment. Only league admins see those.
        </p>
      </div>
    </PageShell>
  );
}
