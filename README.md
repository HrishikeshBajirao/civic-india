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

Install dependencies with `npm install`, then start Next.js with `npm run dev`. Run `npm run ingest:all` once to poll every configured RSS feed and scraper. To keep polling locally, run `npm run ingest:watch` in a second terminal; it performs an initial sync and then polls every 2 minutes by default. Set `INGEST_INTERVAL_MINUTES` to change that local interval. The worker runs separately from the Next.js web process, so a cron service is not needed for local development. In production, GitHub Actions runs the ingestion workflow every two hours and supports manual runs.

The source adapters expect PostgreSQL and the entity seed data. After applying migrations, run `npm run db:seed`. It safely upserts all 224 followable entities: the 222 nodes in `src/data/institution-map.ts` plus the President's Secretariat and Press Information Bureau. Existing slugs and aliases are preserved. The old `src/db/seed-entities.sql` file has been removed so the TypeScript institution map is the single source of truth for the catalog.

The login and registration pages render without a database. Authentication, ingestion, the dashboard, feed, and follows require the configured PostgreSQL database. The web app does not generate or apply migrations or seed data at runtime; the production GitHub Actions workflow runs both during deployment.

## App routes

| Route                | Access          | Purpose                                           |
| -------------------- | --------------- | ------------------------------------------------- |
| `/`                  | Public          | Prototype landing page                            |
| `/register`          | Public          | Create an email/password account                  |
| `/login`             | Public          | Start a session                                   |
| `/dashboard`         | Signed in       | Account and follow overview                       |
| `/feed`              | Signed in       | Chronological updates linked to followed entities |
| `/entities`          | Signed in       | Follow or unfollow seeded entities                |
| `/api/auth/[...all]` | Public auth API | Better Auth endpoints                             |
| `/api/follows`       | Signed in       | Add or remove an entity follow                    |

## Database boundary

`drizzle.config.ts` points Drizzle Kit at the handwritten schema. Better Auth's auth-table model names and fields are in `src/db/schema.ts` and are passed explicitly to its Drizzle adapter. Schema generation and migrations are separate operator actions; ingestion does not modify the schema or seed data automatically.

## CI and deployment

Pull requests to `main` run formatting, lint, TypeScript, and Docker build checks. Each push to `main` migrates the production database, upserts all 224 entities, builds and publishes the Docker Hub image, deploys the prebuilt app to Vercel, and attempts an initial source ingestion. The separate ingestion workflow polls every two hours and can be started manually from the GitHub Actions tab.

Configure these GitHub Actions secrets in the `production` environment (repository secrets also work): `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `DOCKERHUB_TOKEN`. Add `DOCKERHUB_USERNAME` as an Actions variable. The Vercel Git integration is disabled in `vercel.json` so each production push deploys only once through the workflow. Vercel project IDs and a live deployment URL are not needed in this repository; the IDs are supplied through the secrets.
