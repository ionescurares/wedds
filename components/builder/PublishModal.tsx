"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { generateWeddingSlug, slugify } from "@/lib/utils/slugify";
import type { SiteState } from "@/types/database";
import styles from "./PublishModal.module.css";

type PublishModalProps = {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  onPublished: (url: string) => void;
  onAuthComplete: () => Promise<void>;
  meta: SiteState["meta"];
  defaultMeta: SiteState["meta"];
  onApplyWeddingDetails: (partner1: string, partner2: string, eventDateIso: string) => void;
  isFirstPublish: boolean;
};

type Step = "auth" | "details" | "slug" | "success";
type AuthMode = "signup" | "login";
type SlugCheck = "idle" | "checking" | "available" | "taken" | "invalid";

const LINKING_ERROR = "Something went wrong linking your site. Please try again.";

export default function PublishModal({
  isOpen,
  onClose,
  siteId,
  onPublished,
  onAuthComplete,
  meta,
  defaultMeta,
  onApplyWeddingDetails,
  isFirstPublish,
}: PublishModalProps) {
  const [step, setStep] = useState<Step>("auth");
  const [bootstrappingAuth, setBootstrappingAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [slug, setSlug] = useState(siteId);
  const [slugCheck, setSlugCheck] = useState<SlugCheck>("idle");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [slugOptions, setSlugOptions] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const canContinueDetails = Boolean(name1.trim() && name2.trim() && eventDate);

  function maybePrefill(value: string, fallback: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed === fallback.trim()) {
      return "";
    }
    return trimmed;
  }

  function normalizeDateForInput(value: string): string {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const goToDetails = useCallback(() => {
    setName1((prev) => prev || maybePrefill(meta.partner1, defaultMeta.partner1));
    setName2((prev) => prev || maybePrefill(meta.partner2, defaultMeta.partner2));
    setEventDate((prev) => prev || normalizeDateForInput(meta.date));
    setStep("details");
  }, [defaultMeta.partner1, defaultMeta.partner2, meta.date, meta.partner1, meta.partner2]);

  // Reset + check auth on open; claim draft before details step when already logged in
  useEffect(() => {
    if (!isOpen) {
      setStep("auth");
      setBootstrappingAuth(false);
      setAuthError("");
      setClaimError("");
      setPublishError("");
      setDetailsError("");
      setCopied(false);
      return;
    }

    // Only perform auth bootstrap while on auth step.
    // Prevents resetting users back from slug/details during publish flow.
    if (step !== "auth") {
      return;
    }

    let cancelled = false;
    setBootstrappingAuth(true);

    (async () => {
      setAuthLoading(true);
      setClaimError("");
      setAuthError("");
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        if (data.user) {
          try {
            await onAuthComplete();
            if (!cancelled) goToDetails();
          } catch {
            if (!cancelled) {
              setClaimError(LINKING_ERROR);
              goToDetails();
            }
          }
        } else {
          setStep("auth");
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          setBootstrappingAuth(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [goToDetails, isOpen, onAuthComplete, step]);

  // Reset on siteId change
  useEffect(() => {
    setSlug(siteId);
  }, [siteId]);

  // Slug availability check
  const checkSlug = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.length < 3) {
        setSlugCheck("invalid");
        return;
      }

      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) && !/^[0-9a-f]{8}-/.test(value)) {
        setSlugCheck("invalid");
        return;
      }

      if (isReservedSlug(value)) {
        setSlugCheck("invalid");
        return;
      }

      // UUID is always unique
      if (value === siteId) {
        setSlugCheck("available");
        return;
      }

      setSlugCheck("checking");

      debounceRef.current = setTimeout(async () => {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from("sites")
            .select("id")
            .eq("slug", value)
            .neq("id", siteId)
            .maybeSingle();

          setSlugCheck(data ? "taken" : "available");
        } catch {
          setSlugCheck("available");
        }
      }, 500);
    },
    [siteId]
  );

  useEffect(() => {
    if (step === "slug" && slug) {
      checkSlug(slug);
    }
  }, [step, slug, checkSlug]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // --- Auth handlers ---
  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!email.trim()) {
      setAuthError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (authMode === "signup" && !displayName.trim()) {
      setAuthError("Display name is required.");
      return;
    }

    setAuthLoading(true);
    try {
      const supabase = createClient();

      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Signup succeeded but no user returned.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }

      try {
        await onAuthComplete();
      } catch {
        setAuthError(LINKING_ERROR);
        return;
      }

      goToDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const retryClaim = async () => {
    setClaimError("");
    setAuthLoading(true);
    try {
      await onAuthComplete();
    } catch {
      setClaimError(LINKING_ERROR);
    } finally {
      setAuthLoading(false);
    }
  };

  const buildSlugOptions = useCallback((p1: string, p2: string, dateIso: string) => {
    const yyyy = /^\d{4}/.exec(dateIso)?.[0] ?? "";
    const ddmmyyyy = /^\d{4}-(\d{2})-(\d{2})$/.test(dateIso)
      ? `${dateIso.slice(8, 10)}${dateIso.slice(5, 7)}${dateIso.slice(0, 4)}`
      : "";

    const variants = [
      generateWeddingSlug(p1, p2, dateIso),
      generateWeddingSlug(p2, p1, `${yyyy}-01-01`),
      ddmmyyyy ? slugify(`${p1}-si-${p2}-${ddmmyyyy}`) : "",
      ddmmyyyy ? slugify(`${p2}-si-${p1}-${ddmmyyyy}`) : "",
    ]
      .map((value) => value.trim())
      .filter(Boolean);

    const normalized = Array.from(new Set(variants));
    return normalized;
  }, []);

  const handleContinueToSlug = () => {
    if (!canContinueDetails || detailsSaving) return;
    const p1 = name1.trim();
    const p2 = name2.trim();
    const options = buildSlugOptions(p1, p2, eventDate);
    if (options.length === 0) return;
    onApplyWeddingDetails(p1, p2, eventDate);
    setSlugOptions(options);
    setSlug(options[0]);
    setStep("slug");
  };

  // --- Publish handler ---
  const handlePublish = async () => {
    if (!canContinueDetails || slugCheck !== "available" || publishing || detailsSaving) return;
    setDetailsSaving(true);
    setDetailsError("");
    onApplyWeddingDetails(name1, name2, eventDate);
    try {
      if (siteId !== "new") {
        const saveRes = await fetch(`/api/sites/${siteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partner1_name: name1.trim(),
            partner2_name: name2.trim(),
            event_date: eventDate,
          }),
        });
        const saveJson = (await saveRes.json().catch(() => ({}))) as { error?: string };
        if (!saveRes.ok) {
          throw new Error(saveJson.error ?? "Failed to save wedding details.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save wedding details.";
      setDetailsError(msg);
      setDetailsSaving(false);
      return;
    }

    setPublishing(true);
    setPublishError("");
    try {
      const res = await fetch(`/api/sites/${siteId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          partner1_name: name1.trim() || null,
          partner2_name: name2.trim() || null,
          event_date: eventDate || null,
        }),
      });
      const json = (await res.json()) as { success?: boolean; url?: string; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Publish failed.");
      }
      const url = json.url ?? `/${slug}`;
      setPublishedUrl(url);
      onPublished(url);
      if (isFirstPublish) {
        setStep("success");
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publish failed.";
      setPublishError(msg);
    } finally {
      setPublishing(false);
      setDetailsSaving(false);
    }
  };

  useEffect(() => {
    if (step !== "details" || !canContinueDetails) return;
    const generated = generateWeddingSlug(name1.trim(), name2.trim(), eventDate);
    if (generated && generated !== slug) {
      setSlug(generated);
    }
  }, [canContinueDetails, eventDate, name1, name2, slug, step]);

  if (!isOpen) return null;

  const onBackdropClick = (e: React.MouseEvent) => {
    if (step === "success") return;
    if (e.target === backdropRef.current) onClose();
  };

  const copyPublishedLink = async () => {
    if (!publishedUrl) return;
    const full = `spunemda.ro${publishedUrl}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (bootstrappingAuth) {
    return (
      <div className={styles.loaderOverlay} role="status" aria-live="polite" aria-label="Loading publish modal">
        <div className={styles.loaderCard}>
          <div className={styles.loaderSpinner} />
          <p className={styles.loaderText}>Preparing publish flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.backdrop}
      ref={backdropRef}
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.card}>
        {step !== "success" && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ---- STEP: AUTH ---- */}
        {step === "auth" && (
          <>
            <h2 className={styles.heading}>
              {authMode === "signup"
                ? "Create your account to publish"
                : "Log in to publish"}
            </h2>
            <p className={styles.subtext}>
              {authMode === "signup"
                ? "Your wedding site is ready. Sign up to get your custom link."
                : "Welcome back. Log in to continue."}
            </p>

            <form className={styles.form} onSubmit={handleAuth}>
              {authMode === "signup" && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="pm-name">
                    Display name
                  </label>
                  <input
                    id="pm-name"
                    className={styles.input}
                    type="text"
                    placeholder="Rareș Ionescu"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pm-email">
                  Email
                </label>
                <input
                  id="pm-email"
                  className={styles.input}
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pm-pass">
                  Password
                </label>
                <input
                  id="pm-pass"
                  className={styles.input}
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              {authError && <p className={styles.error}>{authError}</p>}

              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "signup"
                    ? "Sign Up"
                    : "Log In"}
              </button>

              <button
                type="button"
                className={styles.toggleLink}
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setAuthError("");
                }}
              >
                {authMode === "signup"
                  ? "Already have an account? Log in"
                  : "Don't have an account? Sign up"}
              </button>
            </form>
          </>
        )}

        {/* ---- STEP: DETAILS ---- */}
        {step === "details" && (
          <div className={styles.stepPanel}>
            {claimError && (
              <div style={{ marginBottom: "1rem" }}>
                <p className={styles.error}>{claimError}</p>
                <button
                  type="button"
                  className={styles.toggleLink}
                  onClick={retryClaim}
                  disabled={authLoading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {authLoading ? "Trying…" : "Try again"}
                </button>
              </div>
            )}

            <h2 className={styles.heading}>Tell us about your day</h2>
            <p className={styles.subtext}>These details help create your custom wedding link</p>
            {detailsError ? <p className={styles.error}>{detailsError}</p> : null}

            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pm-partner1">
                  Your name
                </label>
                <input
                  id="pm-partner1"
                  className={styles.input}
                  type="text"
                  value={name1}
                  onChange={(e) => setName1(e.target.value)}
                  placeholder="Rareș"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pm-partner2">
                  Partner&#39;s name
                </label>
                <input
                  id="pm-partner2"
                  className={styles.input}
                  type="text"
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                  placeholder="Claudia"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pm-date">
                  Wedding date
                </label>
                <input
                  id="pm-date"
                  className={`${styles.input} ${styles.dateInput}`}
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
            </div>

            {publishError && (
              <p className={styles.error} style={{ marginTop: "0.75rem" }}>
                {publishError}
              </p>
            )}

            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canContinueDetails || detailsSaving}
              onClick={handleContinueToSlug}
              style={{ marginTop: "1.25rem", width: "100%" }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ---- STEP: SLUG ---- */}
        {step === "slug" && (
          <div className={styles.stepPanel}>
            <h2 className={styles.heading}>Choose your wedding link</h2>
            <p className={styles.subtext}>Pick one of the generated URL options below.</p>

            <div className={styles.slugPreview}>
              <span className={styles.slugDomain}>spunemda.ro/</span>
              <span className={styles.slugValue}>{slug || "..."}</span>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <p className={styles.helper} style={{ marginBottom: "0.5rem" }}>
                Other URL options
              </p>
              <div className={styles.form}>
                {slugOptions.map((option) => (
                  <label key={option} className={styles.slugOptionRow}>
                    <input
                      type="radio"
                      name="slug-option"
                      checked={slug === option}
                      onChange={() => setSlug(option)}
                    />
                    <span>spunemda.ro/{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.slugStatus} style={{ marginTop: "0.75rem" }}>
              {slugCheck === "checking" && (
                <span className={styles.slugChecking}>Checking selected link...</span>
              )}
              {slugCheck === "available" && (
                <span className={styles.slugAvailable}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>{" "}
                  Link available
                </span>
              )}
              {slugCheck === "taken" && (
                <span className={styles.slugTaken}>This selected link is already taken.</span>
              )}
              {slugCheck === "invalid" && slug.length > 0 && (
                <span className={styles.slugTaken}>Selected link is invalid.</span>
              )}
            </div>

            {publishError && (
              <p className={styles.error} style={{ marginTop: "0.75rem" }}>
                {publishError}
              </p>
            )}

            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!!claimError || slugCheck !== "available" || publishing || detailsSaving}
              onClick={handlePublish}
              style={{ marginTop: "1.25rem", width: "100%" }}
            >
              {detailsSaving || publishing ? "PUBLISHING..." : "PUBLISH"}
            </button>
          </div>
        )}

        {/* ---- STEP: SUCCESS ---- */}
        {step === "success" && (
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.7-4.35-9.2-8.1C.9 10.03 2.12 6.75 5.1 5.6 7 4.85 9.1 5.43 10.6 7.03L12 8.5l1.4-1.47c1.5-1.6 3.6-2.18 5.5-1.43 2.98 1.15 4.2 4.43 2.3 7.3C18.7 16.65 12 21 12 21z" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Your wedding site is live!</h2>
            <p className={styles.subtext}>Share this link with your guests</p>
            <div className={styles.successUrlBox}>
              <input
                className={styles.successUrlInput}
                readOnly
                value={`spunemda.ro${publishedUrl}`}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button type="button" className={styles.copyBtn} onClick={copyPublishedLink}>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.visitBtn}
            >
              Visit Site
            </a>
            <a href="/dashboard" className={styles.dashboardLink}>
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
