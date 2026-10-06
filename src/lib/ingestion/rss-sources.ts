export type RssSourceConfig = {
  key: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  contentScope: string;
  defaultDocumentType: "press_release" | "other";
  issuerEntitySlug?: string;
  matchTitleToEntityNames?: boolean;
  defaultLanguage: string;
};

// Feed URLs were confirmed from the sites' own RSS links/declarations.
export const RSS_SOURCES: RssSourceConfig[] = [
  {
    key: "pib-press-releases",
    name: "Press Information Bureau — Press Releases",
    siteUrl: "https://www.pib.gov.in/AllRelease.aspx?lang=1&reg=1",
    feedUrl: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3",
    contentScope: "PIB's general press-release RSS. Issuer is not included in the feed; title matching is conservative.",
    defaultDocumentType: "press_release",
    matchTitleToEntityNames: true,
    defaultLanguage: "en",
  },
  {
    key: "mha-current-affairs",
    name: "Ministry of Home Affairs — Current Affairs",
    siteUrl: "https://www.mha.gov.in/en/current-affairs",
    feedUrl: "http://www.mha.gov.in/en/taxonomy/term/2347/feed",
    contentScope: "MHA Current Affairs RSS. This mixed feed can include items beyond press releases.",
    defaultDocumentType: "other",
    issuerEntitySlug: "ministry-of-home-affairs",
    defaultLanguage: "en",
  },
];
