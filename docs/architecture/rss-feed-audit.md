# RSS feed audit for the first ten entity sources

**Checked:** 6 October 2026  
**Purpose:** Track official feeds and source-specific connectors for the ten candidate sites.

| # | Website / content area | Official listing or feed URL | Result | In the local worker |
|---:|---|---|---|---|
| 1 | PIB — Press Releases | [Listing](https://www.pib.gov.in/ViewRss.aspx?lang=1&reg=48) · `https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3` | Official Press Releases RSS link verified. The configured URL returns English titles. Feed does not identify the issuing entity on each item, so the prototype only links an item when a known entity name or alias appears in its title. | Yes |
| 2 | Supreme Court of India — Press Releases | [Press Releases](https://www.sci.gov.in/press-release/) | No RSS/Atom feed link found. The current listing is parsed for release cards and their displayed date/snippet. | Yes — HTML |
| 3 | PM India — News Updates / PMO | [News Updates](https://www.pmindia.gov.in/en/news-updates/) | No RSS/Atom feed link found. The latest news-holder cards are parsed; this section includes more than formal press releases. | Yes — HTML |
| 4 | President of India — Press Releases | [Press Releases](https://presidentofindia.nic.in/press-release?page=0) | No RSS/Atom feed link found. The first page of release rows is parsed. | Yes — HTML |
| 5 | Digital Sansad — Lok Sabha Press Releases | [Press Releases](https://sansad.in/ls/pressRelease) | No RSS/Atom feed link found. Uses the same public listing API as the official page and reads up to 50 latest records. | Yes — API |
| 6 | Digital Sansad — Rajya Sabha Press Releases | [Press Releases](https://sansad.in/rs/pressRelease) | No RSS/Atom feed link found. Uses the public API behind the “Other Press Releases” tab. | Yes — API |
| 7 | Ministry of Home Affairs — Current Affairs | [Current Affairs](https://www.mha.gov.in/en/current-affairs) · `http://www.mha.gov.in/en/taxonomy/term/2347/feed` | Official page declares a Current Affairs RSS feed. The stream is broader than press releases, so items use document type `other` and are linked to the Ministry of Home Affairs. | Yes |
| 8 | Ministry of External Affairs — Press Releases | [RSS directory](https://www.mea.gov.in/rss-feeds.htm) · [Press Releases](https://www.mea.gov.in/press-release-.htm) | The RSS directory lists Press Releases, but its direct endpoint remains unverified. The directory currently redirects to an unavailable page in the local browser. | Deferred |
| 9 | Department of Economic Affairs — Press Releases | [Press Releases](https://dea.gov.in/index.php/documents-press-release?page=0) | No RSS/Atom feed link found. The current Drupal page uses a custom listing with English PDF links. | Yes — HTML |
| 10 | Department of Financial Services — Press Releases | [Press Releases](https://financialservices.gov.in/press-release) | No RSS/Atom feed link found. Its listing's original press-release links point to PIB; matching source URLs reuse canonical documents where present. | Yes — HTML |

## Ingestion behavior

- Run `npm run ingest:rss` for the two configured feeds or `npm run ingest:all` for all nine configured sources. `npm run ingest:watch` runs the same sync immediately and every 2 minutes by default, in a separate local process.
- Scraper items are deduplicated by source URL and a stable source item identifier. Each stored item keeps the official item/PDF URL, a compact listing snapshot, publication date when supplied, retrieval time, language guess, and a content checksum.
- PIB items are linked only from explicit title-name/alias matches; its general feed is not assigned wholesale to PMO or Parliament. MHA items link to the MHA entity based on the declared source.
- PM India items map to PMO. President's Secretariat releases link to the Secretariat and President entities; Lok Sabha and Rajya Sabha releases link to their house and Parliament. DEA and DFS have dedicated entity seeds.
- `/feed` joins a signed-in user's follows to document/entity links and shows only matching items, with the original source link.
- The local worker uses a 2-minute interval by default. It is not started by `npm run dev`; run it in its own terminal. No hosted cron is configured.

## Follow-up

Verify the MEA direct RSS endpoint. Review the new DEA entity rows by rerunning the seed file before expecting DEA releases to appear in followed feeds. The DEA listing may reuse generic English PDF paths, so those entries need monitoring for URL reuse; do not treat this connector as a complete archive.
