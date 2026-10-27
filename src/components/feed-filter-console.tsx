"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { activityCategories } from "@/lib/activity-categories";
import type { FeedPageData, FollowedEntity } from "@/lib/feed-data";

type Props = {
  followedEntities: FollowedEntity[];
  filters: FeedPageData["filters"];
};

const documentTypes = [
  "press_release",
  "notice",
  "report",
  "speech",
  "order",
  "other",
] as const;

const relationOptions = [
  { id: "issuer", label: "Issued by the entity" },
  { id: "about", label: "About the entity" },
  { id: "mentions", label: "Mentions the entity" },
] as const;

function selectedCount(count: number) {
  return count > 0 ? ` · ${count} selected` : " · all";
}

export function FeedFilterConsole({ followedEntities, filters }: Props) {
  const router = useRouter();

  function applyOnChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) ||
      target.dataset.applyOnChange !== "true"
    ) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      query.append(key, String(value));
    }
    const queryString = query.toString();
    router.push(queryString ? `/feed?${queryString}` : "/feed", {
      scroll: false,
    });
  }

  return (
    <form
      className="filter-console feed-filter-console"
      method="get"
      action="/feed"
      onChange={applyOnChange}
    >
      <input type="hidden" name="view" value={filters.view} />
      <div className="filter-console-heading">
        <p className="eyebrow">FILTER CONSOLE</p>
        <h2>Refine your feed</h2>
        <p>Choose any combination. Click an option to update the feed.</p>
      </div>

      <label className="feed-filter-field">
        Search documents
        <input
          type="search"
          name="q"
          defaultValue={filters.searchTerm}
          maxLength={120}
          placeholder="Title, text, source or entity"
        />
      </label>
      <p className="filter-console-note feed-search-note">
        Searches titles, summaries, full text, source details, and linked entity
        names when that text is available. Press Enter or Apply search.
      </p>

      <details
        className="feed-filter-group"
        open={filters.entityIds.length > 0}
      >
        <summary>Entities{selectedCount(filters.entityIds.length)}</summary>
        <p className="feed-filter-group-note">
          No selection includes all followed entities.
        </p>
        <div className="feed-filter-options feed-filter-entity-options">
          {followedEntities.map((entity) => (
            <label className="feed-filter-option" key={entity.id}>
              <input
                type="checkbox"
                name="entity"
                value={entity.id}
                defaultChecked={filters.entityIds.includes(entity.id)}
                data-apply-on-change="true"
                disabled={followedEntities.length === 0}
              />
              <span>{entity.name}</span>
            </label>
          ))}
          {followedEntities.length === 0 && (
            <p className="feed-filter-group-note">
              Follow an entity to filter your feed by it.
            </p>
          )}
        </div>
      </details>

      <details
        className="feed-filter-group"
        open={filters.activities.length > 0 || undefined}
      >
        <summary>Activity{selectedCount(filters.activities.length)}</summary>
        <div className="feed-filter-options">
          {activityCategories.map((category) => (
            <label className="feed-filter-option" key={category.id}>
              <input
                type="checkbox"
                name="activity"
                value={category.id}
                defaultChecked={filters.activities.includes(category.id)}
                data-apply-on-change="true"
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      </details>

      <details
        className="feed-filter-group"
        open={filters.documentTypes.length > 0 || undefined}
      >
        <summary>
          Official document type{selectedCount(filters.documentTypes.length)}
        </summary>
        <div className="feed-filter-options">
          {documentTypes.map((type) => (
            <label className="feed-filter-option" key={type}>
              <input
                type="checkbox"
                name="documentType"
                value={type}
                defaultChecked={filters.documentTypes.includes(type)}
                data-apply-on-change="true"
              />
              <span>{type.replaceAll("_", " ")}</span>
            </label>
          ))}
        </div>
      </details>

      <details
        className="feed-filter-group"
        open={filters.relations.length > 0 || undefined}
      >
        <summary>
          Entity connection{selectedCount(filters.relations.length)}
        </summary>
        <div className="feed-filter-options">
          {relationOptions.map((relation) => (
            <label className="feed-filter-option" key={relation.id}>
              <input
                type="checkbox"
                name="relation"
                value={relation.id}
                defaultChecked={filters.relations.includes(relation.id)}
                data-apply-on-change="true"
              />
              <span>{relation.label}</span>
            </label>
          ))}
        </div>
      </details>

      <div className="feed-filter-date-pair">
        <label className="feed-filter-field">
          From
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            data-apply-on-change="true"
          />
        </label>
        <label className="feed-filter-field">
          To
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            data-apply-on-change="true"
          />
        </label>
      </div>

      <label className="feed-filter-field">
        Sort updates
        <select
          name="sort"
          defaultValue={filters.sort}
          data-apply-on-change="true"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A to Z</option>
        </select>
      </label>

      <p className="filter-console-note">
        Activity labels are suggested from document titles and summaries. A
        publication can match several activities.
      </p>
      <div className="feed-filter-actions">
        <button className="button button-dark" type="submit">
          Apply search
        </button>
      </div>
    </form>
  );
}
