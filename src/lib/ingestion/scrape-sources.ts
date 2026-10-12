export type ScrapeSourceKey =
  | "supreme-court-press-releases"
  | "pm-india-news-updates"
  | "president-press-releases"
  | "lok-sabha-press-releases"
  | "rajya-sabha-press-releases"
  | "dea-press-releases"
  | "dfs-press-releases"
  | "vice-president-news-updates"
  | "mea-press-releases"
  | "cag-press-releases"
  | "election-commission-press-releases"
  | "cabinet-secretariat-decisions";

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
    entityLinks: [
      institutionLink("prime-ministers-office", "Prime Minister's Office"),
      {
        slug: "prime-minister",
        relation: "about",
        evidence: "The official PM India news update concerns the work of the Prime Minister.",
        confidence: 0.95,
        mappingMethod: "official_source_subject_entity",
      },
    ],
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
    key: "vice-president-news-updates",
    name: "Vice President of India — News Updates",
    siteUrl: "https://vicepresidentofindia.nic.in",
    listingUrl: "https://vicepresidentofindia.nic.in/news-updates/",
    contentScope: "Current news and event updates on the official Vice President website; this section contains more than formal press releases.",
    parser: "vice-president-news-updates",
    defaultDocumentType: "other",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("vice-president-of-india", "Vice President of India")],
  },
  {
    key: "cabinet-secretariat-decisions",
    name: "Cabinet Secretariat — Cabinet Decisions",
    siteUrl: "https://www.cabsec.gov.in",
    listingUrl: "https://www.cabsec.gov.in/more/pressreleases/",
    contentScope: "Cabinet decisions from the PIB listing linked by the Cabinet Secretariat's official page.",
    parser: "cabinet-secretariat-decisions",
    defaultDocumentType: "other",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    allowedHosts: ["pib.gov.in"],
    entityLinks: [institutionLink("cabinet-secretariat", "Cabinet Secretariat")],
  },
  {
    key: "mea-press-releases",
    name: "Ministry of External Affairs — Press Releases",
    siteUrl: "https://www.mea.gov.in",
    listingUrl: "https://www.mea.gov.in/FrontEnd/FetchPublicationListingData?publicationId=51&KeywordName=&SortBy=Date&page=1&PageSize=10&DateRange=&IsInternalMEA=false&PLngId=1",
    contentScope: "English press releases returned by MEA's official publication-listing endpoint.",
    parser: "mea-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("ministry-of-external-affairs", "Ministry of External Affairs")],
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
    listingUrl: "https://dea.gov.in/documents-press-release?page=0",
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
  {
    key: "election-commission-press-releases",
    name: "Election Commission of India — Press Releases",
    siteUrl: "https://www.eci.gov.in",
    listingUrl: "https://www.eci.gov.in/964-press-releases",
    contentScope: "Latest English press notes from ECI's public press-release API used by its official website.",
    parser: "election-commission-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    entityLinks: [institutionLink("election-commission-of-india", "Election Commission of India")],
  },
  {
    key: "cag-press-releases",
    name: "Comptroller and Auditor General of India — Press Releases",
    siteUrl: "https://www.cag.gov.in",
    listingUrl: "https://www.cag.gov.in/en/press-release",
    contentScope: "Current CAG press releases; the official listing links to the published PDF documents.",
    parser: "cag-press-releases",
    defaultDocumentType: "press_release",
    defaultLanguage: "en",
    pollIntervalMinutes: 2,
    allowedHosts: ["d7i5wg8xwe4hf.cloudfront.net"],
    entityLinks: [institutionLink("cag-of-india", "Comptroller and Auditor General of India")],
  },
];
