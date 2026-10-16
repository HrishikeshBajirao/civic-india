import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="landing-page">
      <SiteHeader />

      <section className="hero">
        <p className="eyebrow">PUBLIC INFORMATION, MADE FOLLOWABLE</p>
        <h1>Keep up with the institutions that shape India.</h1>
        <p className="hero-copy">
          Follow public offices and institutions. See their official updates in
          one calm, source-linked feed.
        </p>
        <div className="hero-actions">
          <Link className="button button-dark button-large" href="/register">
            Start following <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" href="/login">
            I already have an account
          </Link>
        </div>
        <div className="hero-note">
          <span className="status-dot" />
          Early prototype · official sources first
        </div>
      </section>

      <section className="preview-card" aria-label="Product preview">
        <div className="preview-topline">
          <div>
            <p className="eyebrow">YOUR CIVIC FEED</p>
            <h2>What changed?</h2>
          </div>
          <span className="preview-date">A clearer view of public updates</span>
        </div>
        <article className="preview-item">
          <span className="source-icon source-blue">SC</span>
          <div className="preview-item-copy">
            <div className="preview-meta">
              SUPREME COURT OF INDIA · OFFICIAL RELEASE
            </div>
            <h3>Updates from institutions you choose to follow</h3>
            <p>Each item will link back to its original government source.</p>
          </div>
          <span className="preview-arrow" aria-hidden="true">
            ↗
          </span>
        </article>
        <article className="preview-item">
          <span className="source-icon source-saffron">PIB</span>
          <div className="preview-item-copy">
            <div className="preview-meta">
              PRESS INFORMATION BUREAU · OFFICIAL RELEASE
            </div>
            <h3>Follow the Prime Minister, Parliament, courts, and more</h3>
            <p>
              Start with a few entities; expand your feed whenever you like.
            </p>
          </div>
          <span className="preview-arrow" aria-hidden="true">
            ↗
          </span>
        </article>
        <div className="preview-footer">
          <span>Evidence stays close to the update.</span>
          <span className="footer-sparkle" aria-hidden="true">
            ✳
          </span>
        </div>
      </section>
      <footer className="landing-footer">
        <span>Built around primary sources.</span>
        <span>India · v0.1</span>
      </footer>
    </main>
  );
}
