/** Shown instead of crashing when DATABASE_URL or Supabase env vars are missing (or a read fails). */
export function NotConfigured({ children, title = "Not configured yet" }: { children: React.ReactNode; title?: string }) {
  return (
    <div role="status" className="rounded-lg border-2 border-amber-700 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">{title}</p>
      <p>{children}</p>
    </div>
  );
}

export const UNAVAILABLE_MESSAGE = "Registration is temporarily unavailable. Try again in a minute, or message the league on WhatsApp.";
