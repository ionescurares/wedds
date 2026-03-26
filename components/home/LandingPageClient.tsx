"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import styles from "./LandingPageClient.module.css";

type TemplateCard = {
  slug: string;
  name: string;
  description: string;
};

type Props = { templates: TemplateCard[] };

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const ARROW_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);


const FEATURES = [
  {
    title: "RSVP automat",
    desc: "Invitații confirmă online. Tu primești un email pentru fiecare răspuns și o listă completă.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  {
    title: "Perfect pe telefon",
    desc: "80% din invitați vor deschide pe mobil. Site-ul arată impecabil pe orice ecran.",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    title: "Link personalizat",
    desc: "ana-si-mihai.sitedenunta.ro. Ușor de reținut, ușor de trimis pe WhatsApp.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "În română",
    desc: "Text scris natural, nu tradus ciudat din engleză. Tonul potrivit pentru invitații voștri.",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    title: "Secțiuni românești",
    desc: "Cununie civilă, cununie religioasă, nași. Toate la locul lor, nu adaptate forțat.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: "Modifici oricând",
    desc: "S-a schimbat data? Locația? Actualizezi în 30 de secunde, invitații văd instant.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
];

const FAQ = [
  {
    q: "Trebuie să știu să fac site-uri?",
    a: "Nu. Alegi un template și editezi direct pe pagină, ca în Word. Click pe text, scrii. Click pe poză, o înlocuiești. Atât.",
  },
  {
    q: "Pot să modific după ce e publicat?",
    a: "Da, oricând. Schimbi text, poze, culori în câteva secunde. Modificările apar instant pentru toți care accesează linkul.",
  },
  {
    q: "Ce se întâmplă cu RSVP-urile?",
    a: "Primești un email pentru fiecare confirmare. Ai și o listă completă pe care o poți descărca oricând, cu numele invitaților și răspunsurile lor.",
  },
  {
    q: "Funcționează și pe telefon?",
    a: "Da. Site-ul e făcut să arate perfect pe orice ecran. Majoritatea invitaților vor deschide pe telefon, și experiența e la fel de bună.",
  },
  {
    q: "Cât durează să fie gata?",
    a: "5 minute dacă ai deja o poză de cuplu. Site-ul e live imediat ce apeși butonul de publicare.",
  },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PlaceholderPreview({ template }: { template: TemplateCard }) {
  const variant =
    template.slug === "romantic-floral"
      ? styles.previewRomantic
      : template.slug === "elegant-editorial"
        ? styles.previewElegant
        : styles.previewGeneric;

  return (
    <div className={`${styles.templatePreview} ${variant}`}>
      <div className={styles.placeholderInner}>
        <div className={styles.placeholderLabel}>Template</div>
        <div className={styles.placeholderName}>{template.name}</div>
        <div className={styles.placeholderSlug}>{template.slug}</div>
      </div>
    </div>
  );
}

export default function LandingPageClient({ templates }: Props) {
  const [openFaq, setOpenFaq] = useState(0);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq((prev) => (prev === i ? -1 : i));
  }, []);

  return (
    <main className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <a href="#" className={styles.logo}>
          SiteDeNuntă<span className={styles.logoDot}>.</span>ro
        </a>
        <div className={styles.navLinks}>
          <button className={`${styles.navLink} ${styles.navLinkDesktop}`} onClick={() => scrollTo("templates")}>
            Template-uri
          </button>
          <button className={`${styles.navLink} ${styles.navLinkDesktop}`} onClick={() => scrollTo("pricing")}>
            Preț
          </button>
          <button className={`${styles.navLink} ${styles.navLinkDesktop}`} onClick={() => scrollTo("faq")}>
            Întrebări
          </button>
          <button className={styles.navCta} onClick={() => scrollTo("templates")}>
            Începe acum
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            Nou în România
          </div>
          <h1 className={styles.heroTitle}>
            Site-ul vostru de nuntă.
            <br />
            <span className={styles.heroTitleEm}>Gata în 5 minute.</span>
          </h1>
          <p className={styles.heroSub}>
            Alegi un template, editezi direct pe pagină, trimiți linkul invitaților. Fără cont, fără bătăi de cap.
          </p>
          <button className={styles.heroCta} onClick={() => scrollTo("templates")}>
            Alege template-ul
            {ARROW_ICON}
          </button>
          <button className={styles.heroSecondary} onClick={() => scrollTo("how")}>
            Cum funcționează ↓
          </button>
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>{CHECK_ICON} Fără cont necesar</div>
            <div className={styles.trustBadge}>{CHECK_ICON} Editare vizuală</div>
            <div className={styles.trustBadge}>{CHECK_ICON} RSVP inclus</div>
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section className={styles.templates} id="templates">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Alege stilul tău</div>
          <h2 className={styles.sectionTitle}>Template-uri pentru fiecare gust</h2>
          <p className={styles.sectionSubtitle}>
            Fiecare design se potrivește atât pe desktop cât și pe telefon. Alege-l pe cel care vă reprezintă.
          </p>
        </div>
        <div className={styles.templatesGrid}>
          {templates.map((t) => (
            <Link
              key={t.slug}
              href={`/builder/new?template=${encodeURIComponent(t.slug)}`}
              className={styles.templateCard}
            >
              <PlaceholderPreview template={t} />
              <div className={styles.templateInfo}>
                <div className={styles.templateName}>{t.name}</div>
                <div className={styles.templateDesc}>{t.description || "Template de nuntă."}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className={styles.templatesCta}>
          <button className={styles.templatesCtaLink} onClick={() => scrollTo("templates")}>
            Vezi toate template-urile
            {ARROW_ICON}
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.howItWorks} id="how">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Cum funcționează</div>
          <h2 className={styles.sectionTitle}>Trei pași simpli</h2>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3>Alegi un template</h3>
            <p>Răsfoiești design-urile și alegi cel care se potrivește stilului vostru și al nunții.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h3>Editezi direct pe pagină</h3>
            <p>Schimbi numele, data, locația și pozele cu un simplu click. Vezi modificările instant.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <h3>Trimiți linkul</h3>
            <p>Publici și primești un link personalizat. Îl trimiți invitaților, ei confirmă prezența online.</p>
          </div>
        </div>
        <p className={styles.stepsNote}>Fără cont. Fără parolă. Fără bătăi de cap.</p>
      </section>

      {/* FEATURES */}
      <section className={styles.features} id="features">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>De ce SiteDeNuntă</div>
          <h2 className={styles.sectionTitle}>Tot ce ai nevoie, nimic în plus</h2>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.feature}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Preț simplu</div>
          <h2 className={styles.sectionTitle}>O plată, nicio bătaie de cap</h2>
        </div>
        <div className={styles.pricingCard}>
          <div className={styles.pricingLabel}>Site de nuntă complet</div>
          <div className={styles.pricingAmount}>
            <span className={styles.pricingValue}>149</span>
            <span className={styles.pricingUnit}>lei</span>
          </div>
          <p className={styles.pricingNote}>o singură plată, nu abonament</p>
          <ul className={styles.pricingFeatures}>
            <li>{CHECK_ICON} Design elegant, gata de trimis</li>
            <li>{CHECK_ICON} RSVP cu lista de invitați</li>
            <li>{CHECK_ICON} Link personalizat (nume.sitedenunta.ro)</li>
            <li>{CHECK_ICON} Modificări nelimitate</li>
            <li>{CHECK_ICON} Activ 12 luni</li>
          </ul>
          <button className={styles.pricingCta} onClick={() => scrollTo("templates")}>
            Creează site-ul →
          </button>
          <p className={styles.pricingFree}>sau începe gratuit și plătești când ești gata să publici</p>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq} id="faq">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Întrebări frecvente</div>
          <h2 className={styles.sectionTitle}>Ce vrei să știi</h2>
        </div>
        <div className={styles.faqList}>
          {FAQ.map((item, i) => (
            <div key={i} className={styles.faqItem}>
              <button
                className={`${styles.faqQuestion} ${openFaq === i ? styles.faqQuestionOpen : ""}`}
                onClick={() => toggleFaq(i)}
              >
                {item.q}
                {PLUS_ICON}
              </button>
              <div className={`${styles.faqAnswer} ${openFaq === i ? styles.faqAnswerOpen : ""}`}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCta}>
        <h2>Gata să începi?</h2>
        <p>Site-ul vostru de nuntă, gata în 5 minute.</p>
        <button className={styles.finalCtaBtn} onClick={() => scrollTo("templates")}>
          Alege template-ul
          {ARROW_ICON}
        </button>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          SiteDeNuntă<span>.</span>ro
        </div>
        <div className={styles.footerLinks}>
          <a href="#">Contact</a>
          <a href="#">Termeni</a>
          <a href="#">Confidențialitate</a>
        </div>
        <div className={styles.footerCopy}>© 2026 SiteDeNuntă.ro · Made with love in Romania</div>
      </footer>
    </main>
  );
}
