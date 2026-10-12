import { syncRssFeeds } from "@/lib/ingestion/sync-rss";
import { syncScrapedSources } from "@/lib/ingestion/sync-scraped";

export async function syncAllSources() {
  const rssResults = await syncRssFeeds();
  const scrapedResults = await syncScrapedSources();
  return [...rssResults, ...scrapedResults];
}
