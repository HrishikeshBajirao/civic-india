import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EntityBrowser } from "@/components/entity-browser";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { entities, userFollows } from "@/db/schema";
import { auth } from "@/lib/auth";
import { followPackages } from "@/data/follow-packages";
import { institutionById, institutionMap } from "@/data/institution-map";

type EntityScope = "union" | "state" | "territory" | "local" | "other";

function entityScope(name: string): EntityScope {
  const institution = institutionMap.find(
    (item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  const ancestorIds = new Set<string>();
  let current = institution;
  while (current) {
    ancestorIds.add(current.id);
    current = current.parentId
      ? institutionById.get(current.parentId)
      : undefined;
  }

  if (
    ancestorIds.has("local-self-government") ||
    ancestorIds.has("rural-local-government") ||
    ancestorIds.has("urban-local-government")
  )
    return "local";
  if (
    ancestorIds.has("union-territories") ||
    ancestorIds.has("ut-government-structure")
  )
    return "territory";
  if (
    ancestorIds.has("states-of-india") ||
    ancestorIds.has("state-government-structure") ||
    institution?.kind === "state"
  )
    return "state";
  if (
    ancestorIds.has("union-government") ||
    ancestorIds.has("union-executive") ||
    ancestorIds.has("union-ministries") ||
    ancestorIds.has("union-legislature")
  )
    return "union";
  return "other";
}

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
      <SiteHeader />
      <section className="app-content app-content-wide">
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
            scope: entityScope(entity.name),
          }))}
          packages={followPackages}
        />
      </section>
    </main>
  );
}
