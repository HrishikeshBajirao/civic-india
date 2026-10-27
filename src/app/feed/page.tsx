import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FeedFilterConsole } from "@/components/feed-filter-console";
import { FeedItemList } from "@/components/feed-item-list";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { getFeedPage, type FeedSearchParams } from "@/lib/feed-data";

function buildFeedQuery(
  filters: Awaited<ReturnType<typeof getFeedPage>>["filters"],
  view = filters.view,
) {
  const query = new URLSearchParams();
  for (const entityId of filters.entityIds) query.append("entity", entityId);
  if (filters.searchTerm) query.set("q", filters.searchTerm);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  for (const activity of filters.activities) query.append("activity", activity);
  for (const type of filters.documentTypes) query.append("documentType", type);
  for (const relation of filters.relations) query.append("relation", relation);
  query.set("sort", filters.sort);
  query.set("view", view);
  return query.toString();
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login?next=/feed");

  const params = await searchParams;
  const feed = await getFeedPage(current.user.id, params);
  const { filters, followedEntities } = feed;
  const query = buildFeedQuery(filters);
  const clearFiltersHref =
    filters.view === "list" ? "/feed?view=list" : "/feed";

  function viewHref(view: "grid" | "list") {
    return "/feed?" + buildFeedQuery(filters, view);
  }

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
          <FeedFilterConsole
            key={query}
            followedEntities={followedEntities}
            filters={filters}
          />

          <div className="feed-results">
            {filters.invalidDateRange && (
              <p className="feed-filter-error" role="alert">
                The start date must be on or before the end date.
              </p>
            )}
            <div className="feed-toolbar">
              <p className="feed-count">
                {filters.sort === "newest"
                  ? "Newest first"
                  : filters.sort === "oldest"
                    ? "Oldest first"
                    : "Title A to Z"}
              </p>
              <nav className="feed-view-toggle" aria-label="Feed layout">
                <Link
                  className={filters.view === "grid" ? "is-active" : ""}
                  href={viewHref("grid")}
                  aria-current={filters.view === "grid" ? "page" : undefined}
                >
                  Grid
                </Link>
                <Link
                  className={filters.view === "list" ? "is-active" : ""}
                  href={viewHref("list")}
                  aria-current={filters.view === "list" ? "page" : undefined}
                >
                  List
                </Link>
              </nav>
            </div>

            {followedEntities.length === 0 ? (
              <section className="panel feed-empty">
                <h2>Your feed is ready for updates.</h2>
                <p className="panel-subtitle">
                  Follow an institution to see its linked releases here. Updates
                  appear as connected official sources are synced.
                </p>
                <Link className="button button-dark" href="/entities">
                  Browse entities <span aria-hidden="true">→</span>
                </Link>
              </section>
            ) : (
              <FeedItemList
                key={query}
                initialItems={feed.items}
                hasMore={feed.hasMore}
                nextOffset={feed.nextOffset}
                query={query}
                view={filters.view}
                clearFiltersHref={clearFiltersHref}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
