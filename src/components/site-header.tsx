import Link from "next/link";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const current = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="site-header app-header">
      <Link className="brand" href="/">
        <span className="brand-mark">CI</span>
        <span>Civic India</span>
      </Link>
      <nav className="app-header-right" aria-label="Main navigation">
        <Link className="button button-quiet" href="/institutions">
          Institutions
        </Link>
        <Link className="button button-quiet" href="/entities">
          Entities
        </Link>
        <Link className="button button-quiet" href="/feed">
          My feed
        </Link>
        {current ? (
          <>
            <Link className="button button-dark" href="/dashboard">
              Dashboard
            </Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link className="button button-dark" href="/login">
              Log in
            </Link>
            <Link className="button button-quiet" href="/register">
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
