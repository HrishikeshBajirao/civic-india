import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Better Auth's core tables. Keep these property names aligned with its default models.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    unique("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const entityType = pgEnum("entity_type", [
  "person",
  "office",
  "institution",
  "legislature",
  "ministry",
  "department",
  "court",
]);

export const documentType = pgEnum("document_type", [
  "press_release",
  "notice",
  "report",
  "speech",
  "order",
  "other",
]);

export const entityRelation = pgEnum("entity_relation", [
  "issuer",
  "about",
  "mentions",
]);
export const eventStatus = pgEnum("event_status", ["draft", "curated"]);
export const ingestionStatus = pgEnum("ingestion_status", [
  "running",
  "succeeded",
  "failed",
]);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: entityType("type").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("entities_active_name_idx").on(table.active, table.name)],
);

export const userFollows = pgTable(
  "user_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.entityId] }),
    index("user_follows_entity_id_idx").on(table.entityId),
  ],
);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  siteUrl: text("site_url").notNull(),
  listingUrl: text("listing_url").notNull(),
  contentScope: text("content_scope").notNull(),
  pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(60),
  enabled: boolean("enabled").notNull().default(false),
  lastSuccessfulRunAt: timestamp("last_successful_run_at", {
    withTimezone: true,
  }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    status: ingestionStatus("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    pagesRead: integer("pages_read").notNull().default(0),
    itemsRead: integer("items_read").notNull().default(0),
    recordsCreated: integer("records_created").notNull().default(0),
    recordsUpdated: integer("records_updated").notNull().default(0),
    adapterVersion: text("adapter_version"),
    errorSummary: text("error_summary"),
    createdAt: createdAt(),
  },
  (table) => [
    index("ingestion_runs_source_started_idx").on(
      table.sourceId,
      table.startedAt,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    type: documentType("type").notNull().default("press_release"),
    body: text("body"),
    excerpt: text("excerpt"),
    language: text("language"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    contentHash: text("content_hash"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("documents_published_at_idx").on(table.publishedAt),
    index("documents_first_seen_at_idx").on(table.firstSeenAt),
  ],
);

export const documentSources = pgTable(
  "document_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url").notNull(),
    sourceItemId: text("source_item_id"),
    sourcePublishedAt: text("source_published_at"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sourceSnapshot: text("source_snapshot"),
    mimeType: text("mime_type"),
    checksum: text("checksum"),
  },
  (table) => [
    uniqueIndex("document_sources_source_url_unique").on(
      table.sourceId,
      table.sourceUrl,
    ),
    uniqueIndex("document_sources_source_item_unique").on(
      table.sourceId,
      table.sourceItemId,
    ),
    index("document_sources_document_id_idx").on(table.documentId),
  ],
);

export const documentEntities = pgTable(
  "document_entities",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    relation: entityRelation("relation").notNull(),
    evidence: text("evidence"),
    confidence: real("confidence"),
    mappingMethod: text("mapping_method"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.entityId, table.relation] }),
    index("document_entities_entity_document_idx").on(
      table.entityId,
      table.documentId,
    ),
  ],
);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  type: text("type"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  status: eventStatus("status").notNull().default("draft"),
  confidence: real("confidence"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const eventDocuments = pgTable(
  "event_documents",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.documentId] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    unique("notifications_user_document_unique").on(
      table.userId,
      table.documentId,
    ),
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const userFeedState = pgTable("user_feed_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});
