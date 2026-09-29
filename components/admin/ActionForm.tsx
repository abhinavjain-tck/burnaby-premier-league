"use client";

import { useActionState } from "react";
import type { FormResult } from "@/lib/auction/form";

type Props = {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: React.ReactNode;
  className?: string;
};

/** A form for one admin step. Disables itself while running and shows the result underneath. */
export function ActionForm({ action, children, className = "" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
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
