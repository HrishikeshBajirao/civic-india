import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { entities, userFollows } from "@/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const expectedOrigin = process.env.BETTER_AUTH_URL
      ? new URL(process.env.BETTER_AUTH_URL).origin
      : new URL(request.url).origin;
    return origin === expectedOrigin;
  } catch {
    return false;
  }
}

async function getRequestContext(request: Request) {
  if (!hasSameOrigin(request)) {
    return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  }

  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) {
    return { response: NextResponse.json({ error: "Sign in to manage follows." }, { status: 401 }) };
  }

  const payload = (await request.json().catch(() => null)) as { entityId?: unknown } | null;
  if (typeof payload?.entityId !== "string" || payload.entityId.length > 64) {
    return { response: NextResponse.json({ error: "A valid entity is required." }, { status: 400 }) };
  }

  const [entity] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(eq(entities.id, payload.entityId))
    .limit(1);
  if (!entity) {
    return { response: NextResponse.json({ error: "Entity not found." }, { status: 404 }) };
  }

  return { current, entity };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  await db
    .insert(userFollows)
    .values({ userId: context.current.user.id, entityId: context.entity.id })
    .onConflictDoNothing();

  return NextResponse.json({ following: true });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  await db
    .delete(userFollows)
    .where(and(eq(userFollows.userId, context.current.user.id), eq(userFollows.entityId, context.entity.id)));

  return NextResponse.json({ following: false });
}
