import { and, ilike, or, sql } from "drizzle-orm";
import {
  documentEntities,
  documentSources,
  documents,
  entities,
  sources,
} from "@/db/schema";

export function buildDocumentTextSearch(value: string) {
  const terms = value.trim().slice(0, 120).split(/\s+/).slice(0, 8);
  if (terms.length === 0 || !terms[0]) return undefined;

  return and(
    ...terms.map((term) => {
      const escapedTerm = term.replace(/[\\%_]/g, "\\$&");
      const pattern = "%" + escapedTerm + "%";
      return or(
        ilike(documents.title, pattern),
        ilike(documents.body, pattern),
        ilike(documents.excerpt, pattern),
        ilike(documents.language, pattern),
        ilike(sql.raw("array_to_string(entities.aliases, ' ')"), pattern),
        ilike(entities.name, pattern),
        ilike(documentEntities.evidence, pattern),
        ilike(sql.raw("documents.type::text"), pattern),
        ilike(sources.name, pattern),
        ilike(sources.siteUrl, pattern),
        ilike(sources.listingUrl, pattern),
        ilike(sources.contentScope, pattern),
        ilike(documentSources.sourceUrl, pattern),
        ilike(documentSources.sourceItemId, pattern),
        ilike(documentSources.sourcePublishedAt, pattern),
        ilike(documentSources.mimeType, pattern),
        ilike(documentSources.sourceSnapshot, pattern),
      )!;
    }),
  );
}
