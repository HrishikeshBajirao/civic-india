import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/db";
import { entities, userFollows } from "@/db/schema";
import { auth } from "@/lib/auth";

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export default async function EntitiesPage() {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login?next=/entities");

  const entityRows = await db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
      description: entities.description,
      followed: userFollows.entityId,
    })
    .from(entities)
    .leftJoin(
      userFollows,
      and(eq(userFollows.entityId, entities.id), eq(userFollows.userId, current.user.id)),
    )
    .where(eq(entities.active, true))
    .orderBy(asc(entities.name));

  return (
    <main className="app-page">
      <header className="site-header app-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">CI</span><span>Civic India</span></Link>
        <div className="app-header-right">
          <Link className="button button-quiet" href="/dashboard">Dashboard</Link>
          <SignOutButton />
        </div>
      </header>
      <section className="app-content">
        <p className="eyebrow">YOUR FOLLOW LIST</p>
        <h1>Choose who to follow.</h1>
        <p className="app-lead">Start with the institutions you care about. Updates will appear here as official sources are connected.</p>

        <section className="panel">
          <h2>Institutions and public offices</h2>
          <p className="panel-subtitle">Follow or unfollow at any time. Each update will link to its original source.</p>
          {entityRows.length === 0 ? (
            <p className="empty-state">The starter entity list has not been added yet. It will appear here once the database is set up.</p>
          ) : (
            <div className="entity-list">
              {entityRows.map((entity) => (
                <article className="entity-row" key={entity.id}>
                  <span className="entity-avatar" aria-hidden="true">{initials(entity.name)}</span>
                  <div className="entity-copy">
                    <strong>{entity.name}</strong>
                    <span>{entity.description || entity.type[0].toUpperCase() + entity.type.slice(1)} · {entity.slug}</span>
                  </div>
                  <FollowButton entityId={entity.id} isFollowing={entity.followed !== null} />
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
