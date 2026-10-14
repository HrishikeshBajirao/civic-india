import { and, eq, inArray } from "drizzle-orm";
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
    return {
      response: NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      ),
    };
  }

  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) {
    return {
      response: NextResponse.json(
        { error: "Sign in to manage follows." },
        { status: 401 },
      ),
    };
  }

  const payload = (await request.json().catch(() => null)) as {
    entityId?: unknown;
    entityIds?: unknown;
  } | null;
  if (!payload || typeof payload !== "object") {
    return {
      response: NextResponse.json(
        { error: "A valid entity is required." },
        { status: 400 },
      ),
    };
  }

  const values = Array.isArray(payload.entityIds)
    ? payload.entityIds
    : [payload.entityId];
  if (
    values.length === 0 ||
    values.length > 100 ||
    values.some((id) => typeof id !== "string" || id.length > 64)
  ) {
    return {
      response: NextResponse.json(
        { error: "Provide between 1 and 100 valid entities." },
        { status: 400 },
      ),
    };
  }

  const entityIds = [...new Set(values as string[])];
  return { current, entityIds };
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const foundEntities = await db
    .select({ id: entities.id })
    .from(entities)
    .where(inArray(entities.id, context.entityIds));
  if (foundEntities.length !== context.entityIds.length) {
    return NextResponse.json(
      { error: "One or more entities were not found." },
      { status: 404 },
    );
  }

  await db
    .insert(userFollows)
    .values(
      foundEntities.map((entity) => ({
        userId: context.current.user.id,
        entityId: entity.id,
      })),
    )
    .onConflictDoNothing();

  return NextResponse.json({ following: true, count: foundEntities.length });
}

export async function DELETE(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  if (context.entityIds.length !== 1) {
    return NextResponse.json(
      { error: "Unfollow one entity at a time." },
      { status: 400 },
    );
  }

  const [entity] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(eq(entities.id, context.entityIds[0]))
    .limit(1);
  if (!entity)
    return NextResponse.json({ error: "Entity not found." }, { status: 404 });

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.userId, context.current.user.id),
        eq(userFollows.entityId, context.entityIds[0]),
      ),
    );

  return NextResponse.json({ following: false });
}
