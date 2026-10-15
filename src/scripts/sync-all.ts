import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ syncAllSources }, { closeDatabase }] = await Promise.all([
    import("@/lib/ingestion/sync-all"),
    import("@/db"),
  ]);

  try {
    const results = await syncAllSources();
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unexpected ingestion error";
  console.error(`Official-source sync did not complete: ${message}`);
  process.exitCode = 1;
});
