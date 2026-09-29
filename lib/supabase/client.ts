import { createBrowserClient } from "@supabase/ssr";
import { NotConfiguredError } from "../config";

/** Browser client (anon key). Used for Google sign-in and signed uploads. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new NotConfiguredError("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, key);
}
