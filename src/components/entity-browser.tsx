"use client";

import { useMemo, useState } from "react";
import type { FollowPackage } from "@/data/follow-packages";

type EntityRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  aliases: string[];
  followed: boolean;
};

type EntityBrowserProps = {
  entities: EntityRow[];
  packages: FollowPackage[];
};

const stateStructureSlugs = new Set([
  "state-government-structure",
  "state-governor",
  "state-chief-minister-and-council",
  "state-legislature",
  "state-departments",
  "state-public-service-commissions",
  "state-election-commissions",
]);

const territoryStructureSlugs = new Set([
  "ut-government-structure",
  "ut-administrator",
  "ut-legislature",
  "ut-departments",
]);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const labelType = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1);

export function EntityBrowser({
  entities: initialEntities,
  packages,
}: EntityBrowserProps) {
  const [entities, setEntities] = useState(initialEntities);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [followFilter, setFollowFilter] = useState("all");
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entityBySlug = useMemo(
    () => new Map(entities.map((entity) => [entity.slug, entity])),
    [entities],
  );
  const types = useMemo(
    () => [...new Set(entities.map((entity) => entity.type))].sort(),
    [entities],
  );
  const states = useMemo(
    () =>
      packages
        .filter((item) => item.id.startsWith("state-"))
        .map((item) => entityBySlug.get(item.entitySlugs[0]))
        .filter((entity): entity is EntityRow => Boolean(entity))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entityBySlug, packages],
  );
  const territories = useMemo(
    () =>
      packages
        .filter((item) => item.id.startsWith("territory-"))
        .map((item) => entityBySlug.get(item.entitySlugs[0]))
        .filter((entity): entity is EntityRow => Boolean(entity))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entityBySlug, packages],
  );

  const filteredEntities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return entities.filter((entity) => {
      if (
        normalizedQuery &&
        ![
          entity.name,
          entity.slug,
          entity.type,
          entity.description ?? "",
          ...entity.aliases,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      )
        return false;
      if (typeFilter !== "all" && entity.type !== typeFilter) return false;
      if (followFilter === "following" && !entity.followed) return false;
      if (followFilter === "not-following" && entity.followed) return false;
      if (jurisdictionFilter !== "all") {
        const isState = jurisdictionFilter.startsWith("state-");
        const sharedStructure = isState
          ? stateStructureSlugs.has(entity.slug)
          : territoryStructureSlugs.has(entity.slug);
        if (entity.slug !== jurisdictionFilter && !sharedStructure)
          return false;
      }
      return true;
    });
  }, [entities, followFilter, jurisdictionFilter, query, typeFilter]);

  const visiblePackages = showAllPackages
    ? packages
    : packages.filter((item) => item.featured);

  async function updateFollow(entityId: string, following: boolean) {
    setPendingId(entityId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/follows", {
        method: following ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not update your follows.");
        return;
      }
      setEntities((current) =>
        current.map((entity) =>
          entity.id === entityId ? { ...entity, followed: following } : entity,
        ),
      );
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function followPackage(item: FollowPackage) {
    const available = [...new Set(item.entitySlugs)]
      .map((slug) => entityBySlug.get(slug))
      .filter((entity): entity is EntityRow => Boolean(entity));
    const toFollow = available.filter((entity) => !entity.followed);
    if (!toFollow.length) return;

    setPendingId(item.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityIds: toFollow.map((entity) => entity.id),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(
          payload.error ?? `Could not follow the ${item.title} package.`,
        );
        return;
      }
      const followedIds = new Set(toFollow.map((entity) => entity.id));
      setEntities((current) =>
        current.map((entity) =>
          followedIds.has(entity.id) ? { ...entity, followed: true } : entity,
        ),
      );
      setMessage(
        `Added ${toFollow.length} ${toFollow.length === 1 ? "institution" : "institutions"} from ${item.title}.`,
      );
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <section
        className="panel follow-packages-panel"
        aria-labelledby="follow-packages-heading"
      >
        <div className="follow-section-heading">
          <div>
            <p className="eyebrow">START WITH A KIT</p>
            <h2 id="follow-packages-heading">Follow packages</h2>
          </div>
          <span className="follow-package-count">
            {packages.length} packages
          </span>
        </div>
        <p className="panel-subtitle">
          Choose a set of institutions to follow together. You can change your
          follows at any time.
        </p>
        <div className="follow-package-grid">
          {visiblePackages.map((item) => {
            const available = [...new Set(item.entitySlugs)]
              .map((slug) => entityBySlug.get(slug))
              .filter((entity): entity is EntityRow => Boolean(entity));
            const remaining = available.filter(
              (entity) => !entity.followed,
            ).length;
            const unavailable = available.length === 0;
            const isPending = pendingId === item.id;
            return (
              <article className="follow-package-card" key={item.id}>
                <div className="follow-package-topline">
                  <span className="follow-package-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="follow-package-size">
                    {available.length} entities
                  </span>
                </div>
                <div className="follow-package-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <button
                  className={`button follow-package-action ${remaining ? "button-dark" : "button-quiet"}`}
                  type="button"
                  onClick={() => void followPackage(item)}
                  disabled={Boolean(pendingId) || remaining === 0}
                  aria-label={
                    unavailable
                      ? `${item.title} entities are not available yet`
                      : remaining
                        ? `Follow ${remaining} remaining entities in ${item.title}`
                        : `Already following all entities in ${item.title}`
                  }
                >
                  {isPending
                    ? "Adding…"
                    : unavailable
                      ? "Coming soon"
                      : remaining
                        ? `Follow ${remaining} remaining`
                        : "Following all ✓"}
                </button>
              </article>
            );
          })}
        </div>
        {packages.length > 5 && (
          <button
            className="follow-packages-toggle"
            type="button"
            aria-expanded={showAllPackages}
            onClick={() => setShowAllPackages((shown) => !shown)}
          >
            {showAllPackages
              ? "Show the 5 featured packages"
              : `Explore more packages (${packages.length - 5} more)`}
            <span aria-hidden="true">{showAllPackages ? "↑" : "↓"}</span>
          </button>
        )}
      </section>

      <section
        className="panel entity-browser-panel"
        aria-labelledby="entity-browser-heading"
      >
        <div className="follow-section-heading">
          <div>
            <p className="eyebrow">BROWSE INDIVIDUALLY</p>
            <h2 id="entity-browser-heading">Institutions and public offices</h2>
          </div>
          <span className="follow-package-count">
            {filteredEntities.length} of {entities.length}
          </span>
        </div>
        <p className="panel-subtitle">
          Search names and aliases, then narrow by jurisdiction, entity type or
          your current follows.
        </p>

        <div
          className="entity-filters"
          role="search"
          aria-label="Find institutions to follow"
        >
          <label className="feed-filter-field entity-search-field">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search institutions or aliases"
            />
          </label>
          <label className="feed-filter-field">
            State or Union Territory
            <select
              value={jurisdictionFilter}
              onChange={(event) => setJurisdictionFilter(event.target.value)}
            >
              <option value="all">All jurisdictions</option>
              <optgroup label="States">
                {states.map((state) => (
                  <option value={state.slug} key={state.id}>
                    {state.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Union Territories">
                {territories.map((territory) => (
                  <option value={territory.slug} key={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="feed-filter-field">
            Entity type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              {types.map((type) => (
                <option value={type} key={type}>
                  {labelType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="feed-filter-field">
            Follow status
            <select
              value={followFilter}
              onChange={(event) => setFollowFilter(event.target.value)}
            >
              <option value="all">All institutions</option>
              <option value="following">Following</option>
              <option value="not-following">Not following</option>
            </select>
          </label>
        </div>
        {jurisdictionFilter !== "all" && (
          <p className="entity-filter-note">
            Showing the selected jurisdiction and shared{" "}
            {jurisdictionFilter.startsWith("state-")
              ? "State"
              : "Union Territory"}{" "}
            institution categories.
          </p>
        )}
        {error && (
          <p className="form-message entity-feedback" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="entity-success entity-feedback" role="status">
            {message}
          </p>
        )}

        {filteredEntities.length === 0 ? (
          <p className="empty-state">
            No institutions match these filters. Try a broader search or clear a
            filter.
          </p>
        ) : (
          <div className="entity-list">
            {filteredEntities.map((entity) => (
              <article className="entity-row" key={entity.id}>
                <span className="entity-avatar" aria-hidden="true">
                  {initials(entity.name)}
                </span>
                <div className="entity-copy">
                  <strong>{entity.name}</strong>
                  <span>
                    {entity.description
                      ? `${entity.description} · ${labelType(entity.type)}`
                      : labelType(entity.type)}
                  </span>
                </div>
                <button
                  className={`button entity-action ${entity.followed ? "button-quiet" : "button-dark"}`}
                  type="button"
                  onClick={() => void updateFollow(entity.id, !entity.followed)}
                  disabled={Boolean(pendingId)}
                >
                  {pendingId === entity.id
                    ? "Saving…"
                    : entity.followed
                      ? "Following ✓"
                      : "+ Follow"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
