# Civic India prototype

Next.js App Router prototype for following Indian public institutions and collecting official updates.

## Current scope

- Email and password registration, login, logout, and database-backed sessions through Better Auth.
- Protected dashboard and entity directory.
- Authenticated follow/unfollow route at `POST` and `DELETE /api/follows`.
- PostgreSQL access with Drizzle ORM.
- Handwritten schema in `src/db/schema.ts` for auth, follows, source provenance, documents, events, ingestion runs, and in-app notifications.
- RSS ingestion for PIB and MHA, plus source-specific scrapers for the other seven audited websites without a verified feed.
- Authenticated `/feed` page showing collected updates linked to entities the user follows.

The ten-site feed audit and connector status are in `docs/architecture/rss-feed-audit.md`. MEA remains deferred because its direct RSS URL has not been verified.

## Local configuration

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL` to a PostgreSQL connection string.
- `BETTER_AUTH_SECRET` to a private random secret of at least 32 characters.
- `BETTER_AUTH_URL` to the app origin, such as `http://localhost:3000` for local work.

Install dependencies with `npm install`, then start Next.js with `npm run dev`. Run `npm run ingest:all` once to poll every configured RSS feed and scraper. To keep polling locally, run `npm run ingest:watch` in a second terminal; it performs an initial sync and then polls every 2 minutes by default. Set `INGEST_INTERVAL_MINUTES` to change that local interval. The worker runs separately from the Next.js web process, so a cron service is not needed for local development. It stops when its terminal/process stops; a deployed always-on worker needs a process manager or scheduler.

The source adapters expect PostgreSQL and the entity seed data. The seed file includes the Department of Economic Affairs, Department of Financial Services, and Press Information Bureau entities; it is safe to rerun `src/db/seed-entities.sql` because existing slugs are left unchanged. After applying the migration and seed, run `npm run entities:sync-institutions` to upsert the 222 institutions in `src/data/institution-map.ts` and their aliases. Together, these provide 224 followable entities.

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

`drizzle.config.ts` points Drizzle Kit at the handwritten schema. Better Auth's auth-table model names and fields are in `src/db/schema.ts` and are passed explicitly to its Drizzle adapter. Schema generation and migrations are separate operator actions; ingestion does not modify the schema or seed data automatically.
