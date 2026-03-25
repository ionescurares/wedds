"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type EditorBannerProps = {
  isSaving: boolean;
  lastSaved: Date | null;
  dbSyncEnabled: boolean;
  onToggleDbSync: () => void;
  isDirty: boolean;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionDisabled?: boolean;
  isPublished?: boolean;
  publishedSlug?: string | null;
};

function formatSavedAt(date: Date | null): string {
  if (!date) {
    return "Not saved yet";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function UserBadge({ user }: { user: User }) {
  const label =
    user.user_metadata?.display_name ??
    user.email ??
    "You";
  const initials = label
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="builder-user-badge" title={user.email ?? ""}>
      <span className="builder-user-avatar">{initials}</span>
    </span>
  );
}

export default function EditorBanner({
  isSaving,
  lastSaved,
  dbSyncEnabled,
  onToggleDbSync,
  isDirty,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  isPublished = false,
  publishedSlug = null,
}: EditorBannerProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const goHome = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave the editor anyway?")) {
      return;
    }
    router.push("/");
  }, [isDirty, router]);

  const handleLogout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.push("/");
    }
  }, [router]);

  return (
    <header className="builder-banner">
      <div className="builder-banner-left">
        <button type="button" className="builder-home-link" onClick={goHome} title="Back to Spunem Da">
          <span className="builder-home-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M15 18l-6-6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="builder-home-brand">Spunem Da</span>
        </button>
        <div className="builder-hint">
          Click any text to edit. Hover a photo and use Change to replace it.
        </div>
      </div>

      <div className="builder-banner-right">
        {user && <UserBadge user={user} />}
        {user && (
          <button
            type="button"
            className="builder-btn builder-btn-secondary"
            onClick={handleLogout}
          >
            Logout
          </button>
        )}

        <button
          type="button"
          className="builder-db-toggle"
          onClick={onToggleDbSync}
          title={dbSyncEnabled ? "DB sync ON — click to disable" : "DB sync OFF — using localStorage only"}
        >
          <span className={`builder-db-indicator ${dbSyncEnabled ? "on" : "off"}`} />
          <span className="builder-db-label">DB {dbSyncEnabled ? "ON" : "OFF"}</span>
        </button>

        <div className="builder-save-status">
          <span className={`builder-dot ${isSaving ? "saving" : "saved"}`} />
          <span>
            {!dbSyncEnabled
              ? "Local only"
              : isSaving
                ? "Saving..."
                : `Saved ${formatSavedAt(lastSaved)}`}
          </span>
        </div>

        <button
          type="button"
          className="builder-btn builder-btn-secondary"
          onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
        >
          Preview
        </button>
        {isPublished && publishedSlug ? (
          <>
            <span className="builder-published-badge">Published</span>
            <a
              className="builder-live-link"
              href={`/${publishedSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              spunemda.ro/{publishedSlug}
            </a>
          </>
        ) : null}
        <button
          type="button"
          className="builder-btn builder-btn-primary"
          onClick={onPrimaryAction}
          disabled={primaryActionDisabled}
        >
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
}
