import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  documentEntities,
  documentSources,
  documents,
  entities,
  ingestionRuns,
  sources,
} from "@/db/schema";
import { RSS_SOURCES, type RssSourceConfig } from "@/lib/ingestion/rss-sources";

const parser = new Parser({
  timeout: 20_000,
  maxRedirects: 5,
  headers: { "User-Agent": "CivicIndia/0.1 (+official-source RSS reader)" },
});

const localizedEntityNames: Record<string, string[]> = {
  "prime-minister": ["प्रधानमंत्री"],
  "prime-ministers-office": ["प्रधानमंत्री कार्यालय", "पीएमओ"],
  "president-of-india": ["राष्ट्रपति"],
  "presidents-secretariat": ["राष्ट्रपति सचिवालय"],
  "parliament-of-india": ["संसद"],
  "lok-sabha": ["लोक सभा", "लोकसभा"],
  "rajya-sabha": ["राज्य सभा", "राज्यसभा"],
  "supreme-court-of-india": ["सर्वोच्च न्यायालय"],
  "ministry-of-home-affairs": ["गृह मंत्रालय"],
  "ministry-of-external-affairs": ["विदेश मंत्रालय"],
};

type EntityMatch = {
  entityId: string;
  relation: "issuer" | "about";
  evidence: string;
  confidence: number;
  mappingMethod: string;
};

function normalizeForMatch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[.,:;!?()[\]{}"“”'‘’/\\_–—।॥-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionsPhrase(title: string, phrase: string) {
  const normalizedTitle = ` ${normalizeForMatch(title)} `;
  const normalizedPhrase = normalizeForMatch(phrase);
  if (normalizedPhrase.length < 3) return false;
  return normalizedTitle.includes(` ${normalizedPhrase} `);
}

function getLanguage(title: string, fallback: string) {
  return /[\u0900-\u097f]/.test(title) ? "hi" : fallback;
}

function getPublishedAt(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1990 ? null : parsed;
}

function canonicalOfficialLink(link: string, siteUrl: string) {
  try {
    const parsed = new URL(link);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const linkHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const baseHost = new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "");
    if (linkHost !== baseHost && !linkHost.endsWith(`.${baseHost}`)) return null;
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

async function upsertSource(config: RssSourceConfig) {
  const [source] = await db
    .insert(sources)
    .values({
      key: config.key,
      name: config.name,
      siteUrl: config.siteUrl,
      listingUrl: config.feedUrl,
      contentScope: config.contentScope,
      pollIntervalMinutes: config.pollIntervalMinutes,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: sources.key,
      set: {
        name: config.name,
        siteUrl: config.siteUrl,
        listingUrl: config.feedUrl,
        contentScope: config.contentScope,
        pollIntervalMinutes: config.pollIntervalMinutes,
        enabled: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: sources.id });

  if (!source) throw new Error(`Could not register source ${config.key}`);
  return source.id;
}

async function getEntityMatches(
  config: RssSourceConfig,
  title: string,
  issuerEntityId: string | null,
  activeEntities: Array<{ id: string; slug: string; name: string; aliases: string[] }>,
): Promise<EntityMatch[]> {
  const matches = new Map<string, EntityMatch>();

  if (config.issuerEntitySlug && issuerEntityId) {
    matches.set(issuerEntityId, {
      entityId: issuerEntityId,
      relation: "issuer",
      evidence: `Item came from the official ${config.name} feed.`,
      confidence: 1,
      mappingMethod: "source_entity",
    });
  }

  if (config.matchTitleToEntityNames) {
    for (const entity of activeEntities) {
      const phrases = [entity.name, ...entity.aliases, ...(localizedEntityNames[entity.slug] ?? [])];
      const matchedPhrase = phrases.find((phrase) => mentionsPhrase(title, phrase));
      if (matchedPhrase && !matches.has(entity.id)) {
        matches.set(entity.id, {
          entityId: entity.id,
          relation: "about",
          evidence: `Exact entity name or alias appears in the RSS title: ${matchedPhrase}`,
          confidence: 0.8,
          mappingMethod: "rss_title_exact_alias",
        });
      }
    }
  }

  return [...matches.values()];
}

async function syncOneSource(config: RssSourceConfig, activeEntities: Array<{ id: string; slug: string; name: string; aliases: string[] }>) {
  const sourceId = await upsertSource(config);
  const [run] = await db.insert(ingestionRuns).values({ sourceId }).returning({ id: ingestionRuns.id });
  if (!run) throw new Error(`Could not start ingestion run for ${config.key}`);

  let itemsRead = 0;
  let recordsCreated = 0;

  try {
    const feed = await parser.parseURL(config.feedUrl);
    itemsRead = feed.items.length;
    const issuer = config.issuerEntitySlug
      ? activeEntities.find((entity) => entity.slug === config.issuerEntitySlug)
      : undefined;

    for (const item of feed.items) {
      const feedTitle = normalizeForMatch(feed.title ?? "");
      const itemTitle = item.title?.trim();
      const descriptionTitle = item.contentSnippet?.trim();
      const title = !itemTitle || normalizeForMatch(itemTitle) === feedTitle
        ? descriptionTitle
        : itemTitle;
      const link = item.link ? canonicalOfficialLink(item.link.trim(), config.siteUrl) : null;
      if (!title || !link) continue;

      const publishedValue = item.isoDate ?? item.pubDate;
      const publishedAt = getPublishedAt(publishedValue);
      const excerpt = item.contentSnippet?.trim().slice(0, 4_000) || null;
      const snapshot = JSON.stringify({
        title,
        link,
        feedItemTitle: itemTitle ?? null,
        guid: item.guid ?? null,
        pubDate: item.pubDate ?? null,
        categories: item.categories ?? [],
        description: excerpt,
      });
      const itemHash = createHash("sha256").update(snapshot).digest("hex");

      const docType =
        (item.categories ?? []).some((category) => /press\s*releases?|प्रेस विज्ञप्ति/i.test(category))
          ? "press_release"
          : config.defaultDocumentType;

      const entityMatches = await getEntityMatches(config, title, issuer?.id ?? null, activeEntities);

      const created = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: documentSources.id })
          .from(documentSources)
          .where(and(eq(documentSources.sourceId, sourceId), eq(documentSources.sourceUrl, link)))
          .limit(1);
        if (existing.length) return false;

        const [document] = await tx
          .insert(documents)
          .values({
            title,
            type: docType,
            body: excerpt,
            excerpt: excerpt?.slice(0, 500) ?? null,
            language: getLanguage(title, config.defaultLanguage),
            publishedAt,
            contentHash: itemHash,
          })
          .returning({ id: documents.id });
        if (!document) throw new Error(`Could not save RSS item from ${config.key}`);

        const observation = await tx
          .insert(documentSources)
          .values({
            documentId: document.id,
            sourceId,
            sourceUrl: link,
            sourceItemId: item.guid ?? link,
            sourcePublishedAt: publishedValue ?? null,
            sourceSnapshot: snapshot,
            mimeType: "application/rss+xml",
            checksum: itemHash,
          })
          .onConflictDoNothing()
          .returning({ id: documentSources.id });

        if (!observation.length) {
          await tx.delete(documents).where(eq(documents.id, document.id));
          return false;
        }

        if (entityMatches.length) {
          await tx.insert(documentEntities).values(
            entityMatches.map((match) => ({ documentId: document.id, ...match })),
          ).onConflictDoNothing();
        }
        return true;
      });

      if (created) recordsCreated += 1;
    }

    await db
      .update(sources)
      .set({ lastSuccessfulRunAt: new Date(), updatedAt: new Date() })
      .where(eq(sources.id, sourceId));
    await db
      .update(ingestionRuns)
      .set({ status: "succeeded", finishedAt: new Date(), pagesRead: 1, itemsRead, recordsCreated })
      .where(eq(ingestionRuns.id, run.id));

    return { sourceKey: config.key, itemsRead, recordsCreated, status: "succeeded" as const };
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown RSS ingestion error";
    await db
      .update(ingestionRuns)
      .set({ status: "failed", finishedAt: new Date(), pagesRead: 1, itemsRead, recordsCreated, errorSummary })
      .where(eq(ingestionRuns.id, run.id));
    return { sourceKey: config.key, itemsRead, recordsCreated, status: "failed" as const, error: errorSummary };
  }
}

export async function syncRssFeeds() {
  const activeEntities = await db
    .select({ id: entities.id, slug: entities.slug, name: entities.name, aliases: entities.aliases })
    .from(entities)
    .where(eq(entities.active, true));

  const results = [];
  for (const config of RSS_SOURCES) {
    results.push(await syncOneSource(config, activeEntities));
  }
  return results;
}
