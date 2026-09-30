import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { markPaid, setTier, withdraw } from "@/app/admin/actions";
import { ArrowLeft } from "lucide-react";
import { AdminBar } from "@/components/admin/AdminBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { NotConfigured } from "@/components/NotConfigured";
import { CardPreview, toCard } from "@/components/registration/CardPreview";
import { requireAdmin } from "@/lib/auth/roles";
import { isDbConfigured, isStorageConfigured } from "@/lib/config";
import { editPath, whatsappIntro } from "@/lib/registration/messages";
import { TIERS } from "@/lib/registration/options";
import { getRegistrationById } from "@/lib/registration/queries";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Registration", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

const when = (d: Date) => d.toLocaleString("en-CA", { timeZone: "America/Vancouver", dateStyle: "medium", timeStyle: "short" });

/** 10-minute signed link to the private payment screenshot. */
async function proofLink(path: string | null): Promise<string | null> {
  if (!path || !isStorageConfigured()) return null;
  const { data } = await createServiceClient().storage.from("payment-proofs").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export default async function RegistrationDetailPage({ params }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isDbConfigured()) {
    return (
      <>
        <AdminBar email={admin.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <NotConfigured>Registration details show up once DATABASE_URL is set.</NotConfigured>
        </main>
      </>
    );
  }
  if (!z.uuid().safeParse(id).success) notFound();
  const reg = await getRegistrationById(id);
  if (!reg) notFound();
  const proof = await proofLink(reg.paymentProofUrl);

  return (
    <>
      <AdminBar email={admin.email} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <Link href="/admin/registrations" className="link">
          <ArrowLeft aria-hidden className="size-5" /> All registrations
        </Link>

        <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <CardPreview card={toCard(reg)} />

        <div className="space-y-5">
        <dl className="card grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4">
          <dt className="font-bold text-muted">WhatsApp</dt>
          <dd className="num font-semibold">{reg.phone}</dd>
          <dt className="font-bold text-muted">Email</dt>
          <dd className="break-all">{reg.email ?? "—"}</dd>
          <dt className="font-bold text-muted">Status</dt>
          <dd>
            <StatusBadge status={reg.status} />
          </dd>
          <dt className="font-bold text-muted">Paid</dt>
          <dd>{reg.paidAt ? `${when(reg.paidAt)} by ${reg.paidMarkedBy ?? "?"}` : "Not yet"}</dd>
          <dt className="font-bold text-muted">Screenshot</dt>
          <dd>
            {proof ? (
              <a href={proof} target="_blank" rel="noopener noreferrer" className="link">
                View (link lasts 10 min)
              </a>
            ) : reg.paymentProofUrl ? (
              "Uploaded"
            ) : (
              "None"
            )}
          </dd>
        </dl>

        <section className="card space-y-4 p-4">
          {!reg.paidAt && (
            <form action={markPaid.bind(null, reg.id)}>
              <button type="submit" className="btn w-full">
                Mark paid
              </button>
            </form>
          )}

          <form action={setTier.bind(null, reg.id)}>
            <fieldset>
              <legend className="label">Set band (M = marquee)</legend>
              <div className="grid grid-cols-4 gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="submit"
                    name="tier"
                    value={t}
                    aria-pressed={reg.tier === t}
                    className={`min-h-12 cursor-pointer rounded-md border-2 font-display text-2xl font-extrabold ${
                      reg.tier === t ? "border-pitch bg-pitch text-white" : "border-edge bg-paper text-ink hover:border-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
          </form>

          <CopyButton label="Copy WhatsApp message" before={whatsappIntro(reg.fullName)} path={editPath(reg.editToken)} />

          {reg.status !== "withdrawn" && (
            <form action={withdraw.bind(null, reg.id)}>
              <button type="submit" className="btn-danger w-full">
                Withdraw
              </button>
            </form>
          )}
        </section>
        </div>
        </div>
      </main>
    </>
  );
}
