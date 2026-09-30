import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/AdminBar";
import { safeColour } from "@/lib/auction/colour";
import { NotConfigured } from "@/components/NotConfigured";
import { requireAdmin } from "@/lib/auth/roles";
import { isDbConfigured } from "@/lib/config";
import { feeFrom, getSettingsSeason, listTeams } from "@/lib/registration/queries";
import { isRegistrationOpen } from "@/lib/registration/settings";
import { saveLeagueSettings, saveTeams } from "./actions";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const input = "field";

export default async function SettingsPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { saved, error } = await searchParams;

  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <NotConfigured>Settings show up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }

  let season: Awaited<ReturnType<typeof getSettingsSeason>>;
  let teamRows: Awaited<ReturnType<typeof listTeams>> = [];
  try {
    season = await getSettingsSeason();
    if (season) teamRows = await listTeams(season.id);
  } catch (err) {
    console.error("SettingsPage read failed", err);
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <NotConfigured title="Temporarily unavailable">Could not load settings. Try again in a minute.</NotConfigured>
        </main>
      </>
    );
  }
  const fee = feeFrom(season?.config);

  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Settings{season ? ` · ${season.name}` : ""}</h1>

        {typeof error === "string" && (
          <p role="alert" className="rounded-md border-2 border-ball bg-ball-soft p-3 font-bold text-ink">
            {error}
          </p>
        )}
        {saved === "league" && (
          <p role="status" className="rounded-md border-2 border-pitch bg-pitch-soft p-3 font-bold text-pitch">
            League settings saved.
          </p>
        )}
        {saved === "teams" && (
          <p role="status" className="rounded-md border-2 border-pitch bg-pitch-soft p-3 font-bold text-pitch">
            Teams saved.
          </p>
        )}

        {!season ? (
          <NotConfigured>No season row yet. Run the seed migration first.</NotConfigured>
        ) : (
          <>
            <form action={saveLeagueSettings} className="card max-w-2xl space-y-4 p-4">
              <h2 className="font-display text-2xl font-extrabold uppercase">League</h2>
              <label className="block space-y-1">
                <span className="font-bold">Fee line</span>
                <input name="fee_text" defaultValue={fee.text ?? ""} placeholder="$60 per player" maxLength={120} className={input} />
              </label>
              <label className="block space-y-1">
                <span className="font-bold">e-Transfer email (optional)</span>
                <input name="etransfer_email" type="email" defaultValue={fee.email ?? ""} maxLength={200} className={input} />
              </label>
              <label className="flex min-h-12 cursor-pointer items-center gap-3">
                <input name="registration_open" type="checkbox" defaultChecked={isRegistrationOpen(season.config)} className="size-6 accent-pitch" />
                <span className="font-bold">Registration is open</span>
              </label>
              <button type="submit" className="btn">
                Save league settings
              </button>
            </form>

            <form action={saveTeams} className="max-w-2xl space-y-4">
              <h2 className="font-display text-2xl font-extrabold uppercase">Teams</h2>
              {teamRows.length === 0 && <p className="text-muted">No teams for this season yet.</p>}
              {teamRows.map((t) => (
                <fieldset key={t.id} className="card space-y-3 border-l-8 p-4" style={{ borderLeftColor: safeColour(t.colour) }}>
                  <legend className="sr-only">{t.name}</legend>
                  <p aria-hidden className="font-display text-2xl font-extrabold uppercase">{t.name}</p>
                  <input type="hidden" name="id" value={t.id} />
                  <label className="block space-y-1">
                    <span className="text-sm font-bold">Name</span>
                    <input name={`name_${t.id}`} defaultValue={t.name} required maxLength={60} className={input} />
                  </label>
                  <div className="flex gap-3">
                    <label className="block flex-1 space-y-1">
                      <span className="text-sm font-bold">Short (3)</span>
                      <input
                        name={`short_${t.id}`}
                        defaultValue={t.short}
                        required
                        minLength={3}
                        maxLength={3}
                        pattern="[A-Za-z0-9]{3}"
                        className={`${input} uppercase`}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-bold">Colour</span>
                      <input name={`colour_${t.id}`} type="color" defaultValue={t.colour} className="block h-12 w-16 cursor-pointer rounded-md border-2 border-edge bg-paper" />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-sm font-bold">Logo URL</span>
                    <input name={`logo_${t.id}`} defaultValue={t.logoUrl ?? ""} maxLength={500} placeholder="https://..." className={input} />
                  </label>
                </fieldset>
              ))}
              {teamRows.length > 0 && (
                <button type="submit" className="btn">
                  Save teams
                </button>
              )}
            </form>
          </>
        )}
      </main>
    </>
  );
}
