import { institutionMap } from "@/data/institution-map";

export type FollowPackage = {
  id: string;
  title: string;
  description: string;
  icon: string;
  entitySlugs: string[];
  featured?: boolean;
};

const slug = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const unionPackages: FollowPackage[] = [
  {
    id: "union-executive",
    title: "Union Executive",
    description: "Follow the President, Prime Minister, PMO, Cabinet and Union executive.",
    icon: "◎",
    featured: true,
    entitySlugs: ["union-government", "union-executive", "president-of-india", "vice-president-of-india", "prime-minister", "council-of-ministers", "prime-ministers-office", "cabinet-secretariat"],
  },
  {
    id: "parliament-and-courts",
    title: "Parliament & Courts",
    description: "Follow Parliament, both Houses, the Supreme Court and High Courts.",
    icon: "§",
    featured: true,
    entitySlugs: ["parliament-of-india", "lok-sabha", "rajya-sabha", "judiciary", "supreme-court-of-india", "high-courts-of-india", "subordinate-courts"],
  },
  {
    id: "finance-and-economy",
    title: "Finance & Economy",
    description: "Track the Finance Ministry, its key departments, GST Council and Finance Commission.",
    icon: "₹",
    featured: true,
    entitySlugs: ["ministry-finance", "department-of-economic-affairs", "ministry-finance-department-expenditure", "ministry-finance-department-revenue", "department-of-financial-services", "ministry-finance-department-investment-and-public-asset-management", "ministry-finance-department-public-enterprises", "finance-commission", "gst-council", "cag-of-india"],
  },
  {
    id: "infrastructure-and-energy",
    title: "Infrastructure & Energy",
    description: "Follow transport, urban development, water, power and energy institutions.",
    icon: "↗",
    featured: true,
    entitySlugs: ["ministry-road-transport-and-highways", "ministry-railways", "ministry-ports-shipping-and-waterways", "ministry-civil-aviation", "ministry-housing-and-urban-affairs", "ministry-jal-shakti", "ministry-power", "ministry-new-and-renewable-energy", "ministry-coal", "ministry-petroleum-and-natural-gas"],
  },
  {
    id: "external-affairs-and-security",
    title: "Foreign Affairs & Security",
    description: "Follow External Affairs, Defence, Home Affairs and national security.",
    icon: "◇",
    featured: true,
    entitySlugs: ["ministry-of-external-affairs", "ministry-defence", "ministry-of-home-affairs", "national-security-council-secretariat", "ministry-home-affairs-department-internal-security", "ministry-home-affairs-department-border-management"],
  },
  {
    id: "health-and-education",
    title: "Health & Education",
    description: "Follow the Union health and education ministries and their key departments.",
    icon: "+",
    entitySlugs: ["ministry-health-and-family-welfare", "ministry-health-and-family-welfare-department-health-research", "ministry-education", "ministry-education-department-school-education-and-literacy", "ministry-education-department-higher-education"],
  },
  {
    id: "agriculture-and-rural-life",
    title: "Agriculture & Rural Life",
    description: "Follow agriculture, rural development, food distribution and Panchayati Raj.",
    icon: "⌂",
    entitySlugs: ["ministry-agriculture-and-farmers-welfare", "ministry-agriculture-and-farmers-welfare-department-agriculture-and-farmers-welfare", "ministry-agriculture-and-farmers-welfare-department-agricultural-research-and-education", "ministry-rural-development", "ministry-panchayati-raj", "ministry-consumer-affairs-food-and-public-distribution"],
  },
  {
    id: "science-and-digital-india",
    title: "Science & Digital India",
    description: "Follow science, space, atomic energy, electronics and information technology.",
    icon: "⌘",
    entitySlugs: ["ministry-science-and-technology", "department-of-space", "department-of-atomic-energy", "ministry-electronics-and-information-technology", "ministry-communications", "ministry-science-and-technology-department-biotechnology"],
  },
];

const stateStructureSlugs = [
  "state-government-structure",
  "state-governor",
  "state-chief-minister-and-council",
  "state-legislature",
  "state-departments",
  "state-public-service-commissions",
  "state-election-commissions",
];

const statePackages: FollowPackage[] = institutionMap
  .filter((institution) => institution.kind === "state")
  .map((state) => ({
    id: `state-${slug(state.name)}`,
    title: `${state.name} Institutions`,
    description: `Follow ${state.name} and the shared State-level government, legislature, public service and election institution categories.`,
    icon: "⌖",
    entitySlugs: [`state-${slug(state.name)}`, ...stateStructureSlugs],
  }));

const territoryPackages: FollowPackage[] = institutionMap
  .filter((institution) => institution.kind === "union territory")
  .map((territory) => ({
    id: `territory-${slug(territory.name)}`,
    title: `${territory.name} Administration`,
    description: `Follow ${territory.name} and the shared Union Territory administration categories.`,
    icon: "⌖",
    entitySlugs: [`ut-${slug(territory.name)}`, "ut-government-structure", "ut-administrator", "ut-legislature", "ut-departments"],
  }));

export const followPackages = [...unionPackages, ...statePackages, ...territoryPackages];
