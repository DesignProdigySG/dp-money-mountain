/**
 * Seeds the one canonical reference dataset that proves the reference-data
 * cache mechanism: Singapore business counts by the standard employee-size
 * bands (matching the VAIO example's own Stage 1 fixture bands exactly, so a
 * VAIO-style project's real Stage 1 output would actually hit this cache).
 *
 * Usage: npm run seed:reference-data
 */
import { writeBackAccounts } from "../lib/pipeline/reference-data";

async function main() {
  await writeBackAccounts({
    canonicalKey: "sg-employee-size-standard",
    geography: "Singapore",
    dimensionName: "Employee size band",
    description: "Standard employee-size bands for Singapore businesses.",
    bandValues: [
      { id: "lt25", label: "<25" },
      { id: "b25_49", label: "25–49" },
      { id: "b50_199", label: "50–199" },
      { id: "b200_1999", label: "200–1,999" },
      { id: "b2000plus", label: "2,000+" },
    ],
    accounts: {
      lt25: {
        value: 337700,
        status: "sourced",
        sourceUrl:
          "https://www.mom.gov.sg/newsroom/parliament-questions-and-replies/2026/0303-written-answer-to-pq-on-distribution-of-smes",
        sourceNote: "MOM parliamentary reply on SME size distribution, 2024.",
      },
      b25_49: {
        value: 10900,
        status: "sourced",
        sourceUrl:
          "https://www.mom.gov.sg/newsroom/parliament-questions-and-replies/2026/0303-written-answer-to-pq-on-distribution-of-smes",
        sourceNote: "MOM parliamentary reply on SME size distribution, 2024.",
      },
      b50_199: {
        value: 8000,
        status: "sourced",
        sourceUrl:
          "https://www.mom.gov.sg/newsroom/parliament-questions-and-replies/2026/0303-written-answer-to-pq-on-distribution-of-smes",
        sourceNote: "MOM parliamentary reply on SME size distribution, 2024.",
      },
      b200_1999: {
        value: 1523,
        status: "modeled",
        sourceUrl: "https://www.apollo.io/companies",
        sourceNote: "Apollo employee-size filtering, working estimate — not an official published count.",
      },
      b2000plus: {
        value: 375,
        status: "modeled",
        sourceUrl: "https://www.apollo.io/companies",
        sourceNote: "Apollo employee-size filtering, working estimate — not an official published count.",
      },
    },
    asOfDate: "2026-08-20",
  });

  console.log('Seeded reference dataset "sg-employee-size-standard".');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
