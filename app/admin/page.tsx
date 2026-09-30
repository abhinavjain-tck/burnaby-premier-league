import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { SignInCard } from "@/components/auction/SignInGate";
import { NotConfigured } from "@/components/NotConfigured";
import { getViewer } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminSignInPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const viewer = isSupabaseConfigured() ? await getViewer() : null;
  if (viewer?.role) redirect("/admin/registrations");

  return (
    <SignInCard title="BPL admin">
      {!isSupabaseConfigured() ? (
        <NotConfigured>Admin sign-in works once Supabase is connected (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).</NotConfigured>
      ) : viewer ? (
        <div className="space-y-4">
          <p>
            You&apos;re signed in as <strong>{viewer.email}</strong>, but that account is not on the admin list. Ask a super admin to add
            you.
          </p>
          <form action={signOut}>
            <button type="submit" className="btn-outline w-full">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <>
          <p className="text-lg">For league admins, the auctioneer and team owners.</p>
          {error && (
            <p role="alert" className="error">
              Sign-in didn&apos;t finish. Try again.
            </p>
          )}
          <GoogleSignInButton />
        </>
      )}
    </SignInCard>
  );
}
