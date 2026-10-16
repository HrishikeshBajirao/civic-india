import type { Metadata } from "next";
import { InstitutionMap } from "@/components/institution-map";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Institutions of India | Civic India",
  description:
    "Explore a source-linked map of India's public institutions and how they connect.",
};

export default function InstitutionsPage() {
  return (
    <main className="app-page institutions-page">
      <SiteHeader />
      <section className="app-content institutions-content">
        <p className="eyebrow">EXPLORE THE REPUBLIC</p>
        <h1>India&apos;s institutions, connected.</h1>
        <p className="app-lead">
          Browse the institutions that make, administer, and interpret public
          decisions.
        </p>
        <InstitutionMap />
      </section>
    </main>
  );
}
