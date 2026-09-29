import { signOut } from "@/app/admin/actions";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";

/** Shown on console and owner pages when nobody is signed in, or the wrong person is. */
export function SignInGate({ next, email, why }: { next: string; email?: string; why: string }) {
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-10">
      <h1 className="text-3xl font-black">Sign in</h1>
      <p>{why}</p>
      {email ? (
        <>
          <p>
            You&apos;re signed in as <strong>{email}</strong>, which doesn&apos;t have access here.
          </p>
          <form action={signOut}>
            <button type="submit" className="btn-outline w-full">
              Sign out
            </button>
          </form>
        </>
      ) : (
        <GoogleSignInButton next={next} />
      )}
    </main>
  );
}
