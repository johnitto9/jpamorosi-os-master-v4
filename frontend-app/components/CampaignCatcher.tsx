"use client";

// components/CampaignCatcher.tsx
// Email-marketing loop closer: campaign links carry ?al_ref=<campaign-or-lead
// token>. On landing we persist it (90d cookie) so the assistant session that
// follows is MATCHED to the outreach that brought them — visible in
// /admin/sessions and in the session_started email. Mounted in the root
// layout: one tiny effect, zero render.

import { useEffect } from "react";

export function CampaignCatcher() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("al_ref");
      if (ref && /^[\w.-]{1,80}$/.test(ref)) {
        document.cookie = `al_campaign=${encodeURIComponent(ref)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
      }
    } catch {
      /* no-op */
    }
  }, []);
  return null;
}

export default CampaignCatcher;
