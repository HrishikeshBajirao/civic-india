import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EntityBrowser } from "@/components/entity-browser";
import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/db";
import { entities, userFollows } from "@/db/schema";
import { auth } from "@/lib/auth";
import { followPackages } from "@/data/follow-packages";

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
      aliases: entities.aliases,
      followed: userFollows.entityId,
    })
    .from(entities)
    .leftJoin(
      userFollows,
      and(
        eq(userFollows.entityId, entities.id),
        eq(userFollows.userId, current.user.id),
      ),
    )
    .where(eq(entities.active, true))
    .orderBy(asc(entities.name));

  return (
    <main className="app-page">
      <header className="site-header app-header">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">CI</span>
          <span>Civic India</span>
        </Link>
        <div className="app-header-right">
          <Link className="button button-quiet" href="/institutions">
            Institutions
          </Link>
          <Link className="button button-quiet" href="/dashboard">
            Dashboard
          </Link>
          <SignOutButton />
        </div>
      </header>
      <section className="app-content">
        <p className="eyebrow">YOUR FOLLOW LIST</p>
        <h1>Choose who to follow.</h1>
        <p className="app-lead">
          Start with the institutions you care about. Updates will appear here
          as official sources are connected.
        </p>
        <EntityBrowser
          entities={entityRows.map((entity) => ({
            ...entity,
            followed: entity.followed !== null,
          }))}
          packages={followPackages}
        />
      </section>
    </main>
  );
}
