/** Shown instead of crashing when DATABASE_URL or Supabase env vars are missing. */
export function NotConfigured({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-lg border-2 border-amber-700 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">Not configured yet</p>
      <p>{children}</p>
    </div>
  );
}
