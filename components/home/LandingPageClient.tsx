"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./LandingPageClient.module.css";

export type LandingTemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail_url: string | null;
};

const PLACEHOLDER_THUMB =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80";

const FALLBACK_TEMPLATES: LandingTemplateRow[] = [
  {
    id: "fallback",
    slug: "elegant-editorial",
    name: "Elegant Editorial",
    description:
      "A refined, editorial layout with serif typography and generous whitespace—perfect for a timeless invitation.",
    thumbnail_url: null,
  },
];

function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

function IconGrid() {
  return (
    <svg className={styles.stepIcon} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="10" width="12" height="12" rx="1" />
      <rect x="26" y="10" width="12" height="12" rx="1" />
      <rect x="10" y="26" width="12" height="12" rx="1" />
      <rect x="26" y="26" width="12" height="12" rx="1" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg className={styles.stepIcon} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 34l2-8 18-18 6 6-18 18-8 2z" />
      <path d="M28 12l8 8" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className={styles.stepIcon} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M20 28a6 6 0 010-8.5l4-4a6 6 0 018.5 8.5l-2 2" />
      <path d="M28 20a6 6 0 010 8.5l-4 4a6 6 0 11-8.5-8.5l2-2" />
    </svg>
  );
}

type LandingPageClientProps = {
  templates: LandingTemplateRow[];
};

export default function LandingPageClient({ templates }: LandingPageClientProps) {
  const list = templates.length > 0 ? templates : FALLBACK_TEMPLATES;
  const year = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <RevealSection className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroAccent} aria-hidden="true" />
          <h1 className={styles.heroTitle}>Spunem Da</h1>
          <p className={styles.heroSub}>
            Create your wedding invitation in minutes. No account needed.
          </p>
        </div>
      </RevealSection>

      <RevealSection className={styles.section}>
        <div className={styles.sectionNarrow}>
          <h2 className={styles.sectionLabel}>Choose your template</h2>
          <div className={styles.sectionRule} aria-hidden="true" />
          <div className={styles.galleryGrid}>
            {list.map((t) => (
              <article key={t.id} className={styles.card}>
                <div className={styles.cardThumb}>
                  {/* External + DB URLs; next/image needs remotePatterns per host */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.thumbnail_url?.trim() ? t.thumbnail_url : PLACEHOLDER_THUMB}
                    alt=""
                    width={800}
                    height={600}
                  />
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{t.name}</h3>
                  <p className={styles.cardDesc}>{t.description || "A beautiful starting point for your day."}</p>
                  <Link href={`/builder/new?template=${encodeURIComponent(t.slug)}`} className={styles.cta}>
                    Start Building
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className={`${styles.section} ${styles.how}`}>
        <div className={styles.sectionNarrow}>
          <h2 className={styles.sectionLabel}>How it works</h2>
          <div className={styles.sectionRule} aria-hidden="true" />
          <div className={styles.steps}>
            <div className={styles.step}>
              <IconGrid />
              <p className={styles.stepTitle}>Pick a template</p>
              <p className={styles.stepLabel}>Browse designs and choose the one that fits your celebration.</p>
            </div>
            <div className={styles.step}>
              <IconPencil />
              <p className={styles.stepTitle}>Make it yours</p>
              <p className={styles.stepLabel}>Edit names, dates, and photos directly on the page.</p>
            </div>
            <div className={styles.step}>
              <IconLink />
              <p className={styles.stepTitle}>Share your link</p>
              <p className={styles.stepLabel}>Publish and send guests a single link to your invitation.</p>
            </div>
          </div>
        </div>
      </RevealSection>

      <footer className={styles.footer}>
        <p className={styles.footerBrand}>Spunem Da</p>
        <p className={styles.footerMeta}>© {year}</p>
        <p className={styles.footerTag}>Made with love in Romania</p>
      </footer>
    </main>
  );
}
