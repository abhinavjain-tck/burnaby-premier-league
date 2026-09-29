import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { NotConfigured, UNAVAILABLE_MESSAGE } from "@/components/NotConfigured";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";
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
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <Link href="/" className="font-bold text-brand underline">
        ← BPL Season 4
      </Link>
      <h1 className="text-3xl font-black">Register to play</h1>
      <p>
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
        <p className="rounded-lg border-2 border-ink p-4 font-bold">Registration is closed for this season.</p>
      )}

      <p className="text-sm text-muted">
        Public: your name, photo, role, styles, bio, stats and team. Private: your phone, email and payment. Only league admins see those.
      </p>

      <SponsorSlot placement="strip" />
    </main>
  );
}
