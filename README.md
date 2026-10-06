# Civic India prototype

Next.js App Router prototype for following Indian public institutions and collecting official updates.

## Current scope

- Email and password registration, login, logout, and database-backed sessions through Better Auth.
- Protected dashboard and entity directory.
- Authenticated follow/unfollow route at `POST` and `DELETE /api/follows`.
- PostgreSQL access with Drizzle ORM.
- Handwritten schema in `src/db/schema.ts` for auth, follows, source provenance, documents, events, ingestion runs, and in-app notifications.
- Manual RSS ingestion for the verified PIB and Ministry of Home Affairs feeds.
- Authenticated `/feed` page showing collected updates linked to entities the user follows.

The ten-site feed audit, verified RSS endpoints, and deferred source list are in `docs/architecture/rss-feed-audit.md`. The first sync is intentionally manual; there is no cron schedule yet.

## Local configuration

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` to a PostgreSQL connection string.
- `BETTER_AUTH_SECRET` to a private random secret of at least 32 characters.
- `BETTER_AUTH_URL` to the app origin, such as `http://localhost:3000` for local work.

Install dependencies with `npm install`, then start Next.js with `npm run dev`. Run `npm run ingest:rss` to fetch the configured feeds and store new source items. This command expects the PostgreSQL schema and entity seed data to be present.

The login and registration pages render without a database. Authentication, ingestion, the dashboard, feed, and follows require the configured PostgreSQL database. The application does not generate or apply migrations or seed data automatically.

## App routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Prototype landing page |
| `/register` | Public | Create an email/password account |
| `/login` | Public | Start a session |
| `/dashboard` | Signed in | Account and follow overview |
| `/feed` | Signed in | Chronological updates linked to followed entities |
| `/entities` | Signed in | Follow or unfollow seeded entities |
| `/api/auth/[...all]` | Public auth API | Better Auth endpoints |
| `/api/follows` | Signed in | Add or remove an entity follow |

## Database boundary

`drizzle.config.ts` points Drizzle Kit at the handwritten schema. Better Auth's auth-table model names and fields are in `src/db/schema.ts` and are passed explicitly to its Drizzle adapter. Schema generation, migrations, and seeding are separate operator actions; the RSS sync does not perform them.
