export type InstitutionKind =
  | "branch"
  | "office"
  | "institution"
  | "ministry"
  | "department"
  | "court"
  | "state"
  | "union territory"
  | "local government";

export type Institution = {
  id: string;
  name: string;
  kind: InstitutionKind;
  parentId: string | null;
  description: string;
  website?: string;
  directoryUrl?: string;
};

export type InstitutionRelation = {
  from: string;
  to: string;
  label: string;
  reverseLabel?: string;
};

export const sources = {
  directory: "https://igod.gov.in/about_us",
  unionMinistries: "https://igod.gov.in/ug/E002/organizations",
  unionDepartments: "https://igod.gov.in/ug/E003/organizations",
  allocationRules: "https://cabsec.gov.in/allocationofbusinessrules/",
  firstSchedule:
    "https://cabsec.gov.in/writereaddata/allocationbusinessrule/firstschedule/english/1_Upload_4266.pdf",
  constitution:
    "https://www.legislative.gov.in/static/uploads/2025/07/359f70a69695affb9d72f8393102bd2e.pdf",
  statesAndUts: "https://www.india.gov.in/directory/web-directory/state-uts",
  supremeCourt: "https://www.sci.gov.in/constitution/",
  highCourts: "https://www.sci.gov.in/jurisdiction/",
  panchayatiRaj: "https://panchayat.gov.in/en/about-mopr/",
  electionCommission: "https://www.eci.gov.in/about-eci/",
  upsc: "https://www.upsc.gov.in/about-us/constitutional-provisions/article-315-public-service-commissions-union-and-states",
  cag: "https://cag.gov.in/en/pages/single/2",
} as const;

const directory = sources.directory;
const ministryDirectory = sources.unionMinistries;
const departmentDirectory = sources.unionDepartments;
const institutions: Institution[] = [];

function add(
  id: string,
  name: string,
  kind: InstitutionKind,
  parentId: string | null,
  description: string,
  website?: string,
  directoryUrl: string = directory,
) {
  institutions.push({ id, name, kind, parentId, description, website, directoryUrl });
}

add(
  "republic-of-india",
  "Republic of India",
  "branch",
  null,
  "A constitutional republic with institutions at Union, State and local levels. This map is a sourced guide to the main structures, not a live register of every public body.",
  undefined,
  sources.constitution,
);

add("union-government", "Union institutions", "branch", "republic-of-india", "Institutions exercising Union-level executive and legislative functions.");
add("union-executive", "Union executive", "branch", "union-government", "The Union executive includes the President and the Council of Ministers headed by the Prime Minister. The Constitution and law define each office's powers.", undefined, sources.constitution);
add("president-of-india", "President of India", "office", "union-executive", "The constitutional head of the Union. The President is also a constituent part of Parliament under Article 79.", "https://presidentofindia.nic.in", sources.constitution);
add("vice-president-of-india", "Vice-President of India", "office", "union-executive", "The Vice-President is ex officio Chairperson of the Council of States (Rajya Sabha).", "https://vicepresidentofindia.nic.in", sources.constitution);
add("prime-minister-of-india", "Prime Minister of India", "office", "union-executive", "Heads the Council of Ministers, which aids and advises the President under the Constitution.", "https://www.pmindia.gov.in", sources.constitution);
add("council-of-ministers", "Union Council of Ministers", "institution", "union-executive", "The Council of Ministers is collectively responsible to the House of the People (Lok Sabha).", undefined, sources.constitution);
add("prime-ministers-office", "Prime Minister's Office", "office", "union-executive", "Supports the Prime Minister in official work and coordination.", "https://www.pmindia.gov.in/en/prime-ministers-office/");
add("cabinet-secretariat", "Cabinet Secretariat", "office", "union-executive", "Supports Cabinet and Cabinet Committee work and administers the Allocation of Business and Transaction of Business Rules.", "https://cabsec.gov.in", sources.allocationRules);
add("national-security-council-secretariat", "National Security Council Secretariat", "office", "union-executive", "Supports national security decision-making and coordination.", undefined, directory);
add("department-of-atomic-energy", "Department of Atomic Energy", "department", "union-executive", "A department of the Government of India listed in the Allocation of Business First Schedule.", undefined, sources.firstSchedule);
add("department-of-space", "Department of Space", "department", "union-executive", "A department of the Government of India listed in the Allocation of Business First Schedule.", undefined, sources.firstSchedule);
add("niti-aayog", "NITI Aayog", "institution", "union-executive", "The Government of India's public policy think tank.", "https://www.niti.gov.in");

add("union-parliament", "Parliament of India", "branch", "union-government", "Under Article 79, Parliament consists of the President and two Houses: the Council of States and the House of the People.", "https://sansad.in", sources.constitution);
add("lok-sabha", "Lok Sabha (House of the People)", "institution", "union-parliament", "The directly elected House of Parliament. The Council of Ministers is collectively responsible to this House.", "https://sansad.in/ls", sources.constitution);
add("rajya-sabha", "Rajya Sabha (Council of States)", "institution", "union-parliament", "The Council of States; the Vice-President of India is its ex officio Chairperson.", "https://sansad.in/rs", sources.constitution);

add("union-ministries", "Union ministries and departments", "branch", "union-government", "Ministries and departments are listed in the First Schedule to the Government of India (Allocation of Business) Rules. Department names and portfolios can change by amendment.", undefined, sources.firstSchedule);

type Ministry = { name: string; departments?: string[] };
const ministries: Ministry[] = [
  { name: "Agriculture and Farmers Welfare", departments: ["Agriculture and Farmers Welfare", "Agricultural Research and Education"] },
  { name: "AYUSH" },
  { name: "Chemicals and Fertilizers", departments: ["Chemicals and Petro-Chemicals", "Fertilizers", "Pharmaceuticals"] },
  { name: "Civil Aviation" },
  { name: "Coal" },
  { name: "Commerce and Industry", departments: ["Commerce", "Promotion of Industry and Internal Trade"] },
  { name: "Communications", departments: ["Telecommunications", "Posts"] },
  { name: "Consumer Affairs, Food and Public Distribution", departments: ["Consumer Affairs", "Food and Public Distribution"] },
  { name: "Cooperation" },
  { name: "Corporate Affairs" },
  { name: "Culture" },
  { name: "Defence", departments: ["Defence", "Military Affairs", "Defence Production", "Defence Research and Development", "Ex-Servicemen Welfare"] },
  { name: "Development of North Eastern Region" },
  { name: "Earth Sciences" },
  { name: "Electronics and Information Technology" },
  { name: "Environment, Forest and Climate Change" },
  { name: "External Affairs" },
  { name: "Finance", departments: ["Economic Affairs", "Expenditure", "Revenue", "Investment and Public Asset Management", "Financial Services", "Public Enterprises"] },
  { name: "Fisheries, Animal Husbandry and Dairying", departments: ["Fisheries", "Animal Husbandry and Dairying"] },
  { name: "Food Processing Industries" },
  { name: "Health and Family Welfare", departments: ["Health and Family Welfare", "Health Research"] },
  { name: "Heavy Industries" },
  { name: "Home Affairs", departments: ["Internal Security", "States", "Official Language", "Home", "Jammu, Kashmir and Ladakh Affairs", "Border Management"] },
  { name: "Housing and Urban Affairs", departments: ["Capital Development", "Urban Development"] },
  { name: "Education", departments: ["School Education and Literacy", "Higher Education"] },
  { name: "Information and Broadcasting" },
  { name: "Jal Shakti", departments: ["Water Resources, River Development and Ganga Rejuvenation", "Drinking Water and Sanitation"] },
  { name: "Labour and Employment" },
  { name: "Law and Justice", departments: ["Legal Affairs", "Legislative", "Justice"] },
  { name: "Micro, Small and Medium Enterprises" },
  { name: "Mines" },
  { name: "Minority Affairs" },
  { name: "New and Renewable Energy" },
  { name: "Panchayati Raj" },
  { name: "Parliamentary Affairs" },
  { name: "Personnel, Public Grievances and Pensions", departments: ["Personnel and Training", "Administrative Reforms and Public Grievances", "Pensions and Pensioners Welfare"] },
  { name: "Petroleum and Natural Gas" },
  { name: "Planning" },
  { name: "Ports, Shipping and Waterways" },
  { name: "Power" },
  { name: "Railways" },
  { name: "Road Transport and Highways" },
  { name: "Rural Development", departments: ["Rural Development", "Land Resources"] },
  { name: "Science and Technology", departments: ["Science and Technology", "Scientific and Industrial Research", "Biotechnology"] },
  { name: "Skill Development and Entrepreneurship" },
  { name: "Social Justice and Empowerment", departments: ["Social Justice and Empowerment", "Empowerment of Persons with Disabilities"] },
  { name: "Statistics and Programme Implementation" },
  { name: "Steel" },
  { name: "Textiles" },
  { name: "Tourism" },
  { name: "Tribal Affairs" },
  { name: "Women and Child Development" },
  { name: "Youth Affairs and Sports", departments: ["Youth Affairs", "Sports"] },
];

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

for (const ministry of ministries) {
  const ministryId = `ministry-${slug(ministry.name)}`;
  add(ministryId, `Ministry of ${ministry.name}`, "ministry", "union-ministries", `A Union ministry named in the current First Schedule to the Allocation of Business Rules. See the official directory for its current website and organizations.`, undefined, ministryDirectory);
  for (const department of ministry.departments ?? []) {
    const departmentId = `${ministryId}-department-${slug(department)}`;
    add(departmentId, `Department of ${department}`, "department", ministryId, `A department listed under the Ministry of ${ministry.name} in the current First Schedule to the Allocation of Business Rules.`, undefined, sources.firstSchedule);
  }
}

add("state-and-ut-governments", "State and Union Territory governments", "branch", "republic-of-india", "India has State governments and Union Territory administrations. Their constitutional and administrative arrangements differ; the entries below identify the jurisdictions, not every office within them.", undefined, sources.statesAndUts);
add("state-government-structure", "Typical State government institutions", "branch", "state-and-ut-governments", "A high-level pattern for browsing only. State constitutions, legislation, departments, and institutional arrangements vary; use the State's official portal for its actual structure.", undefined, sources.directory);
add("state-governor", "Governor", "office", "state-government-structure", "The constitutional office at State level. The Governor's powers and functions are set out in the Constitution.", undefined, sources.constitution);
add("state-chief-minister-and-council", "Chief Minister and State Council of Ministers", "institution", "state-government-structure", "The State's elected government is led by the Chief Minister and Council of Ministers, which is collectively responsible to the State Legislative Assembly.", undefined, sources.constitution);
add("state-legislature", "State Legislature", "institution", "state-government-structure", "State legislatures may have one or two Houses, as provided by the Constitution and law.", undefined, sources.constitution);
add("state-departments", "State departments and agencies", "branch", "state-government-structure", "State departments and agencies administer subjects assigned to the State. The directory lists organizations State by State.", undefined, sources.directory);
add("state-public-service-commissions", "State Public Service Commissions", "institution", "state-government-structure", "The Constitution provides for a Public Service Commission for each State; a Joint Commission may serve multiple States.", undefined, sources.upsc);
add("states-of-india", "States", "branch", "state-and-ut-governments", "The official National Portal lists India's current States and Union Territories.", undefined, sources.statesAndUts);
const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
for (const state of states) {
  add(`state-${slug(state)}`, state, "state", "states-of-india", `A constituent State of the Republic of India. The State's own official portal and institutions are listed in the Government of India's directory.`, undefined, sources.statesAndUts);
}
add("union-territories", "Union Territories", "branch", "state-and-ut-governments", "The National Portal lists eight Union Territories. Delhi, Jammu and Kashmir, and Puducherry have legislatures; arrangements differ across the Union Territories.", undefined, sources.statesAndUts);
add("ut-government-structure", "Typical Union Territory administration", "branch", "state-and-ut-governments", "Union Territories have distinct administrative arrangements. The constitutional and statutory roles vary; only Delhi, Jammu and Kashmir, and Puducherry currently have legislatures.", undefined, sources.statesAndUts);
add("ut-administrator", "Administrator or Lieutenant Governor", "office", "ut-government-structure", "The Union Territory's appointed administrative head. The title and powers depend on the governing law for that territory.", undefined, sources.constitution);
add("ut-legislature", "Union Territory Legislature (where provided)", "institution", "ut-government-structure", "Legislatures exist in Delhi, Jammu and Kashmir, and Puducherry. They are not present in every Union Territory.", undefined, sources.statesAndUts);
add("ut-departments", "Union Territory departments and agencies", "branch", "ut-government-structure", "Administrative departments and agencies vary across Union Territories; see the official directory for each territory.", undefined, sources.directory);
const unionTerritories = [
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi (National Capital Territory)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
for (const territory of unionTerritories) {
  add(`ut-${slug(territory)}`, territory, "union territory", "union-territories", `A Union Territory of India. For its administration, legislature where applicable, and official website, use the Government of India's directory.`, undefined, sources.statesAndUts);
}

add("judiciary", "Judiciary", "branch", "republic-of-india", "India's court system includes the Supreme Court, High Courts, and subordinate courts. The map shows the national structure and High Court names; local court details are available through official directories.", undefined, sources.supremeCourt);
add("supreme-court-of-india", "Supreme Court of India", "court", "judiciary", "India's apex court. Its constitutional jurisdiction includes appeals from High Courts and other matters set out in the Constitution and law.", "https://www.sci.gov.in", sources.supremeCourt);
add("high-courts-of-india", "High Courts", "branch", "judiciary", "High Courts head the judicial administration of their jurisdictions. Some High Courts serve more than one State or Union Territory.", undefined, sources.highCourts);
const highCourts = [
  "Allahabad High Court", "Andhra Pradesh High Court", "Bombay High Court", "Calcutta High Court", "Chhattisgarh High Court", "Delhi High Court", "Gauhati High Court", "Gujarat High Court", "Himachal Pradesh High Court", "High Court of Jammu and Kashmir and Ladakh", "Jharkhand High Court", "Karnataka High Court", "Kerala High Court", "Madhya Pradesh High Court", "Madras High Court", "Manipur High Court", "Meghalaya High Court", "Orissa High Court", "Patna High Court", "Punjab and Haryana High Court", "Rajasthan High Court", "Sikkim High Court", "Telangana High Court", "Tripura High Court", "Uttarakhand High Court",
];
for (const court of highCourts) {
  add(`high-court-${slug(court)}`, court, "court", "high-courts-of-india", `One of India's High Courts. Jurisdiction may cover one or more States or Union Territories; see the official Supreme Court directory for current jurisdiction details.`, undefined, sources.highCourts);
}
add("subordinate-courts", "District and subordinate courts", "court", "judiciary", "Courts below the High Courts, organized under State and Union Territory judicial systems. The specific court structure varies by jurisdiction.", undefined, directory);
add("tribunals", "Tribunals", "institution", "judiciary", "Specialized adjudicatory bodies created under the Constitution or legislation. This prototype does not enumerate every tribunal.", undefined, directory);

add("constitutional-bodies", "Constitutional bodies and offices", "branch", "republic-of-india", "Independent constitutional offices and commissions. This is a selected national-level list; the Government directory contains additional bodies and State-level counterparts.", undefined, sources.constitution);
add("election-commission-of-india", "Election Commission of India", "institution", "constitutional-bodies", "An autonomous constitutional body under Article 324. It conducts elections to Parliament, State legislatures, and the offices of President and Vice-President.", "https://www.eci.gov.in", sources.electionCommission);
add("upsc", "Union Public Service Commission", "institution", "constitutional-bodies", "A constitutional Public Service Commission for the Union under Article 315. Each State also has a State Public Service Commission; Joint Commissions may be created.", "https://upsc.gov.in", sources.upsc);
add("cag-of-india", "Comptroller and Auditor General of India", "office", "constitutional-bodies", "An independent constitutional authority under Articles 148–151, responsible for audit functions relating to Union and State accounts as provided by the Constitution and law.", "https://cag.gov.in", sources.cag);
add("finance-commission", "Finance Commission", "institution", "constitutional-bodies", "A constitutional commission under Article 280 that makes recommendations on specified financial relations between the Union and States.", undefined, sources.constitution);
add("attorney-general-of-india", "Attorney General for India", "office", "constitutional-bodies", "The chief legal adviser to the Government of India and its lawyer in the Supreme Court under Article 76.", undefined, sources.constitution);
add("national-commission-for-scheduled-castes", "National Commission for Scheduled Castes", "institution", "constitutional-bodies", "A constitutional commission under Article 338.", undefined, sources.constitution);
add("national-commission-for-scheduled-tribes", "National Commission for Scheduled Tribes", "institution", "constitutional-bodies", "A constitutional commission under Article 338A.", undefined, sources.constitution);
add("national-commission-for-backward-classes", "National Commission for Backward Classes", "institution", "constitutional-bodies", "A constitutional commission under Article 338B.", undefined, sources.constitution);
add("gst-council", "Goods and Services Tax Council", "institution", "constitutional-bodies", "A constitutional council under Article 279A, with representatives of the Union and States.", undefined, sources.constitution);

add("local-self-government", "Local self-government", "branch", "republic-of-india", "The Constitution provides for Panchayats in rural areas and Municipalities in urban areas. State law determines many details and local bodies.", undefined, sources.panchayatiRaj);
add("state-election-commissions", "State Election Commissions", "institution", "local-self-government", "State Election Commissions conduct elections to Panchayats and Municipalities under the Constitution and applicable State law.", undefined, sources.constitution);
add("rural-local-government", "Rural local government", "branch", "local-self-government", "Part IX of the Constitution provides for Panchayats at village, intermediate, and district levels. The intermediate level is not required in States with a population not exceeding twenty lakhs.", undefined, sources.constitution);
add("gram-panchayat", "Village Panchayat", "local government", "rural-local-government", "An elected local body at the village level, with powers and responsibilities shaped by the Constitution and State law.", undefined, sources.panchayatiRaj);
add("intermediate-panchayat", "Intermediate Panchayat", "local government", "rural-local-government", "An intermediate-level Panchayat where the State's population and laws provide for it.", undefined, sources.constitution);
add("district-panchayat", "District Panchayat", "local government", "rural-local-government", "A district-level Panchayat in the constitutional rural local-government structure.", undefined, sources.constitution);
add("urban-local-government", "Urban local government", "branch", "local-self-government", "Part IXA provides for Nagar Panchayats, Municipal Councils, and Municipal Corporations according to the area and State law.", undefined, sources.constitution);
add("nagar-panchayat", "Nagar Panchayat", "local government", "urban-local-government", "A municipality for an area transitioning from rural to urban, as provided by Article 243Q and State law.", undefined, sources.constitution);
add("municipal-council", "Municipal Council", "local government", "urban-local-government", "A municipality for a smaller urban area, as provided by Article 243Q and State law.", undefined, sources.constitution);
add("municipal-corporation", "Municipal Corporation", "local government", "urban-local-government", "A municipality for a larger urban area, as provided by Article 243Q and State law.", undefined, sources.constitution);

export const institutionMap = institutions;
export const institutionById = new Map(
  institutions.map((institution) => [institution.id, institution] as const),
);

// Cross-links describe a specific constitutional or official relationship; tree placement alone is only a browsing grouping.
export const institutionRelations: InstitutionRelation[] = [
  { from: "prime-minister-of-india", to: "council-of-ministers", label: "heads", reverseLabel: "is headed by" },
  { from: "president-of-india", to: "union-parliament", label: "is a constituent part of Parliament", reverseLabel: "includes the President as a constituent part" },
  { from: "vice-president-of-india", to: "rajya-sabha", label: "chairs ex officio", reverseLabel: "is chaired ex officio by" },
  { from: "council-of-ministers", to: "lok-sabha", label: "is collectively responsible to", reverseLabel: "is the House to which the Council is collectively responsible" },
  { from: "election-commission-of-india", to: "union-parliament", label: "conducts elections to", reverseLabel: "elections are conducted by the Election Commission" },
  { from: "election-commission-of-india", to: "states-of-india", label: "conducts elections to State legislatures", reverseLabel: "State legislature elections are conducted by the Election Commission" },
  { from: "election-commission-of-india", to: "president-of-india", label: "conducts the election for", reverseLabel: "election is conducted by the Election Commission" },
  { from: "supreme-court-of-india", to: "high-courts-of-india", label: "hears appeals from", reverseLabel: "some decisions may be appealed to the Supreme Court" },
  { from: "high-courts-of-india", to: "subordinate-courts", label: "has superintendence over", reverseLabel: "are subject to High Court superintendence" },
  { from: "cag-of-india", to: "union-parliament", label: "reports on Union accounts are laid before", reverseLabel: "receives Union audit reports through the constitutional process" },
  { from: "upsc", to: "union-executive", label: "advises on Union public services", reverseLabel: "receives UPSC advice on public-service matters" },
  { from: "finance-commission", to: "union-government", label: "recommends Union–State financial arrangements to", reverseLabel: "receives Finance Commission recommendations" },
  { from: "gst-council", to: "union-government", label: "includes Union representation", reverseLabel: "is represented in the GST Council" },
  { from: "gst-council", to: "states-of-india", label: "includes State representation", reverseLabel: "is represented in the GST Council" },
  { from: "state-election-commissions", to: "rural-local-government", label: "conducts elections to Panchayats", reverseLabel: "elections are conducted by the relevant State Election Commission" },
  { from: "state-election-commissions", to: "urban-local-government", label: "conducts elections to Municipalities", reverseLabel: "elections are conducted by the relevant State Election Commission" },
];
