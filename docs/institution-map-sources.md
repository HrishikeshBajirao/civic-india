# Institution map: sources and scope

Research last checked: 12 October 2026.

## Primary sources used

- [Integrated Government Online Directory (iGOD)](https://igod.gov.in/about_us) is the Government of India's directory for Union, State/UT, legislative, judicial, local-government, district, and other public organizations. The [Union ministries](https://igod.gov.in/ug/E002/organizations) and [Union departments](https://igod.gov.in/ug/E003/organizations) sections are used as the current directory destinations for entries without a verified direct site.
- The Cabinet Secretariat's [Allocation of Business Rules page](https://cabsec.gov.in/allocationofbusinessrules/) and its [First Schedule PDF](https://cabsec.gov.in/writereaddata/allocationbusinessrule/firstschedule/english/1_Upload_4266.pdf) provide the official names and ministry/department groupings used for the central-government branch. The schedule is amended over time, so it should be checked again before updating the static data.
- The Legislative Department's [Constitution of India](https://www.legislative.gov.in/static/uploads/2025/07/359f70a69695affb9d72f8393102bd2e.pdf) supports the Parliament, Union executive, constitutional bodies, Panchayats, and Municipalities descriptions and relationships.
- The National Portal's [State / UT directory](https://www.india.gov.in/directory/web-directory/state-uts) supplies the jurisdiction names.
- The Supreme Court's [Constitution overview](https://www.sci.gov.in/constitution/) and [jurisdiction page](https://www.sci.gov.in/jurisdiction/) support the selected court structure and High Court notes.
- The Ministry of Panchayati Raj's [About page](https://panchayat.gov.in/en/about-mopr/) supports the rural/local-government overview.
- Official descriptions from the [Election Commission of India](https://www.eci.gov.in/about-eci/), [UPSC](https://www.upsc.gov.in/about-us/constitutional-provisions/article-315-public-service-commissions-union-and-states), and [CAG](https://cag.gov.in/en/pages/single/2) support those nodes and selected links.

## How to read the map

The tree is a navigational grouping. A node's parent does not by itself claim legal control, reporting, or constitutional subordination. The graph adds only selected cross-links whose labels describe the relationship. The descriptions are short civic explanations, not legal advice or a complete statement of powers.

This first version is intentionally a sourced prototype, not a copy of every directory record. It includes the major Union branches, ministries and departments in the First Schedule, all current State and Union Territory names, the national court structure with High Court names, selected constitutional bodies, and constitutional local-government tiers. It does not enumerate every ministry organization, State department, district court, tribunal, statutory body, local council, or office-holder. Use iGOD for the broader live directory and the linked primary sources to verify a specific relationship.

The data is static TypeScript in `src/data/institution-map.ts`; it is not sourced dynamically from iGOD. When the official schedules or jurisdiction list change, update the names and descriptions from the primary source and note the date of that refresh here.
