import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getFeedPage, type FeedSearchParams } from "@/lib/feed-data";

const queryKeys = [
  "entity",
  "q",
  "from",
  "to",
  "sort",
  "view",
  "activity",
  "documentType",
  "relation",
] as const;

export async function GET(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const url = new URL(request.url);
  const params: FeedSearchParams = {};
  for (const key of queryKeys) {
    const values = url.searchParams.getAll(key);
    if (values.length === 1) params[key] = values[0];
    if (values.length > 1) params[key] = values;
  }

  const requestedOffset = Number(url.searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(requestedOffset) || requestedOffset < 0) {
    return Response.json(
      { error: "Invalid feed offset." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const page = await getFeedPage(
    current.user.id,
    params,
    Math.min(requestedOffset, 1_000_000),
  );

  return Response.json(
    {
      items: page.items,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
