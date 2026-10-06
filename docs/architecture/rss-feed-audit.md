# RSS feed audit for the first ten entity sources

**Checked:** 6 October 2026  
**Purpose:** Record official RSS/Atom feeds found for the ten candidate sites and identify which connectors can be polled without a scraper.

| # | Website / content area | Official listing or feed URL | Result | In the current poller |
|---:|---|---|---|---|
| 1 | PIB — Press Releases | [Listing](https://www.pib.gov.in/ViewRss.aspx?lang=1&reg=48) · `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3` | Official Press Releases RSS link verified. The configured URL returns English titles. Feed does not identify the issuing entity on each item, so the prototype only links an item when a known entity name or alias appears in its title. | Yes |
| 2 | Supreme Court of India — Press Releases | [Press Releases](https://www.sci.gov.in/press-release/) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |
| 3 | PM India — News Updates / PMO | [News Updates](https://www.pmindia.gov.in/en/news-updates/) | No RSS/Atom feed link verified on the official news listing in this audit. Use a scraper later. | No |
| 4 | President of India — Press Releases | [Press Releases](https://presidentofindia.nic.in/press-release?page=0) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |
| 5 | Digital Sansad — Lok Sabha Press Releases | [Press Releases](https://sansad.in/ls/pressRelease) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |
| 6 | Digital Sansad — Rajya Sabha Press Releases | [Press Releases](https://sansad.in/rs/pressRelease) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |
| 7 | Ministry of Home Affairs — Current Affairs | [Current Affairs](https://www.mha.gov.in/en/current-affairs) · `http://www.mha.gov.in/en/taxonomy/term/2347/feed` | Official page declares a Current Affairs RSS feed. The stream is broader than press releases, so items use document type `other` and are linked to the Ministry of Home Affairs. | Yes |
| 8 | Ministry of External Affairs — Press Releases | [RSS directory](https://www.mea.gov.in/rss-feeds.htm) · [Press Releases](https://www.mea.gov.in/press-release-.htm) | Official RSS directory lists Press Releases, but the exact direct endpoint could not be verified from the directory response. Keep unconfigured until the direct endpoint is confirmed. | No |
| 9 | Department of Economic Affairs — Press Releases | [Press Releases](https://www.dea.gov.in/documents-press-release?page=0) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |
| 10 | Department of Financial Services — Press Releases | [Press Releases](https://financialservices.gov.in/press-release) | No RSS/Atom feed link verified on the official release listing in this audit. Use a scraper later. | No |

## Ingestion behavior

- Run `npm run ingest:rss` to poll the two configured official feeds. The command loads `.env`/`.env.local` using Next.js environment loading and writes source runs, canonical documents, source observations, and confident entity links to PostgreSQL.
- Items are deduplicated by source URL and feed item identifier. Each stored item keeps the original URL, RSS snapshot, publication date when supplied, retrieval time, language guess, and a content checksum.
- PIB items are linked only from explicit title-name/alias matches; its general feed is not assigned wholesale to PMO or Parliament. MHA items link to the MHA entity based on the declared source.
- `/feed` joins a signed-in user's follows to document/entity links and shows only matching items, with the original source link.
- No cron is configured. No records, source rows, migrations, or entity seeds are created automatically until the manual sync command is run.

## Follow-up

Verify the MEA direct RSS endpoint by inspecting its official RSS directory links. Build source-specific scrapers for the other unconfigured release listings after auditing their pagination, dates, languages, and stable item identifiers.
