"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { Site, SiteState } from "@/types/database";
import styles from "./InviteManager.module.css";

type RsvpData = {
  id: string;
  attending: "yes" | "no";
  guest_name: string;
  guest_count: number;
};

type InvitationRow = {
  id: string;
  site_id: string;
  code: string;
  guest_names: string[];
  status: "pending" | "responded";
  viewed_at: string | null;
  created_at: string;
  rsvp_response: RsvpData | null;
};

type Props = {
  site: Site;
  initialInvitations: InvitationRow[];
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
  return month < 12 ? `${month}mo ago` : `${Math.floor(month / 12)}y ago`;
}

export default function InviteManager({ site, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [guestInputs, setGuestInputs] = useState<string[]>([""]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const state = site.state as SiteState;
  const partner1 = site.partner1_name ?? state?.meta?.partner1 ?? "Partner 1";
  const partner2 = site.partner2_name ?? state?.meta?.partner2 ?? "Partner 2";
  const slug = site.slug ?? site.id;

  const stats = useMemo(() => {
    const viewed = invitations.filter((i) => i.viewed_at).length;
    const responded = invitations.filter((i) => i.status === "responded").length;
    const pending = invitations.filter((i) => i.status === "pending").length;
    return { total: invitations.length, viewed, responded, pending };
  }, [invitations]);

  const addGuestInput = () => {
    if (guestInputs.length < 10) {
      setGuestInputs((prev) => [...prev, ""]);
    }
  };

  const removeGuestInput = (idx: number) => {
    setGuestInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGuestInput = (idx: number, value: string) => {
    setGuestInputs((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const onCreate = async () => {
    const names = guestInputs.map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      setError("Enter at least one guest name.");
      return;
    }

    setCreating(true);
    setError("");
    setJustCreated(null);

    try {
      const res = await fetch(`/api/sites/${site.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_names: names }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create invitation");

      const newInv: InvitationRow = { ...json.invitation, rsvp_response: null };
      setInvitations((prev) => [newInv, ...prev]);
      setGuestInputs([""]);
      setJustCreated(newInv.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = useCallback(
    async (invId: string) => {
      if (!window.confirm("Delete this invitation?")) return;
      setDeletingId(invId);
      try {
        const res = await fetch(
          `/api/sites/${site.id}/invitations?invitation_id=${invId}`,
          { method: "DELETE" }
        );
        if (res.ok) setInvitations((prev) => prev.filter((i) => i.id !== invId));
      } finally {
        setDeletingId(null);
      }
    },
    [site.id]
  );

  const getInviteUrl = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${slug}/${code}`;
  };

  const onCopyLink = (inv: InvitationRow) => {
    navigator.clipboard.writeText(getInviteUrl(inv.code));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onCopyAll = () => {
    const lines = invitations.map(
      (inv) => `${inv.guest_names.join(" & ")}: ${getInviteUrl(inv.code)}`
    );
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  function statusBadge(inv: InvitationRow) {
    if (inv.status === "responded") return <span className={styles.badgeResponded}>Responded</span>;
    if (inv.viewed_at) return <span className={styles.badgeViewed}>Viewed</span>;
    return <span className={styles.badgePending}>Pending</span>;
  }

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard" className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className={styles.siteName}>{partner1} &amp; {partner2}</h1>
            <span className={styles.subHeading}>Invitations</span>
          </div>
        </div>
        {invitations.length > 0 && (
          <button type="button" className={styles.exportBtn} onClick={onCopyAll}>
            {copiedAll ? "Copied!" : "Copy All Links"}
          </button>
        )}
      </header>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.viewed}</span>
          <span className={styles.statLabel}>Viewed</span>
        </div>
        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statValue}>{stats.responded}</span>
          <span className={styles.statLabel}>Responded</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
      </div>

      <div className={styles.createCard}>
        <h2 className={styles.createTitle}>Add New Invitation</h2>
        <div className={styles.guestInputs}>
          {guestInputs.map((val, idx) => (
            <div key={idx} className={styles.guestInputRow}>
              <input
                className={styles.guestInput}
                value={val}
                onChange={(e) => updateGuestInput(idx, e.target.value)}
                placeholder={`Guest ${idx + 1} name`}
              />
              {guestInputs.length > 1 && (
                <button
                  type="button"
                  className={styles.removeInputBtn}
                  onClick={() => removeGuestInput(idx)}
                  title="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {guestInputs.length < 10 && (
          <button type="button" className={styles.addGuestBtn} onClick={addGuestInput}>
            + Add another guest
          </button>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="button"
          className={styles.createBtn}
          disabled={creating}
          onClick={onCreate}
        >
          {creating ? "Creating..." : "Create Invitation"}
        </button>
      </div>

      {invitations.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 6L2 7" />
            </svg>
          </div>
          <h2>No invitations yet</h2>
          <p>Create personal links for your guests above!</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Guests</th>
                  <th>Personal Link</th>
                  <th>Status</th>
                  <th>RSVP</th>
                  <th>Viewed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className={justCreated === inv.id ? styles.justCreated : undefined}>
                    <td className={styles.nameCell}>{inv.guest_names.join(" & ")}</td>
                    <td>
                      <div className={styles.linkCell}>
                        <span className={styles.linkText}>/{slug}/{inv.code}</span>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => onCopyLink(inv)}
                        >
                          {copiedId === inv.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </td>
                    <td>{statusBadge(inv)}</td>
                    <td>
                      {inv.rsvp_response ? (
                        <span className={inv.rsvp_response.attending === "yes" ? styles.rsvpYes : styles.rsvpNo}>
                          {inv.rsvp_response.attending === "yes" ? "Accepted" : "Declined"}
                          {inv.rsvp_response.attending === "yes" && ` (${inv.rsvp_response.guest_count})`}
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.timeCell}>
                      {inv.viewed_at ? toRelativeTime(inv.viewed_at) : "Not yet"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={deletingId === inv.id}
                        onClick={() => void onDelete(inv.id)}
                        title="Delete"
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

          <div className={styles.cardList}>
            {invitations.map((inv) => (
              <div key={inv.id} className={`${styles.invCard} ${justCreated === inv.id ? styles.justCreated : ""}`}>
                <div className={styles.invCardHeader}>
                  <div className={styles.invCardNames}>{inv.guest_names.join(" & ")}</div>
                  {statusBadge(inv)}
                </div>
                <div className={styles.invCardLink}>
                  <span className={styles.linkText}>/{slug}/{inv.code}</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => onCopyLink(inv)}
                  >
                    {copiedId === inv.id ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className={styles.invCardMeta}>
                  {inv.rsvp_response ? (
                    <span className={inv.rsvp_response.attending === "yes" ? styles.rsvpYes : styles.rsvpNo}>
                      {inv.rsvp_response.attending === "yes" ? "Accepted" : "Declined"}
                      {inv.rsvp_response.attending === "yes" && ` (${inv.rsvp_response.guest_count} guests)`}
                    </span>
                  ) : null}
                  <span className={styles.timeCell}>
                    {inv.viewed_at ? `Viewed ${toRelativeTime(inv.viewed_at)}` : "Not yet viewed"}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  disabled={deletingId === inv.id}
                  onClick={() => void onDelete(inv.id)}
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
