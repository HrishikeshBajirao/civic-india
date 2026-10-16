import Link from "next/link";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
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
import {
  institutionById,
  institutionMap,
  institutionRelations,
} from "@/data/institution-map";
import { auth } from "@/lib/auth";

type SearchParams = {
  from?: string | string[];
  to?: string | string[];
  sort?: string | string[];
};

type UpdateItem = {
  id: string;
  title: string;
  type: string;
  excerpt: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  relations: Set<string>;
  sources: Map<string, { name: string; url: string }>;
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(value + "T00:00:00+05:30");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function labelType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function EntityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current)
    redirect("/login?next=" + encodeURIComponent("/entities/" + slug));

  const [entity] = await db
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
      and(
        eq(userFollows.entityId, entities.id),
        eq(userFollows.userId, current.user.id),
      ),
    )
    .where(and(eq(entities.slug, slug), eq(entities.active, true)))
    .limit(1);

  if (!entity) notFound();

  const query = await searchParams;
  const requestedFrom = singleParam(query.from);
  const requestedTo = singleParam(query.to);
  const fromDate = parseDateInput(requestedFrom);
  const toDate = parseDateInput(requestedTo);
  const sort = singleParam(query.sort) === "oldest" ? "oldest" : "newest";
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const dateField = sql<Date>`coalesce(${documents.publishedAt}, ${documents.firstSeenAt})`;
  const filters = [eq(documentEntities.entityId, entity.id)];

  if (fromDate && !invalidDateRange) filters.push(gte(dateField, fromDate));
  if (toDate && !invalidDateRange) {
    filters.push(
      lt(dateField, new Date(toDate.getTime() + 24 * 60 * 60 * 1000)),
    );
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      excerpt: documents.excerpt,
      publishedAt: documents.publishedAt,
      firstSeenAt: documents.firstSeenAt,
      relation: documentEntities.relation,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceUrl: documentSources.sourceUrl,
    })
    .from(documents)
    .innerJoin(documentEntities, eq(documentEntities.documentId, documents.id))
    .leftJoin(documentSources, eq(documentSources.documentId, documents.id))
    .leftJoin(sources, eq(sources.id, documentSources.sourceId))
    .where(and(...filters))
    .orderBy(sort === "oldest" ? asc(dateField) : desc(dateField))
    .limit(100);

  const updates = new Map<string, UpdateItem>();
  for (const row of rows) {
    let update = updates.get(row.id);
    if (!update) {
      update = {
        id: row.id,
        title: row.title,
        type: row.type,
        excerpt: row.excerpt,
        publishedAt: row.publishedAt,
        firstSeenAt: row.firstSeenAt,
        relations: new Set(),
        sources: new Map(),
      };
      updates.set(row.id, update);
    }
    update.relations.add(row.relation);
    if (row.sourceId && row.sourceName && row.sourceUrl) {
      update.sources.set(row.sourceId, {
        name: row.sourceName,
        url: row.sourceUrl,
      });
    }
  }

  const institution = institutionMap.find((item) => item.name === entity.name);
  const connectionPath: typeof institutionMap = [];
  let currentInstitution = institution;
  while (currentInstitution) {
    connectionPath.unshift(currentInstitution);
    currentInstitution = currentInstitution.parentId
      ? institutionById.get(currentInstitution.parentId)
      : undefined;
  }
  const institutionLinks = institution
    ? institutionRelations
        .filter(
          (relation) =>
            relation.from === institution.id || relation.to === institution.id,
        )
        .map((relation) => {
          const outgoing = relation.from === institution.id;
          const relatedInstitution = institutionById.get(
            outgoing ? relation.to : relation.from,
          );
          return relatedInstitution
            ? {
                label: outgoing
                  ? relation.label
                  : (relation.reverseLabel ?? relation.label),
                name: relatedInstitution.name,
              }
            : null;
        })
        .filter((item): item is { label: string; name: string } =>
          Boolean(item),
        )
    : [];

  return (
    <main className="app-page">
      <SiteHeader />

      <section className="app-content entity-profile-content">
        <Link className="entity-profile-back" href="/entities">
          <span aria-hidden="true">←</span> Browse institutions
        </Link>

        <section className="panel entity-profile-hero">
          <div className="entity-profile-heading">
            <div
              className="entity-profile-mark"
              role="img"
              aria-label={entity.name + " monogram"}
            >
              {initials(entity.name)}
            </div>
            <div className="entity-profile-copy">
              <p className="eyebrow">{labelType(entity.type)}</p>
              <h1>{entity.name}</h1>
              <p className="entity-profile-description">
                {entity.description ??
                  "Official updates and information connected to " +
                    entity.name +
                    "."}
              </p>
            </div>
            <div className="entity-profile-follow">
              <FollowButton
                entityId={entity.id}
                isFollowing={entity.followed !== null}
              />
            </div>
          </div>

          <div className="entity-profile-context">
            <div>
              <p className="eyebrow">CONNECTION TO THE REPUBLIC OF INDIA</p>
              {connectionPath.length > 0 ? (
                <ol className="entity-connection-path">
                  {connectionPath.map((item, index) => (
                    <li key={item.id}>
                      <span>{item.name}</span>
                      {index < connectionPath.length - 1 && (
                        <span
                          className="entity-connection-arrow"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="entity-profile-fallback-connection">
                  {entity.slug === "press-information-bureau"
                    ? "A Government of India public information agency."
                    : "A public " +
                      entity.type +
                      " listed within the Republic of India."}
                </p>
              )}
            </div>
            <div className="entity-profile-context-links">
              {institution?.website && (
                <a
                  className="button button-dark"
                  href={institution.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official website <span aria-hidden="true">↗</span>
                </a>
              )}
              <Link className="entity-profile-map-link" href="/institutions">
                Explore the institution map <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          {institutionLinks.length > 0 && (
            <div className="entity-profile-relations">
              <p className="eyebrow">RELATED PUBLIC RESPONSIBILITIES</p>
              <ul>
                {institutionLinks.map((item) => (
                  <li key={item.label + "-" + item.name}>
                    <strong>{item.label}</strong> {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section
          className="entity-profile-updates"
          aria-labelledby="entity-updates-heading"
        >
          <div className="entity-profile-section-heading">
            <div>
              <p className="eyebrow">PUBLIC RECORD</p>
              <h2 id="entity-updates-heading">Updates from {entity.name}</h2>
              <p className="panel-subtitle">
                Browse linked official updates before deciding whether to follow
                this entity.
              </p>
            </div>
            <p className="feed-count">
              {updates.size} {updates.size === 1 ? "update" : "updates"} ·{" "}
              {sort === "newest" ? "Newest" : "Oldest"} first
            </p>
          </div>

          <form
            className="feed-filters entity-profile-filters"
            method="get"
            action={"/entities/" + entity.slug}
          >
            <label className="feed-filter-field">
              <span>From</span>
              <input
                type="date"
                name="from"
                defaultValue={fromDate ? requestedFrom : ""}
              />
            </label>
            <label className="feed-filter-field">
              <span>To</span>
              <input
                type="date"
                name="to"
                defaultValue={toDate ? requestedTo : ""}
              />
            </label>
            <label className="feed-filter-field">
              <span>Sort by</span>
              <select name="sort" defaultValue={sort}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <div className="feed-filter-actions">
              <button className="button button-dark" type="submit">
                Apply
              </button>
              <Link
                className="button button-quiet"
                href={"/entities/" + entity.slug}
              >
                Clear
              </Link>
            </div>
          </form>

          {invalidDateRange && (
            <p className="feed-filter-error" role="alert">
              The start date must be on or before the end date.
            </p>
          )}

          {updates.size === 0 ? (
            <section className="panel entity-profile-empty">
              <h3>No updates are linked yet.</h3>
              <p>
                New items from official sources will appear here when they are
                connected to this entity.
              </p>
              {(fromDate || toDate) && (
                <Link
                  className="button button-quiet"
                  href={"/entities/" + entity.slug}
                >
                  Clear date filters
                </Link>
              )}
            </section>
          ) : (
            <div className="feed-grid entity-profile-feed-grid">
              {[...updates.values()].map((item) => {
                const timestamp = item.publishedAt ?? item.firstSeenAt;
                const itemSources = [...item.sources.values()];
                const label = item.relations.has("issuer")
                  ? "Issued by this entity"
                  : "Linked to this entity";
                return (
                  <article
                    className="feed-card entity-profile-feed-card"
                    key={item.id}
                  >
                    <time
                      className="feed-card-date"
                      dateTime={timestamp.toISOString()}
                    >
                      {item.publishedAt ? "Published" : "Collected"}{" "}
                      {formatDate(timestamp)}
                    </time>
                    <span className="entity-profile-document-type">
                      {labelType(item.type.replaceAll("_", " "))}
                    </span>
                    <h3>{item.title}</h3>
                    <p className="entity-profile-update-relation">{label}</p>
                    {item.excerpt && (
                      <p className="entity-profile-excerpt">{item.excerpt}</p>
                    )}
                    {itemSources.length > 0 ? (
                      <a
                        className="feed-card-source"
                        href={itemSources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {itemSources[0].name} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="feed-card-source feed-card-source-unavailable">
                        Source link unavailable
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
