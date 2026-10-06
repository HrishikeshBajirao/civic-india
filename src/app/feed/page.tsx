import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
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

type FeedItem = {
  id: string;
  title: string;
  type: string;
  excerpt: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  entities: Map<string, string>;
  sources: Map<string, { name: string; url: string }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function FeedPage() {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) redirect("/login?next=/feed");

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
    .where(eq(entities.active, true))
    .orderBy(desc(sql`coalesce(${documents.publishedAt}, ${documents.firstSeenAt})`))
    .limit(300);

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
        entities: new Map(),
        sources: new Map(),
      };
      feedItems.set(row.id, item);
    }
    item.entities.set(row.entityId, row.entityName);
    if (row.sourceId && row.sourceName && row.sourceUrl) {
      item.sources.set(row.sourceId, { name: row.sourceName, url: row.sourceUrl });
    }
  }

  return (
    <main className="app-page">
      <header className="site-header app-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">CI</span><span>Civic India</span></Link>
        <div className="app-header-right">
          <Link className="button button-quiet" href="/entities">Manage follows</Link>
          <SignOutButton />
        </div>
      </header>
      <section className="app-content">
        <p className="eyebrow">YOUR CIVIC INDIA</p>
        <h1>Your updates.</h1>
        <p className="app-lead">Official updates linked to the public institutions you follow, newest first.</p>

        {feedItems.size === 0 ? (
          <section className="panel">
            <h2>Your feed is ready for updates.</h2>
            <p className="panel-subtitle">Follow an institution to see its linked releases here. Updates will appear after a connected source is synced.</p>
            <Link className="button button-dark" href="/entities">Manage follows <span aria-hidden="true">→</span></Link>
          </section>
        ) : (
          <section className="feed-list" aria-label="Updates from followed entities">
            {[...feedItems.values()].map((item) => {
              const published = item.publishedAt;
              const timestamp = published ?? item.firstSeenAt;
              return (
                <article className="feed-card" key={item.id}>
                  <div className="feed-meta">
                    <span>{item.type.replaceAll("_", " ")}</span>
                    <time dateTime={timestamp.toISOString()}>{published ? "Published" : "Collected"} {formatDate(timestamp)}</time>
                  </div>
                  <h2>{item.title}</h2>
                  <div className="feed-entities">
                    {[...item.entities.values()].map((name) => <span key={name}>{name}</span>)}
                  </div>
                  {item.excerpt && <p className="feed-excerpt">{item.excerpt}</p>}
                  <div className="feed-footer">
                    <span>Source: {[...item.sources.values()].map((source) => source.name).join(", ") || "Official publication"}</span>
                    {[...item.sources.values()].map((source) => (
                      <a className="inline-link" href={source.url} key={source.url} target="_blank" rel="noreferrer">
                        Read original <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
