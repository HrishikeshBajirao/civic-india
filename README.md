# Civic India prototype

Next.js App Router prototype for following Indian public institutions and, in the next stage, collecting their official updates.

## Current scope

- Email and password registration, login, logout, and database-backed sessions through Better Auth.
- Protected dashboard and entity directory.
- Authenticated follow/unfollow route at `POST` and `DELETE /api/follows`.
- PostgreSQL access with Drizzle ORM.
- Handwritten schema in `src/db/schema.ts` for auth, follows, source provenance, documents, events, ingestion runs, and in-app notifications.

The ingestion worker, press-release routes/feed, and notification creation are the next implementation stage. No migration or generated schema has been created or applied. The seed SQL has also not been executed.

## Local configuration

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` to a PostgreSQL connection string.
- `BETTER_AUTH_SECRET` to a private random secret of at least 32 characters.
- `BETTER_AUTH_URL` to the app origin, such as `http://localhost:3000` for local work.

Install dependencies with `npm install`, then start Next.js with `npm run dev`.

The login and registration pages render without a database, but authentication, the dashboard, and follows require the schema to be reviewed and migrated first. After table creation, run the starter entity inserts in `src/db/seed-entities.sql`; both steps are deliberately left for review.

## App routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Prototype landing page |
| `/register` | Public | Create an email/password account |
| `/login` | Public | Start a session |
| `/dashboard` | Signed in | Account and follow overview |
| `/entities` | Signed in | Follow or unfollow seeded entities |
| `/api/auth/[...all]` | Public auth API | Better Auth endpoints |
| `/api/follows` | Signed in | Add or remove an entity follow |

## Database review boundary

`drizzle.config.ts` points Drizzle Kit at the handwritten schema. Do not run schema generation, migration, push, or seed operations until the schema has been reviewed. Better Auth's auth-table model names and fields are in `src/db/schema.ts` and are passed explicitly to its Drizzle adapter.
