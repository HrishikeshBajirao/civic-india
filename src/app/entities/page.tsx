import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EntityBrowser } from "@/components/entity-browser";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import {
  documentEntities,
  documentSources,
  documents,
  entities,
  sources,
  userFollows,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { followPackages } from "@/data/follow-packages";
import { institutionById, institutionMap } from "@/data/institution-map";
import { buildDocumentTextSearch } from "@/lib/document-search";

type EntityScope = "union" | "state" | "territory" | "local" | "other";

type PublicationSearchResult = {
  id: string;
  title: string;
  type: string;
  excerpt: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  entities: Map<string, { name: string; slug: string }>;
  sources: Map<string, { name: string; url: string }>;
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

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

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login?next=/entities");

  const params = await searchParams;
  const searchTerm = singleParam(params.q)?.trim().slice(0, 120) ?? "";
  const textSearch = searchTerm
    ? buildDocumentTextSearch(searchTerm)
    : undefined;
  const publicationRows = textSearch
    ? await db
        .select({
          id: documents.id,
          title: documents.title,
          type: documents.type,
          excerpt: documents.excerpt,
          publishedAt: documents.publishedAt,
          firstSeenAt: documents.firstSeenAt,
          entityId: entities.id,
          entityName: entities.name,
          entitySlug: entities.slug,
          sourceId: sources.id,
          sourceName: sources.name,
          sourceUrl: documentSources.sourceUrl,
        })
        .from(documents)
        .innerJoin(
          documentEntities,
          eq(documentEntities.documentId, documents.id),
        )
        .innerJoin(entities, eq(entities.id, documentEntities.entityId))
        .leftJoin(documentSources, eq(documentSources.documentId, documents.id))
        .leftJoin(sources, eq(sources.id, documentSources.sourceId))
        .where(and(eq(entities.active, true), textSearch))
        .orderBy(
          desc(
            sql.raw(
              "coalesce(documents.published_at, documents.first_seen_at)",
            ),
          ),
        )
        .limit(300)
    : [];

  const publicationResults = new Map<string, PublicationSearchResult>();
  for (const row of publicationRows) {
    let result = publicationResults.get(row.id);
    if (!result) {
      result = {
        id: row.id,
        title: row.title,
        type: row.type,
        excerpt: row.excerpt,
        publishedAt: row.publishedAt,
        firstSeenAt: row.firstSeenAt,
        entities: new Map(),
        sources: new Map(),
      };
      publicationResults.set(row.id, result);
    }
    result.entities.set(row.entityId, {
      name: row.entityName,
      slug: row.entitySlug,
    });
    if (row.sourceId && row.sourceName && row.sourceUrl) {
      result.sources.set(row.sourceId, {
        name: row.sourceName,
        url: row.sourceUrl,
      });
    }
  }

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
        <form
          className="entity-publication-search"
          method="get"
          action="/entities"
          role="search"
        >
          <label className="feed-filter-field">
            Search publications across all entities
            <input
              type="search"
              name="q"
              defaultValue={searchTerm}
              maxLength={120}
              placeholder="Search titles, document text, sources..."
            />
          </label>
          <button className="button button-dark" type="submit">
            Search
          </button>
          <p className="entity-publication-search-note">
            Searches available document text and source details across all
            entities. You do not need to follow an entity first.
          </p>
        </form>
        {searchTerm && (
          <section
            className="entity-search-results"
            aria-labelledby="entity-search-results-heading"
          >
            <div className="entity-search-results-heading">
              <div>
                <p className="eyebrow">PUBLICATIONS FROM ALL ENTITIES</p>
                <h2 id="entity-search-results-heading">
                  Results for &ldquo;{searchTerm}&rdquo;
                </h2>
              </div>
              <p className="feed-count">
                {publicationResults.size}{" "}
                {publicationResults.size === 1 ? "result" : "results"}
              </p>
            </div>
            {publicationResults.size === 0 ? (
              <section className="panel entity-search-empty">
                <h2>No publications matched that search.</h2>
                <p className="panel-subtitle">
                  Try a different keyword or a shorter phrase.
                </p>
              </section>
            ) : (
              <div className="entity-search-result-list">
                {[...publicationResults.values()].map((result) => {
                  const timestamp = result.publishedAt ?? result.firstSeenAt;
                  const firstSource = result.sources.values().next().value;
                  return (
                    <article className="entity-search-result" key={result.id}>
                      <div className="entity-search-result-meta">
                        <time dateTime={timestamp.toISOString()}>
                          {result.publishedAt ? "Published" : "Collected"}{" "}
                          {formatDate(timestamp)}
                        </time>
                        <span>{result.type.replaceAll("_", " ")}</span>
                      </div>
                      <h3>{result.title}</h3>
                      {result.excerpt && <p>{result.excerpt}</p>}
                      <div className="entity-search-result-entities">
                        <span>Linked entities</span>
                        {[...result.entities.values()].map((entity) => (
                          <Link
                            href={"/entities/" + entity.slug}
                            key={entity.slug}
                          >
                            {entity.name}
                          </Link>
                        ))}
                      </div>
                      {firstSource && (
                        <a
                          className="feed-card-source"
                          href={firstSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {firstSource.name} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
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
