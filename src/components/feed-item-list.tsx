"use client";

import { useState } from "react";
import Link from "next/link";
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
  clearFiltersHref: string;
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
  clearFiltersHref,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
          {!hasMore && (
            <Link className="button button-dark" href={clearFiltersHref}>
              Clear filters
            </Link>
          )}
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
