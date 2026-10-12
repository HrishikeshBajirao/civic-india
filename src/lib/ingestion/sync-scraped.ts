import { createCipheriv, createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  documentEntities,
  documentSources,
  documents,
  entities,
  ingestionRuns,
  sources,
} from "@/db/schema";
import { SCRAPE_SOURCES, type ScrapeSourceConfig } from "@/lib/ingestion/scrape-sources";

type ScrapedItem = {
  id?: string;
  title: string;
  sourceUrl: string;
  publishedAt: Date | null;
  excerpt: string | null;
  language?: string;
  mimeType?: string;
  snapshot?: Record<string, unknown>;
};

type EntityRecord = { id: string; slug: string };

const requestHeaders = {
  "User-Agent": "CivicIndia/0.1 (+official-source reader)",
  Accept: "text/html,application/json,application/pdf;q=0.9,*/*;q=0.5",
};
const requestTimeoutMs = 20_000;
const indiaOffsetMinutes = 330;

function createHashFor(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  const $ = cheerio.load(`<span>${value}</span>`);
  return $("span")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function istDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  date.setUTCMinutes(date.getUTCMinutes() - indiaOffsetMinutes);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSourceDate(value: string | null | undefined): Date | null {
  const text = value?.trim().replace(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]+/i, "");
  if (!text) return null;

  const zonedTimestamp = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  if (zonedTimestamp.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1990 ? null : parsed;
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) {
    const year = Number(iso[1]);
    if (year < 1990) return null;
    return istDate(year, Number(iso[2]), Number(iso[3]), Number(iso[4] ?? 0), Number(iso[5] ?? 0), Number(iso[6] ?? 0));
  }

  const numericDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]);
    const year = Number(numericDate[3]);
    if (year < 1990 || month < 1 || month > 12) return null;
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) return null;
    return istDate(year, month, day);
  }

  const dateParts = text.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s./-]+([A-Za-z]{3,9}|\d{1,2})[,\.\s/-]+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i)
    ?? text.match(/^([A-Za-z]{3,9})[\s./-]+(\d{1,2})(?:st|nd|rd|th)?[,\.\s/-]+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
  if (!dateParts) return null;

  const monthFirst = /^[A-Za-z]/.test(dateParts[1]);
  const monthToken = monthFirst ? dateParts[1] : dateParts[2];
  const month = /^\d+$/.test(monthToken)
    ? Number(monthToken)
    : new Date(monthToken.slice(0, 3) + " 1, 2000").getMonth() + 1;
  const day = Number(monthFirst ? dateParts[2] : dateParts[1]);
  const year = Number(dateParts[3]);
  if (year < 1990 || month < 1 || month > 12) return null;
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) return null;

  let hour = Number(dateParts[4] ?? 0);
  const minute = Number(dateParts[5] ?? 0);
  const second = Number(dateParts[6] ?? 0);
  const meridiem = dateParts[7]?.toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  }
  return istDate(year, month, day, hour, minute, second);
}

function findDate(text: string) {
  const candidates = [
    /\b\d{4}-\d{1,2}-\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/,
    /\b\d{1,2}(?:st|nd|rd|th)?[\s./-]+[A-Za-z]{3,9}[,.\s/-]+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/i,
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/,
  ];
  for (const pattern of candidates) {
    const match = text.match(pattern);
    if (!match) continue;
    const date = parseSourceDate(match[0]);
    if (date) return { date, text: match[0] };
  }
  return { date: null, text: "" };
}

function extractExcerpt(text: string, title: string, dateText: string) {
  let excerpt = cleanText(text);
  if (title) excerpt = excerpt.replace(title, " ");
  if (dateText) excerpt = excerpt.replace(dateText, " ");
  excerpt = excerpt.replace(/\bview\s+details\b/gi, " ").replace(/\s+/g, " ").trim();
  return excerpt ? excerpt.slice(0, 4_000) : null;
}

function normalizeUrl(rawUrl: string, config: ScrapeSourceConfig) {
  const parsed = new URL(rawUrl, config.siteUrl);
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const allowedHosts = [new URL(config.siteUrl).hostname, ...(config.allowedHosts ?? [])]
    .map((allowed) => allowed.toLowerCase().replace(/^www\./, ""));
  const isAllowed = allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  if (!isAllowed) return null;

  parsed.hash = "";
  parsed.searchParams.delete("comment");
  return parsed.toString();
}

async function fetchText(url: string, headers: Record<string, string> = requestHeaders) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return { text: await response.text(), contentType: response.headers.get("content-type") ?? "" };
}

async function fetchJson<T>(url: string, headers: Record<string, string> = requestHeaders): Promise<T> {
  const { text } = await fetchText(url, headers);
  return JSON.parse(text) as T;
}

function resolveLink(rawUrl: string | undefined, config: ScrapeSourceConfig) {
  if (!rawUrl) return null;
  return normalizeUrl(rawUrl, config);
}

function parsePmIndia(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const list = $("ul.news-holder").first();
  const items: ScrapedItem[] = [];

  list.children("li").each((_, element) => {
    const card = $(element);
    const titleAnchor = card.find(".news-description h3 a[href]").first();
    const fallbackAnchor = card.find("a[href]").filter((__, anchor) =>
      new URL(anchor.attribs.href, config.siteUrl).pathname.startsWith("/en/news_updates/"),
    ).first();
    const title = cleanText(titleAnchor.attr("title") || titleAnchor.text());
    const sourceUrl = resolveLink(titleAnchor.attr("href") || fallbackAnchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const description = card.find(".news-description").first();
    const descriptionText = description.text();
    const dateMatch = findDate(descriptionText);
    const paragraphText = description.find("p").map((__, paragraph) => $(paragraph).text()).get().join(" ");
    items.push({
      id: new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: dateMatch.date,
      excerpt: extractExcerpt(paragraphText || descriptionText, title, dateMatch.text),
      snapshot: { listingText: cleanText(descriptionText) },
    });
  });

  if (!items.length) throw new Error("Could not find news items in the PM India news-holder list");
  return items;
}

function parseSupremeCourt(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(".awardListing").each((_, element) => {
    const card = $(element);
    const titleAnchor = card.find("h2 a[href]").first();
    const title = cleanText(titleAnchor.text());
    const sourceUrl = resolveLink(titleAnchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const cardText = card.text();
    const dateMatch = findDate(cardText);
    items.push({
      id: new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: dateMatch.date,
      excerpt: extractExcerpt(cardText, title, dateMatch.text),
      snapshot: { listingText: cleanText(cardText) },
    });
  });

  if (!items.length) throw new Error("Could not find press-release cards in the Supreme Court listing");
  return items;
}

function parsePresident(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const rows = $("table.views-table tbody tr");
  const items: ScrapedItem[] = [];

  rows.each((_, element) => {
    const row = $(element);
    const titleCell = row.find(".views-field-title").first();
    const titleAnchor = titleCell.find("a[href]").first();
    const title = cleanText(titleAnchor.text() || titleCell.text());
    const sourceUrl = resolveLink(titleAnchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const dateText = cleanText(row.find(".views-field-field-date-1 time").attr("datetime") || row.find(".views-field-field-date-1").text());
    items.push({
      id: new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: null,
      snapshot: { issueDate: dateText },
    });
  });

  if (!items.length) throw new Error("Could not find press-release rows in the President of India listing");
  return items;
}

type LokSabhaApiItem = {
  id: number;
  title?: string;
  description?: string;
  publishedAt?: string;
  eventDate?: string;
  fileUrl?: string;
};

type LokSabhaApiResponse = {
  records?: LokSabhaApiItem[];
  _metadata?: { totalElements?: number };
};

async function fetchLokSabha(config: ScrapeSourceConfig) {
  const endpoint = new URL("https://sansad.in/api_ls/public/ppr/press-release");
  endpoint.search = new URLSearchParams({
    searchParam: "",
    fromDate: "",
    toDate: "",
    sortOn: "",
    sortBy: "",
    locale: "en",
    page: "1",
    size: "50",
  }).toString();
  const response = await fetchJson<LokSabhaApiResponse>(endpoint.toString());
  if (!Array.isArray(response.records)) throw new Error("Lok Sabha API response did not contain a records array");

  return response.records.flatMap((record) => {
    const title = cleanText(record.title);
    const sourceUrl = resolveLink(record.fileUrl, config);
    if (!title || !sourceUrl) return [];
    return [{
      id: String(record.id),
      title,
      sourceUrl,
      publishedAt: parseSourceDate(record.publishedAt ?? record.eventDate),
      excerpt: cleanText(record.description).slice(0, 4_000) || null,
      mimeType: sourceUrl.toLowerCase().includes(".pdf") ? "application/pdf" : undefined,
      snapshot: { eventDate: record.eventDate ?? null, publishedAt: record.publishedAt ?? null },
    }];
  });
}

type RajyaSabhaApiItem = {
  pressid: number;
  txtpress?: string;
  pub_date?: string;
  pub_date_order?: string;
  rptpressfile_dsp?: string;
  publish?: string;
  cFlag?: string;
};

type RajyaSabhaApiResponse = {
  success?: boolean;
  data?: RajyaSabhaApiItem[];
};

async function fetchRajyaSabha(config: ScrapeSourceConfig) {
  const response = await fetchJson<RajyaSabhaApiResponse>(
    "https://integration.rajyasabha.digital/committee-integration/api/v1/web/getpress_relese_otherhome",
  );
  if (!Array.isArray(response.data)) throw new Error("Rajya Sabha API response did not contain a data array");

  return response.data.slice(0, 50).flatMap((record) => {
    if (record.publish && record.publish !== "Y") return [];
    const title = cleanText(record.txtpress);
    const sourceUrl = resolveLink(record.rptpressfile_dsp, config);
    if (!title || !sourceUrl) return [];
    return [{
      id: String(record.pressid),
      title,
      sourceUrl,
      publishedAt: parseSourceDate(record.pub_date_order ?? record.pub_date),
      excerpt: null,
      mimeType: sourceUrl.toLowerCase().includes(".pdf") ? "application/pdf" : undefined,
      snapshot: { publishedAt: record.pub_date ?? null, category: "Other Press Releases" },
    }];
  });
}

function parseDea(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const rows = $(".view-id-press_release .customTablebdr");
  const items: ScrapedItem[] = [];

  rows.each((_, element) => {
    const row = $(element);
    const title = cleanText(row.find(".documentRecordTitle").first().text());
    const dateText = cleanText(row.find(".docDate").first().text());
    const links = row.find("a[href]").toArray();
    const englishLink = links.find((link) => /(?:^|\/)(?:eng|e)\.pdf(?:$|[?#])/i.test(link.attribs.href));
    const fallbackLink = links.find((link) => !/hin(?:di)?\.pdf/i.test(link.attribs.href)) ?? links[0];
    const sourceUrl = resolveLink((englishLink ?? fallbackLink)?.attribs.href, config);
    if (!title || !sourceUrl) return;

    items.push({
      id: `${title}|${dateText}`,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: null,
      mimeType: "application/pdf",
      snapshot: { publishedDate: dateText },
    });
  });

  if (!items.length) throw new Error("Could not find release records in the DEA customTable listing");
  return items;
}

function parseDfs(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const rows = $("table.views-table tbody tr");
  const items: ScrapedItem[] = [];

  rows.each((_, element) => {
    const row = $(element);
    const title = cleanText(row.find(".views-field-field-pr-name").first().text());
    const dateText = cleanText(
      row.find(".views-field-field-pr-date time").attr("datetime") || row.find(".views-field-field-pr-date").text(),
    );
    const sourceUrl = resolveLink(row.find(".views-field-field-pr-link a[href]").first().attr("href"), config);
    if (!title || !sourceUrl) return;

    const externalId = new URL(sourceUrl).searchParams.get("PRID");
    items.push({
      id: externalId || `${title}|${dateText}`,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: null,
      mimeType: sourceUrl.toLowerCase().includes(".pdf") ? "application/pdf" : "text/html",
      snapshot: { publishedDate: dateText, linkOnListing: sourceUrl },
    });
  });

  if (!items.length) throw new Error("Could not find press-release rows in the DFS listing");
  return items;
}

function parseVicePresident(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(".gen-card-with-image").each((_, element) => {
    const card = $(element);
    const anchor = card.find(".gen-card-content h2 a[href]").first();
    const title = cleanText(anchor.text());
    const sourceUrl = resolveLink(anchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const datePanel = card.find(".event-date-panel").first();
    const dateLabel = cleanText(datePanel.find("p").first().text()).replace(/^Publish:\s*/i, "");
    const year = cleanText(datePanel.find("strong").first().text());
    const dateText = `${dateLabel} ${year}`.trim();
    const excerpt = cleanText(card.find(".gen-card-content p").first().text());
    items.push({
      id: new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: extractExcerpt(excerpt, title, dateText),
      snapshot: { publishedDate: dateText },
    });
  });

  if (!items.length) throw new Error("Could not find news cards in the Vice President listing");
  return items;
}

function parseMea(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(".pressRelesastBox").each((_, element) => {
    const card = $(element);
    const anchor = card.find("h3.pressTitle a[href]").first();
    const title = cleanText(anchor.text());
    const sourceUrl = resolveLink(anchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const dateText = cleanText(card.find(".date").first().text());
    const excerpt = card.find("p").map((__, paragraph) => $(paragraph).text()).get().join(" ");
    items.push({
      id: new URL(sourceUrl).pathname + new URL(sourceUrl).search,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: extractExcerpt(excerpt, title, dateText),
      snapshot: { publishedDate: dateText },
    });
  });

  if (!items.length) throw new Error("Could not find release cards in the MEA publication listing");
  return items;
}

function parseCag(html: string, config: ScrapeSourceConfig): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(".reportListing li").each((_, element) => {
    const row = $(element).find(".listItem").first();
    const title = cleanText(row.find(".listReportTitle").first().text());
    const dateText = cleanText(row.find(".categoryText").first().text());
    const sourceUrl = resolveLink(row.find(".downPdf a[href]").first().attr("href"), config);
    if (!title || !sourceUrl) return;

    items.push({
      id: new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: null,
      mimeType: "application/pdf",
      snapshot: { publishedDate: dateText },
    });
  });

  if (!items.length) throw new Error("Could not find press-release PDFs in the CAG listing");
  return items;
}

type CabinetListingEntry = { title?: string; link?: string };

async function fetchCabinetSecretariat(config: ScrapeSourceConfig): Promise<ScrapedItem[]> {
  const page = await fetchText(config.listingUrl);
  if (!page.contentType.toLowerCase().includes("html")) {
    throw new Error(`Expected the Cabinet Secretariat page, received ${page.contentType || "an unspecified content type"}`);
  }

  const endpoint = new URL("/ajax_page_data.php?page_id=60", config.siteUrl).toString();
  const records = await fetchJson<CabinetListingEntry[]>(endpoint, {
    ...requestHeaders,
    Accept: "application/json,text/html,*/*",
    Referer: config.listingUrl,
  });
  const cabinetLink = records.find((record) => /cabinet decisions/i.test(cleanText(record.title)));
  if (!cabinetLink?.link) throw new Error("The Cabinet Secretariat page did not return its Cabinet Decisions link");

  const cabinetUrl = normalizeUrl(cabinetLink.link.replace(/&amp;/g, "&"), config);
  if (!cabinetUrl) throw new Error("The Cabinet Decisions link was outside the configured official hosts");
  const listingUrl = new URL(cabinetUrl);
  listingUrl.searchParams.set("Lang", "1");
  listingUrl.searchParams.set("reg", "1");
  const listing = await fetchText(listingUrl.toString());
  if (!listing.contentType.toLowerCase().includes("html")) {
    throw new Error(`Expected the Cabinet Decisions listing, received ${listing.contentType || "an unspecified content type"}`);
  }

  const $ = cheerio.load(listing.text);
  const items: ScrapedItem[] = [];
  $(".content-area li").each((_, element) => {
    const row = $(element);
    const anchor = row.find('a[href*="PressReleseDetail.aspx?PRID="]').first();
    const title = cleanText(anchor.attr("title") || anchor.text());
    const sourceUrl = resolveLink(anchor.attr("href"), config);
    if (!title || !sourceUrl) return;

    const dateText = cleanText(row.find(".publishdatesmall").first().text());
    items.push({
      id: new URL(sourceUrl).searchParams.get("PRID") ?? new URL(sourceUrl).pathname,
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText.replace(/^Posted on:\s*/i, "")),
      excerpt: null,
      snapshot: { publishedDate: dateText, publicationHost: new URL(sourceUrl).hostname },
    });
  });

  if (!items.length) throw new Error("Could not find Cabinet decision entries in the linked PIB listing");
  return items;
}

type EciAttachment = {
  record_location?: string;
  pdf_type?: string;
  document_type?: string;
  extension?: string;
};

type EciApiItem = {
  id?: string | number;
  document_title?: string;
  document_description?: string;
  reference_number?: string;
  date_of_creation?: string;
  tags?: string;
  document_attachments?: EciAttachment[];
};

type EciApiResponse = {
  success?: boolean;
  totalResults?: number;
  results?: { data?: EciApiItem[] };
};

function encryptEciCategory(category: string, key: string) {
  const keyBytes = Buffer.from(key, "utf8");
  const cipher = createCipheriv(`aes-${keyBytes.byteLength * 8}-ecb`, keyBytes, null);
  return encodeURIComponent(Buffer.concat([cipher.update(category, "utf8"), cipher.final()]).toString("base64"));
}

async function fetchEciPressReleases(config: ScrapeSourceConfig): Promise<ScrapedItem[]> {
  const page = await fetchText(config.listingUrl);
  if (!page.contentType.toLowerCase().includes("html")) {
    throw new Error(`Expected the ECI press page, received ${page.contentType || "an unspecified content type"}`);
  }
  const $ = cheerio.load(page.text);
  const bundlePath = $("script[src]")
    .map((_, element) => $(element).attr("src"))
    .get()
    .find((src) => Boolean(src && /\/static\/js\/main\.[^/]+\.js(?:\?|$)/.test(src)));
  if (!bundlePath) throw new Error("Could not locate the ECI public website JavaScript bundle");

  const bundleUrl = new URL(bundlePath, config.siteUrl).toString();
  const bundle = (await fetchText(bundleUrl)).text;
  const apiBase = bundle.match(/kl="(https:\/\/www\.eci\.gov\.in\/eci-backend\/public)"/)?.[1];
  const categoryKey = bundle.match(/ol="([^"]+)"/)?.[1];
  const apiSecret = bundle.match(/wl="([^"]+)"/)?.[1];
  if (!apiBase || !categoryKey || !apiSecret) throw new Error("Could not resolve the ECI public API configuration");

  const category = encryptEciCategory("11", categoryKey);
  const response = await fetchJson<EciApiResponse>(`${apiBase}/api/get-file?categories=${category}`, {
    ...requestHeaders,
    Accept: "application/json,*/*",
    secret: apiSecret,
  });
  const records = response.results?.data;
  if (!response.success || !Array.isArray(records)) throw new Error("The ECI public press-release API returned no records");

  const items: ScrapedItem[] = records.flatMap((record) => {
    const attachments = record.document_attachments ?? [];
    const attachment = attachments.find((candidate) => /^en$/i.test(candidate.pdf_type ?? ""))
      ?? attachments.find((candidate) => Boolean(candidate.record_location));
    const sourceUrl = resolveLink(attachment?.record_location, config);
    if (!sourceUrl) return [];

    const rawTitle = cleanText(record.document_title);
    const description = cleanText(record.document_description);
    const referenceNumber = cleanText(record.reference_number);
    const title = !rawTitle || /^press\s+note$/i.test(rawTitle)
      ? (!description || /^press\s+note$/i.test(description)
        ? `Press Note${referenceNumber ? ` (${referenceNumber})` : ""}`
        : description)
      : rawTitle;
    const dateText = cleanText(record.date_of_creation);

    return [{
      id: String(record.id ?? sourceUrl),
      title,
      sourceUrl,
      publishedAt: parseSourceDate(dateText),
      excerpt: description || null,
      language: /^hi$/i.test(attachment?.pdf_type ?? "") ? "hi" : "en",
      mimeType: "application/pdf",
      snapshot: {
        referenceNumber: referenceNumber || null,
        sourceDate: dateText,
        apiTitle: rawTitle || null,
        tags: cleanText(record.tags),
      },
    }];
  });

  if (!items.length) throw new Error("The ECI API returned no press notes with direct official attachments");
  return items;
}

async function fetchItems(config: ScrapeSourceConfig): Promise<ScrapedItem[]> {
  if (config.parser === "lok-sabha-press-releases") return fetchLokSabha(config);
  if (config.parser === "rajya-sabha-press-releases") return fetchRajyaSabha(config);
  if (config.parser === "cabinet-secretariat-decisions") return fetchCabinetSecretariat(config);
  if (config.parser === "election-commission-press-releases") return fetchEciPressReleases(config);

  const { text, contentType } = await fetchText(config.listingUrl);
  if (!contentType.toLowerCase().includes("html")) {
    throw new Error(`Expected an HTML listing, received ${contentType || "an unspecified content type"}`);
  }

  switch (config.parser) {
    case "pm-india-news-updates": return parsePmIndia(text, config);
    case "supreme-court-press-releases": return parseSupremeCourt(text, config);
    case "president-press-releases": return parsePresident(text, config);
    case "dea-press-releases": return parseDea(text, config);
    case "dfs-press-releases": return parseDfs(text, config);
    case "vice-president-news-updates": return parseVicePresident(text, config);
    case "mea-press-releases": return parseMea(text, config);
    case "cag-press-releases": return parseCag(text, config);
  }
  throw new Error(`No scraper is registered for ${config.parser}`);
}

async function upsertSource(config: ScrapeSourceConfig) {
  const [source] = await db
    .insert(sources)
    .values({
      key: config.key,
      name: config.name,
      siteUrl: config.siteUrl,
      listingUrl: config.listingUrl,
      contentScope: config.contentScope,
      pollIntervalMinutes: config.pollIntervalMinutes,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: sources.key,
      set: {
        name: config.name,
        siteUrl: config.siteUrl,
        listingUrl: config.listingUrl,
        contentScope: config.contentScope,
        pollIntervalMinutes: config.pollIntervalMinutes,
        enabled: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: sources.id });

  if (!source) throw new Error(`Could not register source ${config.key}`);
  return source.id;
}

async function storeItem(
  config: ScrapeSourceConfig,
  sourceId: string,
  item: ScrapedItem,
  activeEntities: EntityRecord[],
) {
  const itemHash = createHashFor(JSON.stringify({
    title: item.title,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    excerpt: item.excerpt,
  }));
  const stableId = createHashFor(`${config.key}|${item.id ?? ""}|${item.sourceUrl}|${item.title}`);
  const entityLinks = config.entityLinks.flatMap((link) => {
    const entity = activeEntities.find((candidate) => candidate.slug === link.slug);
    return entity ? [{ entityId: entity.id, ...link }] : [];
  });

  return db.transaction(async (tx) => {
    const existingSourceRecord = await tx
      .select({ documentId: documentSources.documentId })
      .from(documentSources)
      .where(and(eq(documentSources.sourceId, sourceId), eq(documentSources.sourceUrl, item.sourceUrl)))
      .limit(1);
    if (existingSourceRecord.length) {
      if (entityLinks.length) {
        await tx.insert(documentEntities).values(
          entityLinks.map((link) => ({ documentId: existingSourceRecord[0].documentId, ...link })),
        ).onConflictDoNothing();
      }
      return { created: false, updated: false, unlinked: entityLinks.length === 0 };
    }

    const existingCanonicalRecord = await tx
      .select({ documentId: documentSources.documentId })
      .from(documentSources)
      .where(eq(documentSources.sourceUrl, item.sourceUrl))
      .limit(1);
    let documentId = existingCanonicalRecord[0]?.documentId;
    let createdDocument = false;

    if (!documentId) {
      const [document] = await tx
        .insert(documents)
        .values({
          title: item.title,
          type: config.defaultDocumentType,
          body: item.excerpt,
          excerpt: item.excerpt?.slice(0, 500) ?? null,
          language: item.language ?? (/\p{Script=Devanagari}/u.test(item.title) ? "hi" : config.defaultLanguage),
          publishedAt: item.publishedAt,
          contentHash: itemHash,
        })
        .returning({ id: documents.id });
      if (!document) throw new Error(`Could not save item from ${config.key}`);
      documentId = document.id;
      createdDocument = true;
    }

    const snapshot = JSON.stringify({
      adapter: config.parser,
      listingUrl: config.listingUrl,
      title: item.title,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      excerpt: item.excerpt,
      sourceUrl: item.sourceUrl,
      observedAt: new Date().toISOString(),
      ...item.snapshot,
    });
    const [observation] = await tx
      .insert(documentSources)
      .values({
        documentId,
        sourceId,
        sourceUrl: item.sourceUrl,
        sourceItemId: stableId,
        sourcePublishedAt: item.publishedAt?.toISOString() ?? null,
        sourceSnapshot: snapshot,
        mimeType: item.mimeType ?? (item.sourceUrl.toLowerCase().includes(".pdf") ? "application/pdf" : "text/html"),
        checksum: itemHash,
      })
      .onConflictDoNothing()
      .returning({ id: documentSources.id });

    if (!observation) {
      if (createdDocument) await tx.delete(documents).where(eq(documents.id, documentId));
      return { created: false, updated: false, unlinked: entityLinks.length === 0 };
    }

    if (entityLinks.length) {
      await tx.insert(documentEntities).values(
        entityLinks.map((link) => ({
          documentId,
          entityId: link.entityId,
          relation: link.relation,
          evidence: link.evidence,
          confidence: link.confidence,
          mappingMethod: link.mappingMethod,
        })),
      ).onConflictDoNothing();
    }

    return {
      created: createdDocument,
      updated: !createdDocument,
      unlinked: entityLinks.length === 0,
    };
  });
}

async function syncOneSource(config: ScrapeSourceConfig, activeEntities: EntityRecord[]) {
  const sourceId = await upsertSource(config);
  const [run] = await db.insert(ingestionRuns).values({ sourceId }).returning({ id: ingestionRuns.id });
  if (!run) throw new Error(`Could not start ingestion run for ${config.key}`);

  let itemsRead = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let unlinkedItems = 0;

  try {
    const items = await fetchItems(config);
    itemsRead = items.length;

    for (const item of items) {
      const result = await storeItem(config, sourceId, item, activeEntities);
      if (result.created) recordsCreated += 1;
      if (result.updated) recordsUpdated += 1;
      if (result.unlinked) unlinkedItems += 1;
    }

    await db.update(sources)
      .set({ lastSuccessfulRunAt: new Date(), updatedAt: new Date() })
      .where(eq(sources.id, sourceId));
    await db.update(ingestionRuns)
      .set({ status: "succeeded", finishedAt: new Date(), pagesRead: 1, itemsRead, recordsCreated, recordsUpdated })
      .where(eq(ingestionRuns.id, run.id));

    return { sourceKey: config.key, itemsRead, recordsCreated, recordsUpdated, unlinkedItems, status: "succeeded" as const };
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown scraper error";
    await db.update(ingestionRuns)
      .set({ status: "failed", finishedAt: new Date(), pagesRead: 1, itemsRead, recordsCreated, recordsUpdated, errorSummary })
      .where(eq(ingestionRuns.id, run.id));
    return { sourceKey: config.key, itemsRead, recordsCreated, recordsUpdated, unlinkedItems, status: "failed" as const, error: errorSummary };
  }
}

export async function syncScrapedSources() {
  const activeEntities = await db
    .select({ id: entities.id, slug: entities.slug })
    .from(entities)
    .where(eq(entities.active, true));

  const results = [];
  for (const config of SCRAPE_SOURCES) {
    results.push(await syncOneSource(config, activeEntities));
  }
  return results;
}
