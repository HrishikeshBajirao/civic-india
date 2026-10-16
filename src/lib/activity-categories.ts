export const activityCategories = [
  { id: "ceremonial", label: "Ceremonies & public engagements" },
  { id: "diplomacy", label: "Diplomacy & international relations" },
  { id: "meetings", label: "Meetings & consultations" },
  { id: "policy", label: "Policy, law & cabinet decisions" },
  { id: "schemes", label: "Schemes & public services" },
  { id: "appointments", label: "Appointments, awards & honours" },
  { id: "economy", label: "Economy, trade & infrastructure" },
  { id: "justice", label: "Courts, rights & enforcement" },
  { id: "notices", label: "Notices, recruitment & results" },
  { id: "emergency", label: "Emergencies, relief & public safety" },
  { id: "other", label: "Other updates" },
] as const;

export type ActivityCategoryId = (typeof activityCategories)[number]["id"];

const categoryPatterns: Record<Exclude<ActivityCategoryId, "other">, RegExp> = {
  ceremonial:
    /\b(inaugurat\w*|lamp\s*light\w*|light\w*\s+(?:the\s+)?lamp|foundation\s+stone|laid\s+the\s+foundation|flag\s+hoist\w*|flagged\s+off|dedicat\w*\s+to\s+the\s+nation|commemorat\w*|paid\s+tribute|paying\s+homage|birth\s+anniversary|public\s+engagement|ceremonial|convocation|visit\w*|address\w*\s+the\s+gathering)\b/i,
  diplomacy:
    /\b(diplomat\w*|ambassador\w*|high\s+commission\w*|bilateral|foreign\s+minister\w*|state\s+visit|delegation|international\s+relation\w*|summit|memorandum\s+of\s+understanding|\bmo[uU]\b|treaty|consular)\b/i,
  meetings:
    /\b(meeting|held\s+talks|consultation\w*|review\s+meeting|conference|roundtable|interaction\s+with|delegation\s+met|chair\w*\s+a\s+meeting)\b/i,
  policy:
    /\b(bill|act\s+\d{4}|ordinance|cabinet|policy|rule\w*|regulation\w*|guideline\w*|amendment|parliament|legislation|approved|approval|resolution)\b/i,
  schemes:
    /\b(scheme|yojana|programme|program|beneficiar\w*|public\s+service|welfare|subsid\w*|launched\s+\w*\s+(?:scheme|portal|service|mission)|mission)\b/i,
  appointments:
    /\b(appoint\w*|assum\w*\s+charge|takes?\s+charge|sworn\s+in|oath\s+of\s+office|award\w*|honou?r\w*|medal|promot\w*|selected\s+as)\b/i,
  economy:
    /\b(econom\w*|budget|tax\w*|trade|investment|infrastructure|highway|railway|airport|port\b|power\s+project|manufactur\w*|gdp|employment|industry)\b/i,
  justice:
    /\b(supreme\s+court|high\s+court|judg\w*|court\s+order|judgment|justice|rights|legal|law\s+enforcement|investigation|arrest\w*|prosecut\w*|commission\s+of\s+inquiry)\b/i,
  notices:
    /\b(public\s+notice|notification|recruit\w*|vacanc\w*|admit\s+card|examination|exam\s+result|result\w*|tender\w*|corrigendum|application\s+deadline)\b/i,
  emergency:
    /\b(disaster|emergency|relief|rescue|flood\w*|cyclone|earthquake|heatwave|public\s+safety|epidemic|outbreak|evacuat\w*|compensation\s+for\s+victim\w*)\b/i,
};

export function classifyActivity(text: string): ActivityCategoryId[] {
  const matches = (
    Object.entries(categoryPatterns) as [
      Exclude<ActivityCategoryId, "other">,
      RegExp,
    ][]
  )
    .filter(([, pattern]) => pattern.test(text))
    .map(([id]) => id);

  return matches.length > 0 ? matches : ["other"];
}
