"use client";

import { useEffect } from "react";

type Props = { siteId: string; code: string };

export default function InviteViewTracker({ siteId, code }: Props) {
  useEffect(() => {
    fetch(`/api/invitations/${code}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: siteId }),
    }).catch(() => {});
  }, [siteId, code]);

  return null;
}
