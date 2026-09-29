"use client";

import { startTransition, useActionState, useState } from "react";
import { saveRegistration } from "@/app/register/actions";
import { BATTING_STYLES, BIO_MAX, BOWLING_STYLES, ROLES } from "@/lib/registration/options";
import type { FieldErrors, SaveState } from "@/lib/registration/validate";
import { PhotoInput } from "./PhotoInput";

export type FormDefaults = {
  fullName: string;
  phone: string;
  email: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  bio: string;
  matches: string;
  runs: string;
  wickets: string;
  best: string;
  cricheroesUrl: string;
  photoUrl: string;
  hasPaymentProof: boolean;
};

type Props = {
  mode: "new" | "edit";
  token?: string;
  initial?: Partial<FormDefaults>;
  storageReady: boolean;
  fee: { text?: string; email?: string };
  /** Optional sponsor card per step (server-rendered). */
  stepSponsors?: React.ReactNode[];
};

type StepKey = "basics" | "card" | "fee";
const STEP_FIELDS: Record<StepKey, string[]> = {
  basics: ["fullName", "phone", "email", "role", "battingStyle", "bowlingStyle"],
  card: ["photoUrl", "bio", "matches", "runs", "wickets", "best", "cricheroesUrl"],
  fee: ["paymentProofPath"],
};

const initialState: SaveState = { status: "idle" };

export function RegistrationForm({ mode, token, initial = {}, storageReady, fee, stepSponsors = [] }: Props) {
  const [state, formAction, pending] = useActionState(saveRegistration, initialState);
  const [open, setOpen] = useState<Record<StepKey, boolean>>({ basics: mode === "new", card: mode === "edit", fee: false });
  const [uploads, setUploads] = useState(0);
  const errors: FieldErrors = state.status === "invalid" ? state.errors : {};
  const hasError = (k: StepKey) => STEP_FIELDS[k].some((f) => errors[f]);
  const isOpen = (k: StepKey) => open[k] || hasError(k);
  const toggle = (k: StepKey) => setOpen((o) => ({ ...o, [k]: !isOpen(k) }));
  const goTo = (from: StepKey, to: StepKey) => setOpen((o) => ({ ...o, [from]: false, [to]: true }));
  const onBusy = (busy: boolean) => setUploads((n) => n + (busy ? 1 : -1));

  // Submit without React's automatic form reset, so a validation error never wipes what was typed.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}

      <Step n={1} title="About you" tag="Required" open={isOpen("basics")} onToggle={() => toggle("basics")}>
        <Text name="fullName" label="Full name" autoComplete="name" defaultValue={initial.fullName} error={errors.fullName} />
        <Text
          name="phone"
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="604 555 0101"
          defaultValue={initial.phone}
          error={errors.phone}
          hint="Only league admins see this."
        />
        <Text name="email" label="Email (optional)" type="email" autoComplete="email" defaultValue={initial.email} error={errors.email} />
        <Choices name="role" label="Role" options={ROLES} defaultValue={initial.role} error={errors.role} />
        <Choices name="battingStyle" label="Bats" options={BATTING_STYLES.map((v) => ({ value: v, label: v }))} defaultValue={initial.battingStyle} error={errors.battingStyle} />
        <Choices name="bowlingStyle" label="Bowls" options={BOWLING_STYLES.map((v) => ({ value: v, label: v }))} defaultValue={initial.bowlingStyle} error={errors.bowlingStyle} />
        <button type="button" className="btn-outline w-full" onClick={() => goTo("basics", "card")}>
          Next: auction card
        </button>
      </Step>
      {stepSponsors[0]}

      <Step n={2} title="Auction card" tag="Optional, edit later" open={isOpen("card")} onToggle={() => toggle("card")}>
        <PhotoInput
          kind="photo"
          name="photoUrl"
          label="Photo"
          hint="A clear face photo. We shrink it on your phone before upload."
          initialValue={initial.photoUrl}
          storageReady={storageReady}
          onBusyChange={onBusy}
          error={errors.photoUrl}
        />
        <div>
          <label htmlFor="bio" className="label">
            One line about you
          </label>
          <textarea id="bio" name="bio" rows={2} maxLength={BIO_MAX} defaultValue={initial.bio} className="field" />
          <p className="text-sm text-muted">Up to {BIO_MAX} characters.</p>
          {errors.bio && <p className="error">{errors.bio}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Text name="matches" label="Matches" inputMode="numeric" defaultValue={initial.matches} error={errors.matches} />
          <Text name="runs" label="Runs" inputMode="numeric" defaultValue={initial.runs} error={errors.runs} />
          <Text name="wickets" label="Wickets" inputMode="numeric" defaultValue={initial.wickets} error={errors.wickets} />
          <Text name="best" label="Best" placeholder="87* or 4/20" defaultValue={initial.best} error={errors.best} />
        </div>
        <Text
          name="cricheroesUrl"
          label="CricHeroes profile link"
          type="url"
          inputMode="url"
          placeholder="https://cricheroes.com/player-profile/…"
          defaultValue={initial.cricheroesUrl}
          error={errors.cricheroesUrl}
        />
        <button type="button" className="btn-outline w-full" onClick={() => goTo("card", "fee")}>
          Next: fee
        </button>
      </Step>
      {stepSponsors[1]}

      <Step n={3} title="League fee" tag="Optional" open={isOpen("fee")} onToggle={() => toggle("fee")}>
        {fee.text || fee.email ? (
          <div className="space-y-1">
            {fee.text && <p className="font-bold">{fee.text}</p>}
            {fee.email && (
              <p>
                Interac e-Transfer to <strong className="break-words select-all">{fee.email}</strong>. Put your name in the memo.
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted">Fee details coming soon. An admin will message you on WhatsApp.</p>
        )}
        <PhotoInput
          kind="proof"
          name="paymentProofPath"
          label="Payment screenshot (optional)"
          hint="Only admins can see it."
          storageReady={storageReady}
          onBusyChange={onBusy}
          error={errors.paymentProofPath}
        />
        {initial.hasPaymentProof && <p className="text-sm text-muted">We already have a screenshot from you. Upload again only to replace it.</p>}
      </Step>
      {stepSponsors[2]}

      <Result state={state} mode={mode} />

      <button type="submit" className="btn w-full" disabled={pending || uploads > 0}>
        {pending ? "Saving…" : uploads > 0 ? "Waiting for upload…" : mode === "new" ? "Register" : "Save changes"}
      </button>
    </form>
  );
}

function Result({ state, mode }: { state: SaveState; mode: "new" | "edit" }) {
  if (state.status === "idle") return null;
  const box = "rounded-lg border-2 p-4";
  if (state.status === "saved") {
    return (
      <p role="status" className={`${box} border-brand bg-emerald-50 font-bold text-brand`}>
        Saved.
      </p>
    );
  }
  if (state.status === "duplicate") {
    return (
      <div role="alert" className={`${box} border-red-700 bg-red-50 text-red-900`}>
        <p className="font-bold">Already registered</p>
        <p>
          {mode === "new"
            ? "This WhatsApp number is already in the pool. Lost your edit link? Message a league admin on WhatsApp and they will resend it."
            : "Another player already registered with that WhatsApp number."}
        </p>
      </div>
    );
  }
  const message = state.status === "invalid" ? "Please fix the fields marked in red." : state.message;
  return (
    <p role="alert" className={`${box} border-red-700 bg-red-50 font-bold text-red-900`}>
      {message}
    </p>
  );
}

function Step(props: { n: number; title: string; tag: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const id = `step-${props.n}`;
  return (
    <section className="rounded-xl border-2 border-ink">
      <h2>
        <button
          type="button"
          aria-expanded={props.open}
          aria-controls={id}
          onClick={props.onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
        >
          <span>
            <span className="text-lg font-black">
              {props.n} · {props.title}
            </span>
            <span className="ml-2 text-sm text-muted">{props.tag}</span>
          </span>
          <span aria-hidden className="text-2xl font-black">
            {props.open ? "−" : "+"}
          </span>
        </button>
      </h2>
      <div id={id} hidden={!props.open} className="space-y-4 border-t-2 border-ink p-4">
        {props.children}
      </div>
    </section>
  );
}

type TextProps = React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; error?: string; hint?: string };

function Text({ name, label, error, hint, ...rest }: TextProps) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {hint && <p className="mb-1 text-sm text-muted">{hint}</p>}
      <input id={name} name={name} aria-invalid={Boolean(error)} className="field" {...rest} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function Choices(props: { name: string; label: string; options: ReadonlyArray<{ value: string; label: string }>; defaultValue?: string; error?: string }) {
  return (
    <fieldset>
      <legend className="label">{props.label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {props.options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={props.name} value={o.value} defaultChecked={props.defaultValue === o.value} className="h-5 w-5 accent-white" />
            <span className="font-semibold">{o.label}</span>
          </label>
        ))}
      </div>
      {props.error && <p className="error">{props.error}</p>}
    </fieldset>
  );
}
