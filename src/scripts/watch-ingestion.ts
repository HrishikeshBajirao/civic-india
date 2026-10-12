import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const requestedInterval = Number(process.env.INGEST_INTERVAL_MINUTES ?? "2");
  if (!Number.isFinite(requestedInterval) || requestedInterval <= 0) {
    throw new Error("INGEST_INTERVAL_MINUTES must be a positive number");
  }
  const intervalMs = requestedInterval * 60_000;

  const [{ syncAllSources }, { closeDatabase }] = await Promise.all([
    import("@/lib/ingestion/sync-all"),
    import("@/db"),
  ]);

  let currentRun: Promise<void> | null = null;
  const runCycle = () => {
    if (currentRun) {
      console.warn("Previous ingestion cycle is still running; skipping this tick.");
      return currentRun;
    }

    currentRun = (async () => {
      console.log(`Starting official-source sync at ${new Date().toISOString()}`);
      const results = await syncAllSources();
      console.log(JSON.stringify(results, null, 2));
      if (results.some((result) => result.status === "failed")) {
        console.warn("At least one source failed; other source results are retained above.");
      }
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected ingestion error";
      console.error(`Ingestion cycle failed: ${message}`);
    }).finally(() => {
      currentRun = null;
    });

    return currentRun;
  };

  let stop: (() => void) | undefined;
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  const onSignal = () => stop?.();
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  console.log(`Local ingestion worker polling every ${requestedInterval} minute(s).`);
  await runCycle();
  const timer = setInterval(() => void runCycle(), intervalMs);
  await stopped;
  clearInterval(timer);
  process.off("SIGINT", onSignal);
  process.off("SIGTERM", onSignal);
  if (currentRun) await currentRun;
  await closeDatabase();
  console.log("Local ingestion worker stopped.");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected worker error";
  console.error(`Local ingestion worker did not start: ${message}`);
  process.exitCode = 1;
});
