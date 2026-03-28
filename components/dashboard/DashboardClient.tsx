"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteState, SiteStatus } from "@/types/database";
import styles from "./DashboardClient.module.css";

export type DashboardSite = {
  id: string;
  slug: string | null;
  status: SiteStatus;
  updated_at: string;
  published_at: string | null;
  partner1_name: string | null;
  partner2_name: string | null;
  event_date: string | null;
  state: SiteState;
  rsvp_yes_count: number;
  rsvp_no_count: number;
  rsvp_total_guests: number;
};

type Props = {
  initialSites: DashboardSite[];
  userEmail: string;
  inviteStats?: Record<string, { total: number; responded: number }>;
};

function toRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(month / 12);
  return `${year}y ago`;
}

function formatEventDate(value: string | null): string {
  if (!value) return "Wedding date";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default function DashboardClient({ initialSites, userEmail, inviteStats = {} }: Props) {
  const [sites, setSites] = useState(initialSites);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sortedSites = useMemo(
    () =>
      [...sites].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [sites]
  );

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const publishSite = async (site: DashboardSite) => {
    const slug = (site.slug ?? site.id).trim().toLowerCase();
    const partner1 = (site.partner1_name ?? site.state?.meta?.partner1 ?? "").trim();
    const partner2 = (site.partner2_name ?? site.state?.meta?.partner2 ?? "").trim();
    const eventDate = (site.event_date ?? "").trim();
    if (!partner1 || !partner2 || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      setError("Missing partner/date details. Open this site in Builder and publish once to set them.");
      return;
    }

    setSavingId(site.id);
    setError("");
    try {
      const res = await fetch(`/api/sites/${site.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          partner1_name: partner1,
          partner2_name: partner2,
          event_date: eventDate,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Publish failed.");
      }
      setSites((prev) =>
        prev.map((s) =>
          s.id === site.id
            ? {
                ...s,
                slug,
                status: "published",
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : s
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed.";
      setError(msg);
    } finally {
      setSavingId(null);
    }
  };

  const patchSite = async (siteId: string, payload: Record<string, unknown>) => {
    setSavingId(siteId);
    setError("");
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { site?: DashboardSite; error?: string };
      if (!res.ok || !json.site) {
        throw new Error(json.error ?? "Request failed.");
      }
      setSites((prev) => prev.map((s) => (s.id === siteId ? json.site! : s)));
      return json.site;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
      return null;
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (site: DashboardSite) => {
    if (!window.confirm("Delete this site permanently?")) return;
    setSavingId(site.id);
    setError("");
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Delete failed.");
      }
      setSites((prev) => prev.filter((s) => s.id !== site.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      setError(msg);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.topBar}>
        <div className={styles.userText}>{userEmail}</div>
        <div className={styles.actions}>
          <button className={styles.secondaryBtn} onClick={onLogout} type="button">
            Log Out
          </button>
          <Link href="/builder/new" className={styles.primaryBtn}>
            Create New Site
          </Link>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {sortedSites.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>❤</div>
          <h2>No wedding sites yet. Create your first one!</h2>
          <Link href="/builder/new" className={styles.primaryBtn}>
            Start Building
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {sortedSites.map((site) => {
            const partner1 = site.partner1_name || site.state?.meta?.partner1 || "Partner 1";
            const partner2 = site.partner2_name || site.state?.meta?.partner2 || "Partner 2";
            const date = formatEventDate(site.event_date) || site.state?.meta?.date || "Wedding date";
            const effectiveSlug = site.slug || site.id;
            const isPublished = site.status === "published";
            const isSaving = savingId === site.id;

            return (
              <article key={site.id} className={styles.card}>
                <div className={styles.preview}>
                  <div className={styles.names}>
                    {partner1} &amp; {partner2}
                  </div>
                  <div className={styles.date}>{date}</div>
                </div>

                <div className={styles.cardMeta}>
                  <span className={isPublished ? styles.publishedBadge : styles.draftBadge}>
                    {isPublished ? "Published" : "Draft"}
                  </span>
                  <span className={styles.lastEdited}>Last edited {toRelativeTime(site.updated_at)}</span>
                </div>

                {isPublished ? (
                  <a
                    className={styles.publicUrl}
                    href={`/${effectiveSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    spunemda.ro/{effectiveSlug}
                  </a>
                ) : (
                  <span className={styles.muted}>Not published yet</span>
                )}

                {(site.rsvp_yes_count > 0 || site.rsvp_no_count > 0) ? (
                  <div className={styles.rsvpStats}>
                    <span className={styles.rsvpStatGreen}>{site.rsvp_yes_count} attending</span>
                    <span className={styles.rsvpStatMuted}>{site.rsvp_no_count} declined</span>
                    <span className={styles.rsvpStatMuted}>{site.rsvp_total_guests} total guests</span>
                  </div>
                ) : (
                  <span className={styles.muted}>No RSVPs yet</span>
                )}

                {inviteStats[site.id] && inviteStats[site.id].total > 0 && (
                  <div className={styles.rsvpStats}>
                    <span className={styles.rsvpStatMuted}>
                      {inviteStats[site.id].total} invitation{inviteStats[site.id].total !== 1 ? "s" : ""}, {inviteStats[site.id].responded} responded
                    </span>
                  </div>
                )}

                <div className={styles.row}>
                  <Link href={`/builder/${site.id}`} className={styles.secondaryBtn}>
                    Edit
                  </Link>

                  <Link href={`/dashboard/${site.id}/guests`} className={styles.secondaryBtn}>
                    Guests
                  </Link>

                  <Link href={`/dashboard/${site.id}/invites`} className={styles.secondaryBtn}>
                    Invitations
                  </Link>

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={isSaving}
                    onClick={() =>
                      isPublished
                        ? void patchSite(site.id, { status: "draft" })
                        : void publishSite(site)
                    }
                  >
                    {isPublished ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    className={styles.deleteBtn}
                    disabled={isSaving}
                    onClick={() => void onDelete(site)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
