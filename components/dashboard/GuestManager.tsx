"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { RsvpField, RsvpResponse, Site, SiteState } from "@/types/database";
import styles from "./GuestManager.module.css";

type Props = {
  site: Site;
  initialResponses: RsvpResponse[];
};

type Filter = "all" | "yes" | "no";
type Sort = "newest" | "oldest" | "name";

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
  return month < 12 ? `${month}mo ago` : `${Math.floor(month / 12)}y ago`;
}

function exportCSV(responses: RsvpResponse[], rsvpFields: RsvpField[]) {
  const headers = ["Name", "Email", "Attending", "Party Size", ...rsvpFields.map((f) => f.label), "Submitted"];
  const rows = responses.map((r) => [
    r.guest_name,
    r.guest_email ?? "",
    r.attending,
    String(r.guest_count),
    ...rsvpFields.map((f) => (r.data as Record<string, string>)?.[f.id] ?? ""),
    new Date(r.submitted_at).toLocaleString(),
  ]);

  const escape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rsvp-responses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function GuestManager({ site, initialResponses }: Props) {
  const [responses, setResponses] = useState(initialResponses);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const state = site.state as SiteState;
  const rsvpFields: RsvpField[] = state?.rsvpFields ?? [];
  const partner1 = site.partner1_name ?? state?.meta?.partner1 ?? "Partner 1";
  const partner2 = site.partner2_name ?? state?.meta?.partner2 ?? "Partner 2";
  const slug = site.slug ?? site.id;
  const isPublished = site.status === "published";

  const stats = useMemo(() => {
    const attending = responses.filter((r) => r.attending === "yes");
    const declining = responses.filter((r) => r.attending === "no");
    return {
      total: responses.length,
      attending: attending.length,
      declining: declining.length,
      totalGuests: attending.reduce((sum, r) => sum + (r.guest_count ?? 1), 0),
    };
  }, [responses]);

  const filtered = useMemo(() => {
    let list = [...responses];
    if (filter === "yes") list = list.filter((r) => r.attending === "yes");
    if (filter === "no") list = list.filter((r) => r.attending === "no");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.guest_name.toLowerCase().includes(q) || (r.guest_email ?? "").toLowerCase().includes(q)
      );
    }
    if (sort === "oldest") list.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    else if (sort === "name") list.sort((a, b) => a.guest_name.localeCompare(b.guest_name));
    else list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return list;
  }, [responses, filter, search, sort]);

  const onDelete = useCallback(
    async (rsvpId: string) => {
      if (!window.confirm("Delete this RSVP?")) return;
      setDeletingId(rsvpId);
      try {
        const res = await fetch(`/api/sites/${site.id}/rsvps?rsvpId=${rsvpId}`, { method: "DELETE" });
        if (res.ok) setResponses((prev) => prev.filter((r) => r.id !== rsvpId));
      } finally {
        setDeletingId(null);
      }
    },
    [site.id]
  );

  const onCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className={styles.siteName}>{partner1} &amp; {partner2}</h1>
            <span className={isPublished ? styles.publishedBadge : styles.draftBadge}>
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <button type="button" className={styles.exportBtn} onClick={() => exportCSV(responses, rsvpFields)} disabled={responses.length === 0}>
          Export CSV
        </button>
      </header>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Responses</span>
        </div>
        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statValue}>{stats.attending}</span>
          <span className={styles.statLabel}>Attending</span>
        </div>
        <div className={`${styles.statCard} ${styles.statRed}`}>
          <span className={styles.statValue}>{stats.declining}</span>
          <span className={styles.statLabel}>Declining</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.totalGuests}</span>
          <span className={styles.statLabel}>Total Guests</span>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h2>No RSVPs yet</h2>
          <p>Share your wedding link to start collecting responses!</p>
          <div className={styles.shareBox}>
            <span className={styles.shareUrl}>{typeof window !== "undefined" ? window.location.origin : ""}/<strong>{slug}</strong></span>
            <button type="button" className={styles.copyBtn} onClick={onCopyLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.filterTabs}>
              {(["all", "yes", "no"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "yes" ? "Attending" : "Declining"}
                </button>
              ))}
            </div>
            <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Desktop table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Email</th>
                  <th>Attending</th>
                  <th>Party Size</th>
                  {rsvpFields.map((f) => (
                    <th key={f.id}>{f.label}</th>
                  ))}
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.nameCell}>{r.guest_name}</td>
                    <td className={styles.emailCell}>{r.guest_email ?? "—"}</td>
                    <td>
                      <span className={r.attending === "yes" ? styles.badgeYes : styles.badgeNo}>
                        {r.attending === "yes" ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{r.guest_count}</td>
                    {rsvpFields.map((f) => (
                      <td key={f.id}>{(r.data as Record<string, string>)?.[f.id] ?? "—"}</td>
                    ))}
                    <td className={styles.timeCell}>{toRelativeTime(r.submitted_at)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={deletingId === r.id}
                        onClick={() => void onDelete(r.id)}
                        title="Delete RSVP"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={styles.cardList}>
            {filtered.map((r) => (
              <div key={r.id} className={styles.rsvpCard}>
                <div className={styles.rsvpCardHeader}>
                  <div>
                    <div className={styles.rsvpCardName}>{r.guest_name}</div>
                    <div className={styles.rsvpCardEmail}>{r.guest_email ?? "No email"}</div>
                  </div>
                  <span className={r.attending === "yes" ? styles.badgeYes : styles.badgeNo}>
                    {r.attending === "yes" ? "Yes" : "No"}
                  </span>
                </div>
                <div className={styles.rsvpCardBody}>
                  <span>Party size: {r.guest_count}</span>
                  {rsvpFields.map((f) => {
                    const val = (r.data as Record<string, string>)?.[f.id];
                    return val ? <span key={f.id}>{f.label}: {val}</span> : null;
                  })}
                  <span className={styles.timeCell}>{toRelativeTime(r.submitted_at)}</span>
                </div>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  disabled={deletingId === r.id}
                  onClick={() => void onDelete(r.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
