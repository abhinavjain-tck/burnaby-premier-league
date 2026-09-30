import { TriangleAlert } from "lucide-react";

/** Shown instead of crashing when DATABASE_URL or Supabase env vars are missing (or a read fails). */
export function NotConfigured({ children, title = "Not configured yet" }: { children: React.ReactNode; title?: string }) {
  return (
    <div role="status" className="flex gap-3 rounded-md border-2 border-gold-dark bg-gold-soft p-4 text-ink">
      <TriangleAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-gold-ink" />
      <div>
        <p className="font-bold">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}

export const UNAVAILABLE_MESSAGE = "Registration is temporarily unavailable. Try again in a minute, or message the league on WhatsApp.";
