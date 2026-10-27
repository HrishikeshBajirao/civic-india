"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activityCategories } from "@/lib/activity-categories";
import type { FeedItem } from "@/lib/feed-data";

type FeedChunk = {
  items: FeedItem[];
  hasMore: boolean;
  nextOffset: number;
};

type Props = {
  initialItems: FeedItem[];
  hasMore: boolean;
  nextOffset: number;
  query: string;
  view: "grid" | "list";
  removeFiltersHref: string;
  activeFilters: string[];
  sortLabel: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function FeedItemList({
  initialItems,
  hasMore: initialHasMore,
  nextOffset: initialNextOffset,
  query,
  view,
  removeFiltersHref,
  activeFilters,
  sortLabel,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function filterBy(name: "activity" | "documentType", value: string) {
    const params = new URLSearchParams(query);
    const currentValues = params.getAll(name);
    params.delete(name);
    if (currentValues.length !== 1 || currentValues[0] !== value) {
      params.set(name, value);
    }
    router.push(`/feed?${params.toString()}`, { scroll: false });
  }

  async function loadMore() {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(query);
      params.set("offset", String(nextOffset));
      const response = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load more updates.");
      const chunk = (await response.json()) as FeedChunk;
      setItems((current) => [...current, ...chunk.items]);
      setHasMore(chunk.hasMore);
      setNextOffset(chunk.nextOffset);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load more updates.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="feed-active-summary" aria-live="polite">
        <strong className="feed-active-summary-heading">Feed view</strong>
        <span>Sorted by {sortLabel}</span>
        <span>
          {activeFilters.length > 0
            ? `Filters: ${activeFilters.join(" · ")}`
            : "No filters applied"}
        </span>
      </div>
      {activeFilters.length > 0 && (
        <div className="feed-remove-filters">
          <Link className="button button-quiet" href={removeFiltersHref}>
            Remove filters
          </Link>
        </div>
      )}
      {items.length === 0 ? (
        <section className="panel feed-empty">
          <h2>
            {hasMore
              ? "No matches in this batch."
              : "No updates match these filters."}
          </h2>
          <p className="panel-subtitle">
            {hasMore
              ? "Continue loading to look further through your publications."
              : "Try a wider date range or clear the filters to see more updates."}
          </p>
        </section>
      ) : (
        <section
          className={view === "grid" ? "feed-grid" : "feed-list"}
          aria-label="Updates from followed entities"
        >
          {items.map((item) => {
            const timestamp = item.publishedAt ?? item.firstSeenAt;
            return (
              <article className="feed-card" key={item.id}>
                <time className="feed-card-date" dateTime={timestamp}>
                  {item.publishedAt ? "Published" : "Collected"}{" "}
                  {formatDate(timestamp)}
                </time>
                <div className="feed-card-tags">
                  <button
                    className="feed-card-tag feed-card-tag-button"
                    type="button"
                    aria-label={`Filter by document type: ${item.type.replaceAll("_", " ")}`}
                    onClick={() => filterBy("documentType", item.type)}
                  >
                    {item.type.replaceAll("_", " ")}
                  </button>
                  {item.categories.slice(0, 2).map((categoryId) => {
                    const category = activityCategories.find(
                      (candidate) => candidate.id === categoryId,
                    );
                    return category ? (
                      <button
                        className="feed-card-tag feed-card-tag-button"
                        key={categoryId}
                        type="button"
                        aria-label={`Filter by activity: ${category.label}`}
                        onClick={() => filterBy("activity", categoryId)}
                      >
                        {category.label}
                      </button>
                    ) : null;
                  })}
                </div>
                <h2>{item.title}</h2>
                {item.excerpt && (
                  <p className="feed-card-excerpt">{item.excerpt}</p>
                )}
                <div className="feed-card-publisher">
                  <span>Publishing entity</span>
                  <strong>{item.publishingEntities.join(", ")}</strong>
                </div>
                {item.source ? (
                  <a
                    className="feed-card-source"
                    href={item.source.url}
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

      {error && (
        <p className="feed-filter-error" role="alert">
          {error}
        </p>
      )}
      {hasMore ? (
        <div className="feed-load-more">
          <button
            className="button button-quiet"
            type="button"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading updates…" : "Load more updates"}
          </button>
          <span>{items.length} shown</span>
        </div>
      ) : (
        items.length > 0 && (
          <p className="feed-end-note">
            You’re all caught up. {items.length} updates shown.
          </p>
        )
      )}
    </>
  );
}
