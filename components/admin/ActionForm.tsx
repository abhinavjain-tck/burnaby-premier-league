"use client";

import { startTransition, useActionState } from "react";
import type { FormResult } from "@/lib/auction/form";

type Props = {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: React.ReactNode;
  className?: string;
};

/** A form for one admin step. Disables itself while running and shows the result underneath. */
export function ActionForm({ action, children, className = "" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  // Submit without React's automatic reset, so an error never wipes what was typed (the config JSON).
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="space-y-2">
        {children}
      </fieldset>
      {pending && <p className="mt-1 text-muted">Working…</p>}
      {state && !pending && (
        <p role="status" className={state.ok ? "mt-1 font-semibold text-brand" : "error"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
