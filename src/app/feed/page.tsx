import Link from "next/link";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
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

type FeedItem = {
  id: string;
  title: string;
  publishedAt: Date | null;
  firstSeenAt: Date;
  publishingEntities: Map<string, string>;
  sources: Map<string, { name: string; url: string }>;
};

type FeedSearchParams = {
  entity?: string | string[];
  from?: string | string[];
  to?: string | string[];
  sort?: string | string[];
  view?: string | string[];
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
  return new Date(`${value}T00:00:00+05:30`);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login?next=/feed");

  const params = await searchParams;
  const requestedEntityId = singleParam(params.entity);
  const requestedFrom = singleParam(params.from);
  const requestedTo = singleParam(params.to);
  const sort = singleParam(params.sort) === "oldest" ? "oldest" : "newest";
  const view = singleParam(params.view) === "list" ? "list" : "grid";

  const followedEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .innerJoin(userFollows, eq(userFollows.entityId, entities.id))
    .where(
      and(eq(userFollows.userId, current.user.id), eq(entities.active, true)),
    )
    .orderBy(asc(entities.name));

  const selectedEntityId = followedEntities.some(
    (entity) => entity.id === requestedEntityId,
  )
    ? requestedEntityId
    : "";
  const fromDate = parseDateInput(requestedFrom);
  const toDate = parseDateInput(requestedTo);
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const dateFields = sql<Date>`coalesce(${documents.publishedAt}, ${documents.firstSeenAt})`;
  const filters = [eq(entities.active, true)];

  if (selectedEntityId)
    filters.push(eq(documentEntities.entityId, selectedEntityId));
  if (fromDate && !invalidDateRange) filters.push(gte(dateFields, fromDate));
  if (toDate && !invalidDateRange) {
    filters.push(
      lt(dateFields, new Date(toDate.getTime() + 24 * 60 * 60 * 1000)),
    );
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      publishedAt: documents.publishedAt,
      firstSeenAt: documents.firstSeenAt,
      entityId: entities.id,
      entityName: entities.name,
      relation: documentEntities.relation,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceUrl: documentSources.sourceUrl,
    })
    .from(documents)
    .innerJoin(documentEntities, eq(documentEntities.documentId, documents.id))
    .innerJoin(entities, eq(entities.id, documentEntities.entityId))
    .innerJoin(
      userFollows,
      and(
        eq(userFollows.entityId, documentEntities.entityId),
        eq(userFollows.userId, current.user.id),
      ),
    )
    .leftJoin(documentSources, eq(documentSources.documentId, documents.id))
    .leftJoin(sources, eq(sources.id, documentSources.sourceId))
    .where(and(...filters))
    .orderBy(sort === "oldest" ? asc(dateFields) : desc(dateFields))
    .limit(300);

  function viewHref(nextView: "grid" | "list") {
    const query = new URLSearchParams();
    if (selectedEntityId) query.set("entity", selectedEntityId);
    if (fromDate && requestedFrom) query.set("from", requestedFrom);
    if (toDate && requestedTo) query.set("to", requestedTo);
    query.set("sort", sort);
    query.set("view", nextView);
    return `/feed?${query.toString()}`;
  }
  const clearFiltersHref = view === "list" ? "/feed?view=list" : "/feed";

  const feedItems = new Map<string, FeedItem>();
  for (const row of rows) {
    let item = feedItems.get(row.id);
    if (!item) {
      item = {
        id: row.id,
        title: row.title,
        publishedAt: row.publishedAt,
        firstSeenAt: row.firstSeenAt,
        publishingEntities: new Map(),
        sources: new Map(),
      };
      feedItems.set(row.id, item);
    }
    if (row.relation === "issuer")
      item.publishingEntities.set(row.entityId, row.entityName);
    if (row.sourceId && row.sourceName && row.sourceUrl) {
      item.sources.set(row.sourceId, {
        name: row.sourceName,
        url: row.sourceUrl,
      });
    }
  }

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
          <Link className="button button-quiet" href="/entities">
            Manage follows
          </Link>
          <SignOutButton />
        </div>
      </header>
      <section className="app-content">
        <p className="eyebrow">YOUR CIVIC INDIA</p>
        <h1>Your updates.</h1>
        <p className="app-lead">
          Official updates linked to the public institutions you follow.
        </p>

        <form className="feed-filters" method="get" action="/feed">
          <input type="hidden" name="view" value={view} />
          <label className="feed-filter-field">
            <span>Entity</span>
            <select
              name="entity"
              defaultValue={selectedEntityId}
              disabled={followedEntities.length === 0}
            >
              <option value="">All followed entities</option>
              {followedEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
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
            <Link className="button button-quiet" href={clearFiltersHref}>
              Clear
            </Link>
          </div>
        </form>
        {invalidDateRange && (
          <p className="feed-filter-error" role="alert">
            The start date must be on or before the end date.
          </p>
        )}
        <div className="feed-toolbar">
          <p className="feed-count">
            {feedItems.size} {feedItems.size === 1 ? "update" : "updates"} ·{" "}
            {sort === "newest" ? "Newest" : "Oldest"} first
          </p>
          <nav className="feed-view-toggle" aria-label="Feed layout">
            <Link
              className={view === "grid" ? "is-active" : ""}
              href={viewHref("grid")}
              aria-current={view === "grid" ? "page" : undefined}
            >
              Grid
            </Link>
            <Link
              className={view === "list" ? "is-active" : ""}
              href={viewHref("list")}
              aria-current={view === "list" ? "page" : undefined}
            >
              List
            </Link>
          </nav>
        </div>

        {feedItems.size === 0 ? (
          <section className="panel">
            {followedEntities.length === 0 ? (
              <>
                <h2>Your feed is ready for updates.</h2>
                <p className="panel-subtitle">
                  Follow an institution to see its linked releases here. Updates
                  will appear after a connected source is synced.
                </p>
                <Link className="button button-dark" href="/entities">
                  Manage follows <span aria-hidden="true">→</span>
                </Link>
              </>
            ) : (
              <>
                <h2>No updates match these filters.</h2>
                <p className="panel-subtitle">
                  Try a wider date range or clear the filters to see more
                  updates.
                </p>
                <Link className="button button-dark" href={clearFiltersHref}>
                  Clear filters
                </Link>
              </>
            )}
          </section>
        ) : (
          <section
            className={view === "grid" ? "feed-grid" : "feed-list"}
            aria-label="Updates from followed entities"
          >
            {[...feedItems.values()].map((item) => {
              const published = item.publishedAt;
              const timestamp = published ?? item.firstSeenAt;
              const source = item.sources.values().next().value;
              const publishers =
                item.publishingEntities.size > 0
                  ? [...item.publishingEntities.values()]
                  : source
                    ? [source.name.split(" — ")[0]]
                    : ["Official publication"];
              return (
                <article className="feed-card" key={item.id}>
                  <time
                    className="feed-card-date"
                    dateTime={timestamp.toISOString()}
                  >
                    {published ? "Published" : "Collected"}{" "}
                    {formatDate(timestamp)}
                  </time>
                  <h2>{item.title}</h2>
                  <div className="feed-card-publisher">
                    <span>Publishing entity</span>
                    <strong>{publishers.join(", ")}</strong>
                  </div>
                  {source ? (
                    <a
                      className="feed-card-source"
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open direct source <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="feed-card-source feed-card-source-unavailable">
                      Source link unavailable
                    </span>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
