import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ syncRssFeeds }, { closeDatabase }] = await Promise.all([
    import("@/lib/ingestion/sync-rss"),
    import("@/db"),
  ]);

  try {
    const results = await syncRssFeeds();
    console.log(JSON.stringify(results, null, 2));
    if (results.some((result) => result.status === "failed")) process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected RSS sync error";
  console.error(`RSS sync did not complete: ${message}`);
  process.exitCode = 1;
});
