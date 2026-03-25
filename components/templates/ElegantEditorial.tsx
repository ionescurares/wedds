"use client";

import {
  type CSSProperties,
  type ElementType,
  memo,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import type { SiteState } from "@/types/database";
import styles from "./ElegantEditorial.module.css";

type Props = {
  state: SiteState;
  editable?: boolean;
};

type EditableTextProps = {
  state: SiteState;
  textKey: string;
  fallback: string;
  editable: boolean;
  as?: ElementType;
  className?: string;
};

function EditableText({
  state,
  textKey,
  fallback,
  editable,
  as: Tag = "span",
  className,
}: EditableTextProps) {
  const text = state.elements[textKey]?.text ?? fallback;
  const inlineStyles = (state.elements[textKey]?.styles ?? {}) as CSSProperties;

  return (
    <Tag
      className={className}
      style={inlineStyles}
      {...(editable ? { "data-key": textKey } : {})}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

type EditableImageProps = {
  state: SiteState;
  imageKey: string;
  fallbackSrc: string;
  fallbackAlt: string;
  editable: boolean;
  className?: string;
  children?: ReactNode;
};

function EditableImage({
  state,
  imageKey,
  fallbackSrc,
  fallbackAlt,
  editable,
  className,
  children,
}: EditableImageProps) {
  const src = state.images[imageKey]?.src ?? fallbackSrc;
  const alt = state.images[imageKey]?.alt ?? fallbackAlt;

  const rootClass = [className, editable ? styles.editableImageRoot : null].filter(Boolean).join(" ");

  return (
    <div className={rootClass} {...(editable ? { "data-img-key": imageKey } : {})}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={styles.image} />
      {editable ? (
        <div className={styles.imageChangeBar}>
          <button
            type="button"
            className={styles.imageChangeBtn}
            data-img-change-btn
            data-img-key={imageKey}
            aria-label="Change photo"
          >
            <svg className={styles.imageChangeIcon} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Change</span>
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

const ElegantEditorial = memo(function ElegantEditorial({ state, editable = false }: Props) {
  const [attendance, setAttendance] = useState<"yes" | "no">("yes");
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(false);
  const [showGuestCount, setShowGuestCount] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    guests: "0",
    dietary: "",
  });

  const requiredMissing = useMemo(
    () => !formData.name.trim() || !formData.email.trim(),
    [formData.email, formData.name]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (requiredMissing || !attendance) {
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }
    setSubmitted(true);
  }

  const successMessage =
    attendance === "yes"
      ? Number(formData.guests) > 0
        ? `We are so excited to celebrate with you and your ${formData.guests} guest${
            Number(formData.guests) > 1 ? "s" : ""
          }!`
        : "We are so excited to celebrate with you!"
      : "We will miss you, but thank you for letting us know.";

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <EditableText
          state={state}
          textKey="nav-monogram"
          fallback="A & L"
          editable={editable}
          className={styles.monogram}
        />
        <ul className={styles.navList}>
          <li>
            <EditableText
              state={state}
              textKey="nav-link-1"
              fallback="Details"
              editable={editable}
              as="a"
              className={styles.navLink}
            />
          </li>
          <li>
            <EditableText
              state={state}
              textKey="nav-link-2"
              fallback="RSVP"
              editable={editable}
              as="a"
              className={styles.navLink}
            />
          </li>
        </ul>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <EditableImage
            state={state}
            imageKey="hero-1"
            fallbackSrc="https://picsum.photos/seed/wedding1/800/1000"
            fallbackAlt="Wedding couple portrait"
            editable={editable}
            className={styles.photo}
          />
          <EditableImage
            state={state}
            imageKey="hero-2"
            fallbackSrc="https://picsum.photos/seed/wedding2/800/1000"
            fallbackAlt="Wedding bouquet"
            editable={editable}
            className={styles.photo}
          />
          <EditableImage
            state={state}
            imageKey="hero-3"
            fallbackSrc="https://picsum.photos/seed/wedding3/800/1000"
            fallbackAlt="Wedding details"
            editable={editable}
            className={styles.photo}
          />
        </div>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <EditableText
            state={state}
            textKey="hero-date"
            fallback="September 14, 2026"
            editable={editable}
            className={styles.heroDate}
          />
          <EditableText
            state={state}
            textKey="hero-names"
            fallback="Marco & Julian"
            editable={editable}
            as="h1"
            className={styles.heroNames}
          />
          <EditableText
            state={state}
            textKey="hero-sub"
            fallback="Request the pleasure of your company"
            editable={editable}
            className={styles.heroSub}
          />
        </div>
        <div className={styles.scrollHint}>
          <span>Scroll</span>
          <div className={styles.scrollLine} />
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.storyInner}>
          <div className={styles.storyIntro}>
            <EditableText
              state={state}
              textKey="story-label"
              fallback="Our Story"
              editable={editable}
              className={styles.sectionLabel}
            />
            <EditableText
              state={state}
              textKey="story-title"
              fallback="Two paths, one journey"
              editable={editable}
              as="h2"
              className={styles.sectionTitle}
            />
            <EditableText
              state={state}
              textKey="story-body"
              fallback="What started as a chance meeting became the greatest adventure of our lives."
              editable={editable}
              as="p"
              className={styles.storyBody}
            />
          </div>

          <div className={styles.storyGrid}>
            {(["gallery-1", "gallery-2", "gallery-3", "gallery-4", "gallery-5"] as const).map(
              (key, idx) => (
                <EditableImage
                  key={key}
                  state={state}
                  imageKey={key}
                  fallbackSrc={`https://picsum.photos/seed/couple${idx + 1}/${idx === 4 ? "1000/500" : "800/600"}`}
                  fallbackAlt={`Story image ${idx + 1}`}
                  editable={editable}
                  className={`${styles.storyImg} ${styles[`storyImg${idx + 1}`]}`}
                >
                  <EditableText
                    state={state}
                    textKey={`story-caption-${idx + 1}`}
                    fallback={[
                      "Florence, 2019",
                      "The proposal",
                      "Santorini, 2023",
                      "Our first trip",
                      "Engagement party, 2025",
                    ][idx]}
                    editable={editable}
                    className={styles.storyImgCaption}
                  />
                </EditableImage>
              )
            )}
          </div>
        </div>
      </section>

      <section className={styles.details}>
        <div className={styles.detailsInner}>
          <EditableText
            state={state}
            textKey="details-label"
            fallback="The Celebration"
            editable={editable}
            className={styles.sectionLabel}
          />
          <EditableText
            state={state}
            textKey="details-title"
            fallback="Where it all comes together"
            editable={editable}
            as="h2"
            className={styles.sectionTitle}
          />

          <div className={styles.eventsGrid}>
            <article className={styles.eventCard}>
              <div className={styles.eventIcon}>{ringIcon}</div>
              <EditableText
                state={state}
                textKey="ceremony-type"
                fallback="Ceremony"
                editable={editable}
                className={styles.eventType}
              />
              <EditableText
                state={state}
                textKey="ceremony-name"
                fallback="The Vows"
                editable={editable}
                as="h3"
                className={styles.eventName}
              />
              <div className={styles.eventDetail}>
                {clockSmall}
                <EditableText
                  state={state}
                  textKey="ceremony-time"
                  fallback="3:00 PM, September 14, 2026"
                  editable={editable}
                />
              </div>
              <div className={styles.eventDetail}>
                {pinSmall}
                <EditableText
                  state={state}
                  textKey="ceremony-venue"
                  fallback="Villa Botanica Chapel, Amalfi Coast, Italy"
                  editable={editable}
                />
              </div>
              <div className={styles.eventDetail}>
                {personSmall}
                <EditableText
                  state={state}
                  textKey="ceremony-dress"
                  fallback="Cocktail attire encouraged"
                  editable={editable}
                />
              </div>
            </article>

            <article className={styles.eventCard}>
              <div className={styles.eventIcon}>{calendarIcon}</div>
              <EditableText
                state={state}
                textKey="reception-type"
                fallback="Reception"
                editable={editable}
                className={styles.eventType}
              />
              <EditableText
                state={state}
                textKey="reception-name"
                fallback="The Party"
                editable={editable}
                as="h3"
                className={styles.eventName}
              />
              <div className={styles.eventDetail}>
                {clockSmall}
                <EditableText
                  state={state}
                  textKey="reception-time"
                  fallback="6:00 PM until late"
                  editable={editable}
                />
              </div>
              <div className={styles.eventDetail}>
                {pinSmall}
                <EditableText
                  state={state}
                  textKey="reception-venue"
                  fallback="Terrazza del Tramonto, Amalfi Coast, Italy"
                  editable={editable}
                />
              </div>
              <div className={styles.eventDetail}>
                {arrowSmall}
                <EditableText
                  state={state}
                  textKey="reception-note"
                  fallback="Dinner, dancing, and open bar all night"
                  editable={editable}
                />
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <div className={styles.dividerOrnament}>&amp;</div>
        <div className={styles.dividerLine} />
      </div>

      <section className={styles.rsvp}>
        <div className={styles.rsvpInner}>
          <EditableText
            state={state}
            textKey="rsvp-label"
            fallback="Respond"
            editable={editable}
            className={styles.sectionLabel}
          />
          <EditableText
            state={state}
            textKey="rsvp-title"
            fallback="Will you join us?"
            editable={editable}
            as="h2"
            className={styles.sectionTitle}
          />
          <EditableText
            state={state}
            textKey="rsvp-body"
            fallback="We would be honored to have you celebrate with us. Please let us know by August 1, 2026."
            editable={editable}
            as="p"
            className={styles.rsvpBody}
          />

          {!submitted ? (
            <form className={styles.rsvpForm} onSubmit={onSubmit}>
              <div className={styles.formGroup}>
                <label>Your Full Name</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="First and last name"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="your@email.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Will you be attending?</label>
                <div className={styles.attendanceOptions}>
                  <button
                    type="button"
                    className={`${styles.attendanceOption} ${
                      attendance === "yes" ? styles.attendanceChecked : ""
                    }`}
                    onClick={() => {
                      setAttendance("yes");
                      setShowGuestCount(true);
                    }}
                  >
                    Joyfully Accept
                  </button>
                  <button
                    type="button"
                    className={`${styles.attendanceOption} ${
                      attendance === "no" ? styles.attendanceChecked : ""
                    }`}
                    onClick={() => {
                      setAttendance("no");
                      setShowGuestCount(false);
                    }}
                  >
                    Regretfully Decline
                  </button>
                </div>
              </div>

              <div
                className={`${styles.guestCount} ${
                  showGuestCount ? styles.guestCountOpen : ""
                }`}
              >
                <div className={styles.formGroup}>
                  <label>Number of Additional Guests</label>
                  <select
                    value={formData.guests}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, guests: e.target.value }))
                    }
                  >
                    <option value="0">Just me</option>
                    <option value="1">+1 guest</option>
                    <option value="2">+2 guests</option>
                    <option value="3">+3 guests</option>
                    <option value="4">+4 guests</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Dietary Restrictions or Notes</label>
                <textarea
                  value={formData.dietary}
                  onChange={(e) =>
                    setFormData((s) => ({ ...s, dietary: e.target.value }))
                  }
                  placeholder="Anything we should know..."
                />
              </div>

              <button
                className={`${styles.submitBtn} ${shake ? styles.shake : ""}`}
                type="submit"
              >
                Send Response
              </button>
            </form>
          ) : (
            <div className={`${styles.rsvpSuccess} ${styles.rsvpSuccessShow}`}>
              <div className={styles.checkmark}>{checkIcon}</div>
              <h3>Thank You</h3>
              <p>{successMessage}</p>
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <EditableText
          state={state}
          textKey="footer-names"
          fallback="Marco & Julian"
          editable={editable}
          as="div"
          className={styles.footerNames}
        />
        <EditableText
          state={state}
          textKey="footer-date"
          fallback="14 . 09 . 2026"
          editable={editable}
          as="div"
          className={styles.footerDate}
        />
      </footer>
    </div>
  );
});

export default ElegantEditorial;

const ringIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
const calendarIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </svg>
);
const clockSmall = (
  <svg className={styles.iconSm} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const pinSmall = (
  <svg className={styles.iconSm} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const personSmall = (
  <svg className={styles.iconSm} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const arrowSmall = (
  <svg className={styles.iconSm} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const checkIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
