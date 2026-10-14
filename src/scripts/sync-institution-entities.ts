import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

loadEnvConfig(process.cwd());

const aliasesByInstitutionId: Record<string, string[]> = {
  "republic-of-india": ["India", "Bharat", "Union of India"],
  "union-government": [
    "Government of India",
    "Union Government",
    "Central Government",
  ],
  "president-of-india": ["President", "Rashtrapati", "राष्ट्रपति"],
  "vice-president-of-india": [
    "Vice President",
    "Vice-President",
    "VP",
    "उपराष्ट्रपति",
  ],
  "prime-minister-of-india": [
    "Prime Minister",
    "PM",
    "Pradhan Mantri",
    "प्रधानमंत्री",
  ],
  "prime-ministers-office": [
    "PMO",
    "Prime Minister Office",
    "प्रधानमंत्री कार्यालय",
  ],
  "presidents-secretariat": [
    "President's Office",
    "Rashtrapati Secretariat",
    "राष्ट्रपति सचिवालय",
  ],
  "cabinet-secretariat": ["Cabinet Secretariat of India", "CabSec"],
  "national-security-council-secretariat": [
    "NSCS",
    "National Security Council Secretariat of India",
  ],
  "department-of-atomic-energy": ["DAE"],
  "department-of-space": ["DoS", "Indian Space Department"],
  "niti-aayog": ["NITI", "National Institution for Transforming India"],
  "union-parliament": ["Parliament", "Sansad", "Indian Parliament"],
  "lok-sabha": ["House of the People", "Lok Sabha Secretariat", "Lower House"],
  "rajya-sabha": [
    "Council of States",
    "Rajya Sabha Secretariat",
    "Upper House",
  ],
  "ministry-home-affairs": ["MHA", "Home Ministry", "Ministry of Home Affairs"],
  "ministry-external-affairs": [
    "MEA",
    "External Affairs Ministry",
    "Ministry of External Affairs",
  ],
  "ministry-finance-department-economic-affairs": ["DEA"],
  "ministry-finance-department-financial-services": ["DFS"],
  "supreme-court-of-india": [
    "Supreme Court",
    "SCI",
    "Apex Court",
    "भारत का सर्वोच्च न्यायालय",
  ],
  "election-commission-of-india": [
    "ECI",
    "Election Commission",
    "भारत निर्वाचन आयोग",
  ],
  upsc: ["Union Public Service Commission", "संघ लोक सेवा आयोग"],
  "cag-of-india": [
    "CAG",
    "Comptroller and Auditor General",
    "नियंत्रक एवं महालेखा परीक्षक",
  ],
  "finance-commission": ["Finance Commission of India"],
  "attorney-general-of-india": ["Attorney General", "AGI"],
  "national-commission-for-scheduled-castes": ["NCSC"],
  "national-commission-for-scheduled-tribes": ["NCST"],
  "national-commission-for-backward-classes": ["NCBC"],
  "gst-council": ["GST Council", "Goods and Services Tax Council"],
  "gram-panchayat": ["Gram Panchayat", "Village Panchayat"],
  "intermediate-panchayat": ["Panchayat Samiti", "Block Panchayat"],
  "district-panchayat": ["Zila Parishad", "District Panchayat"],
  "nagar-panchayat": ["Nagar Panchayat", "Town Panchayat"],
  "municipal-council": ["Municipality", "Municipal Council"],
  "municipal-corporation": ["Corporation", "Municipal Corporation"],
};

const entitySlugByInstitutionId: Record<string, string> = {
  "prime-minister-of-india": "prime-minister",
  "union-parliament": "parliament-of-india",
  "ministry-home-affairs": "ministry-of-home-affairs",
  "ministry-external-affairs": "ministry-of-external-affairs",
  "ministry-finance-department-economic-affairs":
    "department-of-economic-affairs",
  "ministry-finance-department-financial-services":
    "department-of-financial-services",
};

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function deriveAliases(id: string, name: string, kind: string) {
  const aliases = new Set(aliasesByInstitutionId[id] ?? []);
  const parenthetical = name.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (parenthetical) {
    aliases.add(parenthetical[1].trim());
    aliases.add(parenthetical[2].trim());
  }

  if (kind === "state") {
    aliases.add(`Government of ${name}`);
    aliases.add(`${name} Government`);
  } else if (kind === "union territory") {
    aliases.add(`Union Territory of ${name.replace(/\s*\([^)]*\)/g, "")}`);
    aliases.add(`${name.replace(/\s*\([^)]*\)/g, "")} Administration`);
  } else if (kind === "court" && name.endsWith(" High Court")) {
    aliases.add(`High Court of ${name.slice(0, -" High Court".length)}`);
  } else if (kind === "department" && name.startsWith("Department of ")) {
    aliases.add(`${name.slice("Department of ".length)} Department`);
  }

  return [...aliases].filter((alias) => alias.trim().length > 2);
}

function mapEntityType(
  kind: string,
): "office" | "institution" | "ministry" | "department" | "court" {
  if (
    kind === "office" ||
    kind === "ministry" ||
    kind === "department" ||
    kind === "court"
  )
    return kind;
  return "institution";
}

async function main() {
  const [{ db, closeDatabase }, { entities }, { institutionMap }] =
    await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("@/data/institution-map"),
    ]);

  try {
    const mapRows = institutionMap.map((institution) => ({
      slug: entitySlugByInstitutionId[institution.id] ?? slug(institution.id),
      name: institution.name,
      type: mapEntityType(institution.kind),
      aliases: deriveAliases(
        institution.id,
        institution.name,
        institution.kind,
      ),
      description: institution.description,
      active: true,
    }));
    const supplementalRows = [
      {
        slug: "presidents-secretariat",
        name: "President's Secretariat",
        type: "office" as const,
        aliases: aliasesByInstitutionId["presidents-secretariat"],
        description: "The office supporting the President of India.",
        active: true,
      },
      {
        slug: "press-information-bureau",
        name: "Press Information Bureau",
        type: "institution" as const,
        aliases: ["PIB"],
        description: "Government of India press release publisher.",
        active: true,
      },
    ];
    const rows = [...mapRows, ...supplementalRows];
    const slugCounts = new Map<string, number>();
    for (const row of rows)
      slugCounts.set(row.slug, (slugCounts.get(row.slug) ?? 0) + 1);
    const collisions = [...slugCounts]
      .filter(([, count]) => count > 1)
      .map(([entitySlug]) => entitySlug);
    if (collisions.length)
      throw new Error(`Institution slug collision: ${collisions.join(", ")}`);

    const existing = await db
      .select({ slug: entities.slug, aliases: entities.aliases })
      .from(entities);
    const existingBySlug = new Map(
      existing.map((entity) => [entity.slug, entity.aliases]),
    );
    const mergedRows = rows.map((row) => ({
      ...row,
      aliases: [
        ...new Set([...(existingBySlug.get(row.slug) ?? []), ...row.aliases]),
      ],
    }));

    const saved = await db
      .insert(entities)
      .values(mergedRows)
      .onConflictDoUpdate({
        target: entities.slug,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          aliases: sql`excluded.aliases`,
          description: sql`excluded.description`,
          active: true,
          updatedAt: new Date(),
        },
      })
      .returning({ slug: entities.slug });

    console.log(
      `Synchronized ${saved.length} of ${rows.length} entities (${mapRows.length} institution-map nodes and ${supplementalRows.length} supplemental entities).`,
    );
    console.log(`Existing database entities before sync: ${existing.length}.`);
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unexpected institution entity sync error";
  console.error(`Institution entities were not synchronized: ${message}`);
  process.exitCode = 1;
});
