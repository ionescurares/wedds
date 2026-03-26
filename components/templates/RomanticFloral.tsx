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
import styles from "./RomanticFloral.module.css";

type Props = {
  state: SiteState;
  editable?: boolean;
  siteId?: string;
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
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Replace</span>
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

const RomanticFloral = memo(function RomanticFloral({ state, editable = false, siteId }: Props) {
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({
    name: "",
    email: "",
    guests: "0",
  });

  const rsvpFields = useMemo(() => state.rsvpFields ?? [], [state.rsvpFields]);
  const showFollowUps = attendance === "yes";
  const successMessage = duplicate
    ? "It looks like you've already RSVP'd. Your response has been updated."
    : attendance === "yes"
      ? "We are overjoyed that you will celebrate with us."
      : "We will miss you dearly. Thank you for letting us know.";

  const requiredMissing = useMemo(() => {
    if (!formData.name?.trim()) return true;
    if (!attendance) return true;
    if (!showFollowUps) return false;
    for (const field of rsvpFields) {
      if (field.required && !formData[field.id]?.trim()) return true;
    }
    return false;
  }, [attendance, formData, rsvpFields, showFollowUps]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (requiredMissing) return;

    if (editable || !siteId) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setDuplicate(false);
    const customData: Record<string, string> = {};
    if (showFollowUps) {
      for (const field of rsvpFields) {
        if (formData[field.id]) customData[field.id] = formData[field.id];
      }
    }

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          guest_name: formData.name.trim(),
          guest_email: formData.email?.trim() || null,
          attending: attendance!,
          guest_count: attendance === "yes" ? 1 + Number(formData.guests || 0) : 0,
          data: customData,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      if (json.duplicate) setDuplicate(true);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <EditableImage
          state={state}
          imageKey="hero-main"
          fallbackSrc="https://images.unsplash.com/photo-1519741497674-611481863552?w=900&h=1200&fit=crop&q=80"
          fallbackAlt="Couple photo"
          editable={editable}
          className={styles.heroImage}
        />
        <div className={styles.heroContent}>
          <HeroFloralTop />
          <HeroFloralBottom />
          <Petal className={styles.petal1} />
          <Petal className={styles.petal2} />
          <EditableText state={state} textKey="hero-label" fallback="We're getting married" editable={editable} className={styles.heroLabel} />
          <EditableText state={state} textKey="hero-name-1" fallback="Elena" editable={editable} as="h1" className={styles.heroName} />
          <div className={styles.heroAmp}>&amp;</div>
          <EditableText state={state} textKey="hero-name-2" fallback="Alexandru" editable={editable} as="h1" className={styles.heroName} />
          <div className={styles.heroLine} />
          <EditableText state={state} textKey="hero-date" fallback="September the Twentieth, Two Thousand Twenty-Six" editable={editable} className={styles.heroDate} />
          <EditableText state={state} textKey="hero-venue" fallback="Bucharest, Romania" editable={editable} className={styles.heroVenue} />
        </div>
      </section>

      <section className={styles.quoteBand}>
        <QuoteFloral className={styles.quoteFloralLeft} />
        <QuoteFloral className={styles.quoteFloralRight} />
        <EditableText state={state} textKey="quote-text" fallback="&quot;The best thing to hold onto in life is each other.&quot;" editable={editable} className={styles.quoteText} />
      </section>

      <section className={styles.story}>
        <StoryFloralRight />
        <StoryFloralLeft />
        <div className={styles.storyHeader}>
          <EditableText state={state} textKey="story-label" fallback="Our Story" editable={editable} className={styles.storyLabel} />
          <EditableText state={state} textKey="story-title" fallback="A Love Written in the Stars" editable={editable} as="h2" className={styles.storyTitle} />
          <StoryDivider />
        </div>
        <div className={styles.storyRow}>
          <EditableImage
            state={state}
            imageKey="story-1"
            fallbackSrc="https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&h=900&fit=crop&q=80"
            fallbackAlt="Story photo"
            editable={editable}
            className={styles.storyImage}
          />
          <div className={styles.storyText}>
            <EditableText state={state} textKey="story-body-1" fallback="It started with a look across a crowded room and a conversation that lasted until sunrise. From that very first night, we knew something extraordinary had begun." editable={editable} as="p" />
            <EditableText state={state} textKey="story-body-2" fallback="Through years of adventures, quiet mornings, late-night talks, and a thousand shared dreams, our love has grown into something we want to celebrate with the people who matter most." editable={editable} as="p" />
            <EditableText state={state} textKey="story-body-3" fallback="Now, we invite you to join us as we say &quot;I do&quot; and begin the greatest adventure of all." editable={editable} as="p" />
            <EditableText state={state} textKey="story-sig" fallback="Elena &amp; Alexandru" editable={editable} className={styles.storySig} />
          </div>
        </div>
      </section>

      <section className={styles.details}>
        <DetailsFloral className={styles.detailsFloralTl} />
        <DetailsFloral className={styles.detailsFloralBr} />
        <div className={styles.detailsInner}>
          <div className={styles.detailsHeader}>
            <EditableText state={state} textKey="details-label" fallback="The Celebration" editable={editable} className={styles.detailsLabel} />
            <EditableText state={state} textKey="details-title" fallback="When &amp; Where" editable={editable} as="h2" className={styles.detailsTitle} />
          </div>
          <div className={styles.eventCards}>
            <article className={styles.eventCard}>
              <div className={styles.eventAccent} />
              <div className={styles.eventIcon}>{ringIcon}</div>
              <EditableText state={state} textKey="ceremony-type" fallback="Ceremony" editable={editable} className={styles.eventType} />
              <EditableText state={state} textKey="ceremony-name" fallback="The Vows" editable={editable} as="h3" className={styles.eventName} />
              <div className={styles.eventDetail}>{clockSmall}<EditableText state={state} textKey="ceremony-time" fallback="Saturday, September 20, 2026 at 4:00 PM" editable={editable} /></div>
              <div className={styles.eventDetail}>{pinSmall}<EditableText state={state} textKey="ceremony-venue" fallback="Biserica Sfantul Gheorghe, Calea Victoriei 47, Bucharest" editable={editable} /></div>
              <div className={styles.eventDetail}>{personSmall}<EditableText state={state} textKey="ceremony-dress" fallback="Garden formal attire" editable={editable} /></div>
            </article>
            <article className={styles.eventCard}>
              <div className={styles.eventAccent} />
              <div className={styles.eventIcon}>{calendarIcon}</div>
              <EditableText state={state} textKey="reception-type" fallback="Reception" editable={editable} className={styles.eventType} />
              <EditableText state={state} textKey="reception-name" fallback="Dinner &amp; Dancing" editable={editable} as="h3" className={styles.eventName} />
              <div className={styles.eventDetail}>{clockSmall}<EditableText state={state} textKey="reception-time" fallback="7:00 PM until the last dance" editable={editable} /></div>
              <div className={styles.eventDetail}>{pinSmall}<EditableText state={state} textKey="reception-venue" fallback="Casa Vernescu, Calea Victoriei 133, Bucharest" editable={editable} /></div>
              <div className={styles.eventDetail}>{arrowSmall}<EditableText state={state} textKey="reception-note" fallback="Open bar, live music, and endless celebration" editable={editable} /></div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.rsvp}>
        <RsvpFloral className={styles.rsvpFloralTl} />
        <RsvpFloral className={styles.rsvpFloralBr} />
        <Petal className={styles.rsvpPetal1} />
        <Petal className={styles.rsvpPetal2} />
        <div className={styles.rsvpInner}>
          <EditableText state={state} textKey="rsvp-label" fallback="Kindly Respond" editable={editable} className={styles.rsvpLabel} />
          <EditableText state={state} textKey="rsvp-title" fallback="Will You Join Us?" editable={editable} as="h2" className={styles.rsvpTitle} />
          <EditableText state={state} textKey="rsvp-body" fallback="We would be honored to have you celebrate this special day with us. Please let us know by August 15, 2026." editable={editable} as="p" className={styles.rsvpSubtitle} />
          {!submitted ? (
            <form className={styles.rsvpForm} onSubmit={onSubmit}>
              <div className={styles.formGroup}>
                <EditableText
                  state={state}
                  textKey="rsvp-form-name-label"
                  fallback="Your Full Name"
                  editable={editable}
                  as="label"
                />
                <input value={formData.name} onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))} placeholder="First and last name" required />
              </div>
              <div className={styles.formGroup}>
                <EditableText
                  state={state}
                  textKey="rsvp-form-email-label"
                  fallback="Email Address"
                  editable={editable}
                  as="label"
                />
                <input type="email" value={formData.email} onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))} placeholder="your@email.com" />
              </div>
              <div className={styles.formGroup}>
                <EditableText
                  state={state}
                  textKey="rsvp-form-attending-label"
                  fallback="Will you be attending?"
                  editable={editable}
                  as="label"
                />
                <div className={styles.attChoices}>
                  <button
                    type="button"
                    className={`${styles.attChoice} ${attendance === "yes" ? styles.attChecked : ""}`}
                    onClick={editable ? undefined : () => setAttendance("yes")}
                  >
                    <EditableText
                      state={state}
                      textKey="rsvp-accept-text"
                      fallback="Joyfully Accept"
                      editable={editable}
                    />
                  </button>
                  <button
                    type="button"
                    className={`${styles.attChoice} ${attendance === "no" ? styles.attChecked : ""}`}
                    onClick={editable ? undefined : () => setAttendance("no")}
                  >
                    <EditableText
                      state={state}
                      textKey="rsvp-decline-text"
                      fallback="Regretfully Decline"
                      editable={editable}
                    />
                  </button>
                </div>
              </div>
              <div className={`${styles.guestCount} ${showFollowUps ? styles.guestCountOpen : ""}`}>
                <div className={styles.formGroup}>
                  <EditableText
                    state={state}
                    textKey="rsvp-form-guests-label"
                    fallback="Number of Additional Guests"
                    editable={editable}
                    as="label"
                  />
                  <select value={formData.guests} onChange={(e) => setFormData((s) => ({ ...s, guests: e.target.value }))}>
                    <option value="0">Just me</option><option value="1">+1 guest</option><option value="2">+2 guests</option><option value="3">+3 guests</option><option value="4">+4 guests</option>
                  </select>
                </div>
                {showFollowUps ? rsvpFields.map((field) => (
                  <div key={field.id} className={styles.formGroup}>
                    {field.id === "dietary" ? (
                      <EditableText
                        state={state}
                        textKey="rsvp-form-dietary-label"
                        fallback="Dietary Restrictions or Notes"
                        editable={editable}
                        as="label"
                      />
                    ) : (
                      <label>{field.label}</label>
                    )}
                    {field.type === "textarea" ? (
                      <textarea value={formData[field.id] ?? ""} onChange={(e) => setFormData((s) => ({ ...s, [field.id]: e.target.value }))} placeholder={field.placeholder} required={field.required} />
                    ) : field.type === "select" ? (
                      <select value={formData[field.id] ?? ""} onChange={(e) => setFormData((s) => ({ ...s, [field.id]: e.target.value }))} required={field.required}>
                        <option value="">Select...</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === "radio" ? (
                      <div className={styles.attChoices}>
                        {field.options?.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`${styles.attChoice} ${formData[field.id] === opt ? styles.attChecked : ""}`}
                            onClick={editable ? undefined : () => setFormData((s) => ({ ...s, [field.id]: opt }))}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input value={formData[field.id] ?? ""} onChange={(e) => setFormData((s) => ({ ...s, [field.id]: e.target.value }))} placeholder={field.placeholder} required={field.required} />
                    )}
                  </div>
                )) : null}
              </div>
              {submitError ? <p className={styles.formError}>{submitError}</p> : null}
              <button className={styles.submitBtn} type={editable ? "button" : "submit"} disabled={submitting}>
                {submitting ? (
                  "Sending..."
                ) : (
                  <EditableText
                    state={state}
                    textKey="rsvp-submit-text"
                    fallback="Send Response"
                    editable={editable}
                  />
                )}
              </button>
            </form>
          ) : (
            <div className={`${styles.rsvpSuccess} ${styles.rsvpSuccessShow}`}>
              <EditableText
                state={state}
                textKey="rsvp-success-title"
                fallback="Thank You"
                editable={editable}
                as="h3"
              />
              <EditableText
                state={state}
                textKey="rsvp-success-message"
                fallback={successMessage}
                editable={editable}
                as="p"
              />
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <FooterFloral />
        <EditableText state={state} textKey="footer-names" fallback="Elena &amp; Alexandru" editable={editable} className={styles.footerNames} />
        <EditableText state={state} textKey="footer-date" fallback="20 . 09 . 2026" editable={editable} className={styles.footerDate} />
      </footer>
    </div>
  );
});

export default RomanticFloral;

function Petal({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 14"><ellipse cx="10" cy="7" rx="9" ry="6" fill="currentColor" /></svg>;
}

function HeroFloralTop() {
  return <svg className={styles.heroFloralTr} viewBox="0 0 280 280"><ellipse cx="180" cy="60" rx="38" ry="32" fill="#E8B4A2" opacity=".35" /><ellipse cx="176" cy="55" rx="26" ry="22" fill="#B88A96" opacity=".35" /><path d="M185 85 C165 120,150 160,140 210" stroke="#8EA882" strokeWidth="2" fill="none" opacity=".45" /></svg>;
}
function HeroFloralBottom() {
  return <svg className={styles.heroFloralBl} viewBox="0 0 200 200"><ellipse cx="80" cy="60" rx="28" ry="23" fill="#E8B4A2" opacity=".35" /><path d="M85 80 C70 110,55 140,45 170" stroke="#8EA882" strokeWidth="1.5" fill="none" opacity=".4" /></svg>;
}
function QuoteFloral({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 200 140"><ellipse cx="60" cy="50" rx="25" ry="20" fill="#fff" opacity=".12" /><path d="M65 65 C50 85,35 100,20 120" stroke="#fff" strokeWidth="1.2" fill="none" opacity=".12" /></svg>;
}
function StoryFloralRight() {
  return <svg className={styles.storyFloralR} viewBox="0 0 180 300"><path d="M150 30 C135 70,140 120,130 170 C120 220,135 260,125 290" stroke="#8EA882" strokeWidth="1.8" fill="none" opacity=".4" /><ellipse cx="135" cy="65" rx="22" ry="18" fill="#E8B4A2" opacity=".3" /></svg>;
}
function StoryFloralLeft() {
  return <svg className={styles.storyFloralL} viewBox="0 0 150 250"><path d="M120 20 C105 60,110 100,100 150 C90 200,100 230,95 250" stroke="#8EA882" strokeWidth="1.5" fill="none" opacity=".35" /><ellipse cx="105" cy="55" rx="18" ry="15" fill="#E8B4A2" opacity=".25" /></svg>;
}
function StoryDivider() {
  return <svg className={styles.storyDivider} viewBox="0 0 180 30"><line x1="0" y1="15" x2="55" y2="15" stroke="#ECD8DE" strokeWidth=".75" /><line x1="125" y1="15" x2="180" y2="15" stroke="#ECD8DE" strokeWidth=".75" /><ellipse cx="90" cy="13" rx="12" ry="10" fill="#E8B4A2" opacity=".4" /></svg>;
}
function DetailsFloral({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 220 220"><ellipse cx="80" cy="60" rx="30" ry="25" fill="#E8B4A2" opacity=".3" /><path d="M85 80 C65 110,50 145,35 185" stroke="#8EA882" strokeWidth="1.8" fill="none" opacity=".35" /></svg>;
}
function RsvpFloral({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 200 200"><ellipse cx="70" cy="50" rx="25" ry="20" fill="#fff" opacity=".08" /><path d="M75 65 C58 90,45 120,35 160" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".08" /></svg>;
}
function FooterFloral() {
  return <svg className={styles.footerFloral} viewBox="0 0 300 80"><line x1="0" y1="40" x2="95" y2="40" stroke="#6B5D56" strokeWidth=".5" opacity=".3" /><ellipse cx="150" cy="38" rx="14" ry="11" fill="#E8B4A2" opacity=".15" /></svg>;
}

const ringIcon = <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
const calendarIcon = <svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>;
const clockSmall = <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
const pinSmall = <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const personSmall = <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const arrowSmall = <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
