export type ScrapeSourceKey =
  | "supreme-court-press-releases"
  | "pm-india-news-updates"
  | "president-press-releases"
  | "lok-sabha-press-releases"
  | "rajya-sabha-press-releases"
  | "dea-press-releases"
  | "dfs-press-releases";

export type ScrapedEntityLink = {
  slug: string;
  relation: "issuer" | "about";
  evidence: string;
  confidence: number;
  mappingMethod: string;
};

export type ScrapeSourceConfig = {
  key: ScrapeSourceKey;
  name: string;
  siteUrl: string;
  listingUrl: string;
  contentScope: string;
  parser: ScrapeSourceKey;
  defaultDocumentType: "press_release" | "other";
  defaultLanguage: string;
  pollIntervalMinutes: number;
  allowedHosts?: string[];
  entityLinks: ScrapedEntityLink[];
};

const institutionLink = (slug: string, name: string): ScrapedEntityLink => ({
  slug,
  relation: "issuer",
  evidence: `The official ${name} release listing published this item.`,
  confidence: 1,
  mappingMethod: "official_source_entity",
});

export const SCRAPE_SOURCES: ScrapeSourceConfig[] = [
  {
    key: "supreme-court-press-releases",
    name: "Supreme Court of India — Press Releases",
    siteUrl: "https://www.sci.gov.in",
    listingUrl: "https://www.sci.gov.in/press-release/",
    contentScope: "Current press releases shown on the Supreme Court of India listing.",
    parser: "supreme-court-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("supreme-court-of-india", "Supreme Court of India")],
  },
  {
    key: "pm-india-news-updates",
    name: "Prime Minister of India — News Updates",
    siteUrl: "https://www.pmindia.gov.in",
    listingUrl: "https://www.pmindia.gov.in/en/news-updates/",
    contentScope: "Latest PM India news updates. This section includes more than formal press releases.",
    parser: "pm-india-news-updates",
    defaultDocumentType: "other",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("prime-ministers-office", "Prime Minister's Office")],
  },
  {
    key: "president-press-releases",
    name: "President of India — Press Releases",
    siteUrl: "https://presidentofindia.nic.in",
    listingUrl: "https://presidentofindia.nic.in/press-release?page=0",
    contentScope: "Latest press releases issued by the President of India.",
    parser: "president-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [
      institutionLink("presidents-secretariat", "President's Secretariat"),
      {
        slug: "president-of-india",
        relation: "about",
        evidence: "This is an item on the official President of India press-release listing.",
        confidence: 1,
        mappingMethod: "official_source_entity",
      },
    ],
  },
  {
    key: "lok-sabha-press-releases",
    name: "Digital Sansad — Lok Sabha Press Releases",
    siteUrl: "https://sansad.in",
    listingUrl: "https://sansad.in/ls/pressRelease",
    contentScope: "Latest English press releases returned by the public listing API used by Digital Sansad.",
    parser: "lok-sabha-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [
      institutionLink("lok-sabha", "Lok Sabha"),
      {
        slug: "parliament-of-india",
        relation: "about",
        evidence: "The Lok Sabha is a house of the Parliament of India; this release is issued by Lok Sabha.",
        confidence: 1,
        mappingMethod: "official_source_parent_institution",
      },
    ],
  },
  {
    key: "rajya-sabha-press-releases",
    name: "Digital Sansad — Rajya Sabha Press Releases",
    siteUrl: "https://sansad.in",
    listingUrl: "https://sansad.in/rs/pressRelease",
    contentScope: "Other Press Releases returned by the public API used by the Rajya Sabha listing.",
    parser: "rajya-sabha-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    allowedHosts: ["bucketapi.rajyasabha.digital"],
    entityLinks: [
      institutionLink("rajya-sabha", "Rajya Sabha"),
      {
        slug: "parliament-of-india",
        relation: "about",
        evidence: "The Rajya Sabha is a house of the Parliament of India; this release is issued by Rajya Sabha.",
        confidence: 1,
        mappingMethod: "official_source_parent_institution",
      },
    ],
  },
  {
    key: "dea-press-releases",
    name: "Department of Economic Affairs — Press Releases",
    siteUrl: "https://dea.gov.in",
    listingUrl: "https://dea.gov.in/index.php/documents-press-release?page=0",
    contentScope: "Latest press-release records on the Department of Economic Affairs listing.",
    parser: "dea-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("department-of-economic-affairs", "Department of Economic Affairs")],
  },
  {
    key: "dfs-press-releases",
    name: "Department of Financial Services — Press Releases",
    siteUrl: "https://financialservices.gov.in",
    listingUrl: "https://financialservices.gov.in/press-release",
    contentScope: "Latest Department of Financial Services listing records. Original release links may point to PIB.",
    parser: "dfs-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    allowedHosts: ["pib.gov.in"],
    entityLinks: [institutionLink("department-of-financial-services", "Department of Financial Services")],
  },
];
