import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userFollows } from "@/db/schema";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login");

  const follows = await db
    .select({ entityId: userFollows.entityId })
    .from(userFollows)
    .where(eq(userFollows.userId, current.user.id));

  return (
    <main className="app-page">
      <header className="site-header app-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">CI</span><span>Civic India</span></Link>
        <div className="app-header-right">
          <span className="user-label">{current.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <section className="app-content">
        <p className="eyebrow">YOUR CIVIC INDIA</p>
        <h1>Welcome, {current.user.name.split(" ")[0]}.</h1>
        <p className="app-lead">Your account is ready. Choose the public institutions you want to keep up with.</p>

        <div className="dashboard-stats">
          <div className="stat-card"><span>INSTITUTIONS FOLLOWED</span><strong>{follows.length}</strong></div>
          <div className="stat-card"><span>YOUR UPDATES</span><strong>Live feed</strong></div>
        </div>

        <div className="dashboard-actions">
          <Link className="button button-dark" href="/feed">View my feed <span aria-hidden="true">→</span></Link>
          <Link className="text-link" href="/entities">Manage follows</Link>
        </div>

        <section className="panel">
          <h2>Updates from the institutions you follow.</h2>
          <p className="panel-subtitle">The feed shows collected official updates when their source can be linked to an entity you follow.</p>
        </section>
      </section>
    </main>
  );
}
