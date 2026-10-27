import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  documentEntities,
  documentSources,
  documents,
  entities,
  sources,
  userFollows,
  documentType,
  entityRelation,
} from "@/db/schema";
import {
  activityCategories,
  classifyActivity,
  type ActivityCategoryId,
} from "@/lib/activity-categories";
import { buildDocumentTextSearch } from "@/lib/document-search";

export const feedPageSize = 20;

const documentTypes = documentType.enumValues;
const relationTypes = entityRelation.enumValues;
const activityTypeIds = activityCategories.map((category) => category.id);
const candidateBatchSize = 48;
const maxCandidatesPerRequest = 240;

type DocumentTypeValue = (typeof documentTypes)[number];
type RelationTypeValue = (typeof relationTypes)[number];

export type FeedSearchParams = {
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

export type FeedItem = {
  id: string;
  title: string;
  type: string;
  excerpt: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
  publishingEntities: string[];
  source: { name: string; url: string } | null;
  categories: ActivityCategoryId[];
};

export type FollowedEntity = { id: string; name: string };

export type FeedPageData = {
  followedEntities: FollowedEntity[];
  filters: {
    entityIds: string[];
    searchTerm: string;
    from: string;
    to: string;
    invalidDateRange: boolean;
    activities: ActivityCategoryId[];
    documentTypes: DocumentTypeValue[];
    relations: RelationTypeValue[];
    sort: "newest" | "oldest" | "title";
    view: "grid" | "list";
  };
  items: FeedItem[];
  hasMore: boolean;
  nextOffset: number;
};

function values(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return [...new Set((Array.isArray(value) ? value : [value]).filter(Boolean))];
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

export async function getFeedPage(
  userId: string,
  params: FeedSearchParams,
  requestedOffset = 0,
): Promise<FeedPageData> {
  const followedEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .innerJoin(userFollows, eq(userFollows.entityId, entities.id))
    .where(and(eq(userFollows.userId, userId), eq(entities.active, true)))
    .orderBy(asc(entities.name));

  const followedIds = new Set(followedEntities.map((entity) => entity.id));
  const entityIds = values(params.entity).filter((id) => followedIds.has(id));
  const searchTerm = values(params.q)[0]?.trim().slice(0, 120) ?? "";
  const fromValue = values(params.from)[0] ?? "";
  const toValue = values(params.to)[0] ?? "";
  const fromDate = parseDateInput(fromValue);
  const toDate = parseDateInput(toValue);
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const selectedActivities = values(params.activity).filter((value) =>
    activityTypeIds.includes(value as ActivityCategoryId),
  ) as ActivityCategoryId[];
  const selectedTypes = values(params.documentType).filter((value) =>
    documentTypes.includes(value as DocumentTypeValue),
  ) as DocumentTypeValue[];
  const selectedRelations = values(params.relation).filter((value) =>
    relationTypes.includes(value as RelationTypeValue),
  ) as RelationTypeValue[];
  const requestedSort = values(params.sort)[0];
  const sort =
    requestedSort === "oldest" || requestedSort === "title"
      ? requestedSort
      : "newest";
  const view = values(params.view)[0] === "list" ? "list" : "grid";
  const filters = [eq(entities.active, true), eq(userFollows.userId, userId)];
  const dateFields = sql<Date>`coalesce(${documents.publishedAt}, ${documents.firstSeenAt})`;

  if (entityIds.length > 0)
    filters.push(inArray(documentEntities.entityId, entityIds));
  if (searchTerm) {
    const textSearch = buildDocumentTextSearch(searchTerm);
    if (textSearch) filters.push(textSearch);
  }
  if (selectedTypes.length > 0)
    filters.push(inArray(documents.type, selectedTypes));
  if (selectedRelations.length > 0)
    filters.push(inArray(documentEntities.relation, selectedRelations));
  if (fromDate && !invalidDateRange) filters.push(gte(dateFields, fromDate));
  if (toDate && !invalidDateRange) {
    filters.push(lt(dateFields, new Date(toDate.getTime() + 86400000)));
  }

  const items: FeedItem[] = [];
  let offset = Math.max(0, Math.floor(requestedOffset));
  let hasMore = false;
  let scannedThisRequest = 0;
  const reachedScanLimit = () => scannedThisRequest >= maxCandidatesPerRequest;

  while (items.length < feedPageSize && !reachedScanLimit()) {
    const candidates = await db
      .selectDistinct({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        excerpt: documents.excerpt,
        publishedAt: documents.publishedAt,
        firstSeenAt: documents.firstSeenAt,
        sortDate: dateFields,
      })
      .from(documents)
      .innerJoin(
        documentEntities,
        eq(documentEntities.documentId, documents.id),
      )
      .innerJoin(entities, eq(entities.id, documentEntities.entityId))
      .innerJoin(
        userFollows,
        eq(userFollows.entityId, documentEntities.entityId),
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
        asc(documents.id),
      )
      .limit(candidateBatchSize)
      .offset(offset);

    if (candidates.length === 0) break;

    const details = await db
      .select({
        id: documents.id,
        entityId: entities.id,
        entityName: entities.name,
        relation: documentEntities.relation,
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
      .innerJoin(
        userFollows,
        and(
          eq(userFollows.entityId, documentEntities.entityId),
          eq(userFollows.userId, userId),
        ),
      )
      .leftJoin(documentSources, eq(documentSources.documentId, documents.id))
      .leftJoin(sources, eq(sources.id, documentSources.sourceId))
      .where(
        and(
          inArray(
            documents.id,
            candidates.map((candidate) => candidate.id),
          ),
          eq(entities.active, true),
        ),
      );

    const detailsByDocument = new Map<
      string,
      {
        publishers: Map<string, string>;
        sources: Map<string, { name: string; url: string }>;
      }
    >();
    for (const row of details) {
      let itemDetails = detailsByDocument.get(row.id);
      if (!itemDetails) {
        itemDetails = { publishers: new Map(), sources: new Map() };
        detailsByDocument.set(row.id, itemDetails);
      }
      if (row.relation === "issuer")
        itemDetails.publishers.set(row.entityId, row.entityName);
      if (row.sourceId && row.sourceName && row.sourceUrl) {
        itemDetails.sources.set(row.sourceId, {
          name: row.sourceName,
          url: row.sourceUrl,
        });
      }
    }

    let consumed = 0;
    for (const candidate of candidates) {
      consumed += 1;
      const itemDetails = detailsByDocument.get(candidate.id);
      if (!itemDetails) continue;
      const categories = classifyActivity(
        candidate.title + " " + (candidate.excerpt ?? ""),
      );
      if (
        selectedActivities.length > 0 &&
        !selectedActivities.some((activity) => categories.includes(activity))
      ) {
        continue;
      }
      const source = itemDetails.sources.values().next().value ?? null;
      const publishers = [...itemDetails.publishers.values()];
      if (publishers.length === 0 && source)
        publishers.push(source.name.split(" — ")[0]);
      if (publishers.length === 0) publishers.push("Official publication");
      items.push({
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        excerpt: candidate.excerpt,
        publishedAt: candidate.publishedAt?.toISOString() ?? null,
        firstSeenAt: candidate.firstSeenAt.toISOString(),
        publishingEntities: publishers,
        source,
        categories,
      });
      if (items.length >= feedPageSize) break;
    }

    scannedThisRequest += consumed;
    offset += consumed;
    if (items.length >= feedPageSize) {
      hasMore =
        consumed < candidates.length ||
        candidates.length === candidateBatchSize;
      break;
    }
    if (candidates.length < candidateBatchSize) {
      hasMore = false;
      break;
    }
    hasMore = true;
  }

  return {
    followedEntities,
    filters: {
      entityIds,
      searchTerm,
      from: fromDate ? fromValue : "",
      to: toDate ? toValue : "",
      invalidDateRange,
      activities: selectedActivities,
      documentTypes: selectedTypes,
      relations: selectedRelations,
      sort,
      view,
    },
    items,
    hasMore,
    nextOffset: offset,
  };
}
