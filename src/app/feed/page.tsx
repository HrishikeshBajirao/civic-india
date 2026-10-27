import Link from "next/link";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
import {
  activityCategories,
  classifyActivity,
  type ActivityCategoryId,
} from "@/lib/activity-categories";
import { buildDocumentTextSearch } from "@/lib/document-search";

const documentTypes = [
  "press_release",
  "notice",
  "report",
  "speech",
  "order",
  "other",
] as const;
const relationTypes = ["issuer", "about", "mentions"] as const;

type FeedItem = {
  id: string;
  title: string;
  type: string;
  excerpt: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  publishingEntities: Map<string, string>;
  sources: Map<string, { name: string; url: string }>;
  categories: ActivityCategoryId[];
};

type FeedSearchParams = {
  entity?: string | string[];
  q?: string | string[];
  from?: string | string[];
  to?: string | string[];
  sort?: string | string[];
  view?: string | string[];
  activity?: string | string[];
  documentType?: string | string[];
  relation?: string | string[];
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
  const requestedQuery = singleParam(params.q);
  const requestedFrom = singleParam(params.from);
  const requestedTo = singleParam(params.to);
  const requestedActivity = singleParam(params.activity);
  const requestedDocumentType = singleParam(params.documentType);
  const requestedRelation = singleParam(params.relation);
  const requestedSort = singleParam(params.sort);
  const sort =
    requestedSort === "oldest" || requestedSort === "title"
      ? requestedSort
      : "newest";
  const searchTerm = requestedQuery?.trim().slice(0, 120) ?? "";
  const view = singleParam(params.view) === "list" ? "list" : "grid";
  const selectedActivity = activityCategories.some(
    (category) => category.id === requestedActivity,
  )
    ? (requestedActivity as ActivityCategoryId)
    : "";
  const selectedDocumentType = documentTypes.includes(
    requestedDocumentType as (typeof documentTypes)[number],
  )
    ? requestedDocumentType
    : "";
  const selectedRelation = relationTypes.includes(
    requestedRelation as (typeof relationTypes)[number],
  )
    ? requestedRelation
    : "";

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
  if (searchTerm) {
    const textSearch = buildDocumentTextSearch(searchTerm);
    if (textSearch) filters.push(textSearch);
  }
  if (selectedDocumentType)
    filters.push(
      eq(
        documents.type,
        selectedDocumentType as (typeof documentTypes)[number],
      ),
    );
  if (selectedRelation)
    filters.push(
      eq(
        documentEntities.relation,
        selectedRelation as (typeof relationTypes)[number],
      ),
    );
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
      type: documents.type,
      excerpt: documents.excerpt,
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
    .orderBy(
      sort === "oldest"
        ? asc(dateFields)
        : sort === "title"
          ? asc(documents.title)
          : desc(dateFields),
    )
    .limit(300);

  function viewHref(nextView: "grid" | "list") {
    const query = new URLSearchParams();
    if (selectedEntityId) query.set("entity", selectedEntityId);
    if (searchTerm) query.set("q", searchTerm);
    if (fromDate && requestedFrom) query.set("from", requestedFrom);
    if (toDate && requestedTo) query.set("to", requestedTo);
    if (selectedActivity) query.set("activity", selectedActivity);
    if (selectedDocumentType) query.set("documentType", selectedDocumentType);
    if (selectedRelation) query.set("relation", selectedRelation);
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
        type: row.type,
        excerpt: row.excerpt,
        publishedAt: row.publishedAt,
        firstSeenAt: row.firstSeenAt,
        publishingEntities: new Map(),
        sources: new Map(),
        categories: classifyActivity(row.title + " " + (row.excerpt ?? "")),
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
  const visibleFeedItems = [...feedItems.values()]
    .filter(
      (item) => !selectedActivity || item.categories.includes(selectedActivity),
    )
    .sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      const leftDate = left.publishedAt ?? left.firstSeenAt;
      const rightDate = right.publishedAt ?? right.firstSeenAt;
      return sort === "oldest"
        ? leftDate.getTime() - rightDate.getTime()
        : rightDate.getTime() - leftDate.getTime();
    });

  return (
    <main className="app-page">
      <SiteHeader />
      <section className="app-content app-content-wide">
        <p className="eyebrow">YOUR CIVIC INDIA</p>
        <h1>Your updates.</h1>
        <p className="app-lead">
          Official updates linked to the public institutions you follow.
        </p>

        <div className="feed-workspace-layout">
          <form
            className="filter-console feed-filter-console"
            method="get"
            action="/feed"
          >
            <input type="hidden" name="view" value={view} />
            <div className="filter-console-heading">
              <p className="eyebrow">FILTER CONSOLE</p>
              <h2>Refine your feed</h2>
              <p>Filter by institution, connection and update type.</p>
            </div>
            <label className="feed-filter-field">
              Search documents
              <input
                type="search"
                name="q"
                defaultValue={searchTerm}
                maxLength={120}
                placeholder="Title, text, source or entity"
              />
            </label>
            <p className="filter-console-note feed-search-note">
              Searches titles, summaries, full text, source details, and linked
              entity names when that text is available.
            </p>
            <label className="feed-filter-field">
              Entity
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
              Activity
              <select name="activity" defaultValue={selectedActivity}>
                <option value="">All activities</option>
                {activityCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="feed-filter-field">
              Official document type
              <select name="documentType" defaultValue={selectedDocumentType}>
                <option value="">All document types</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="feed-filter-field">
              Entity connection
              <select name="relation" defaultValue={selectedRelation}>
                <option value="">All connections</option>
                <option value="issuer">Issued by the entity</option>
                <option value="about">About the entity</option>
                <option value="mentions">Mentions the entity</option>
              </select>
            </label>
            <div className="feed-filter-date-pair">
              <label className="feed-filter-field">
                From
                <input
                  type="date"
                  name="from"
                  defaultValue={fromDate ? requestedFrom : ""}
                />
              </label>
              <label className="feed-filter-field">
                To
                <input
                  type="date"
                  name="to"
                  defaultValue={toDate ? requestedTo : ""}
                />
              </label>
            </div>
            <label className="feed-filter-field">
              Sort updates
              <select name="sort" defaultValue={sort}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A to Z</option>
              </select>
            </label>
            <p className="filter-console-note">
              Activity labels are suggested from document titles and summaries;
              a document can match more than one.
            </p>
            <div className="feed-filter-actions">
              <button className="button button-dark" type="submit">
                Apply filters
              </button>
              <Link className="button button-quiet" href={clearFiltersHref}>
                Clear
              </Link>
            </div>
          </form>

          <div className="feed-results">
            {invalidDateRange && (
              <p className="feed-filter-error" role="alert">
                The start date must be on or before the end date.
              </p>
            )}
            <div className="feed-toolbar">
              <p className="feed-count">
                {visibleFeedItems.length}{" "}
                {visibleFeedItems.length === 1 ? "update" : "updates"} ·{" "}
                {sort === "newest"
                  ? "Newest first"
                  : sort === "oldest"
                    ? "Oldest first"
                    : "Title A to Z"}
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

            {visibleFeedItems.length === 0 ? (
              <section className="panel feed-empty">
                {followedEntities.length === 0 ? (
                  <>
                    <h2>Your feed is ready for updates.</h2>
                    <p className="panel-subtitle">
                      Follow an institution to see its linked releases here.
                      Updates appear as connected official sources are synced.
                    </p>
                    <Link className="button button-dark" href="/entities">
                      Browse entities <span aria-hidden="true">→</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <h2>No updates match these filters.</h2>
                    <p className="panel-subtitle">
                      Try a wider date range or clear the filters to see more
                      updates.
                    </p>
                    <Link
                      className="button button-dark"
                      href={clearFiltersHref}
                    >
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
                {visibleFeedItems.map((item) => {
                  const timestamp = item.publishedAt ?? item.firstSeenAt;
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
                        {item.publishedAt ? "Published" : "Collected"}{" "}
                        {formatDate(timestamp)}
                      </time>
                      <div className="feed-card-tags">
                        <span className="feed-card-tag">
                          {item.type.replaceAll("_", " ")}
                        </span>
                        {item.categories.slice(0, 2).map((categoryId) => {
                          const category = activityCategories.find(
                            (candidate) => candidate.id === categoryId,
                          );
                          return category ? (
                            <span className="feed-card-tag" key={categoryId}>
                              {category.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <h2>{item.title}</h2>
                      {item.excerpt && (
                        <p className="feed-card-excerpt">{item.excerpt}</p>
                      )}
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
          </div>
        </div>
      </section>
    </main>
  );
}
