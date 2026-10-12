import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionMap } from "@/components/institution-map";

export const metadata: Metadata = {
  title: "Institutions of India | Civic India",
  description: "Explore a source-linked map of India's public institutions and how they connect.",
};

export default function InstitutionsPage() {
  return (
    <main className="app-page institutions-page">
      <header className="site-header app-header">
        <Link className="brand" href="/"><span className="brand-mark">CI</span><span>Civic India</span></Link>
        <nav className="app-header-right" aria-label="Main navigation">
          <Link className="button button-quiet" href="/institutions" aria-current="page">Institutions</Link>
          <Link className="button button-dark" href="/dashboard">My account</Link>
        </nav>
      </header>
      <section className="app-content institutions-content">
        <p className="eyebrow">EXPLORE THE REPUBLIC</p>
        <h1>India's institutions, connected.</h1>
        <p className="app-lead">Browse the institutions that make, administer, and interpret public decisions.</p>
        <InstitutionMap />
      </section>
    </main>
  );
}
