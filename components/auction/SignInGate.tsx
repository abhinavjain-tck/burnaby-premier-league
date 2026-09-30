import { signOut } from "@/app/admin/actions";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";
import { LogoMark } from "@/components/ui/Logo";

/** Centred sign-in card: the BPL mark, a heading and one clear action. Used by the console, owner view and admin. */
export function SignInCard({ title = "Sign in", children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-pitch px-4 py-10">
      <div className="card w-full max-w-md space-y-5 p-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-12" />
          <p className="font-display text-xl leading-tight font-extrabold uppercase">
            Burnaby Premier League
            <span className="block text-base font-bold text-muted">Season 4</span>
          </p>
        </div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Shown on console and owner pages when nobody is signed in, or the wrong person is. */
export function SignInGate({ next, email, why }: { next: string; email?: string; why: string }) {
  return (
    <SignInCard>
      <p className="text-lg">{why}</p>
      {email ? (
        <>
          <p className="rounded-md bg-ball-soft p-3">
            You&apos;re signed in as <strong className="break-all">{email}</strong>, which doesn&apos;t have access here.
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
    </SignInCard>
  );
}
