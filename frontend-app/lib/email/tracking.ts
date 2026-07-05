// lib/email/tracking.ts
// Trackable outbound links for email marketing / follow-up. A link is an opaque
// token that /api/track/[token] resolves → records the click → 302s to the real
// target. This ties an outbound touch (to a prospect/lead) to an actual visit,
// so a loginless session that clicks a link we sent stops being anonymous and
// the admin sees "this company engaged". Domain: NEXT_PUBLIC_SITE_URL
// (jpamorosi.dev in prod, behind Cloudflare).
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";

export type TrackedLinkInput = {
  target: string; // absolute URL to redirect to
  campaign?: string;
  leadId?: number;
  prospectId?: number;
};

export type ResolvedLink = {
  token: string;
  targetUrl: string;
  leadId: number | null;
  prospectId: number | null;
  sessionId: string | null;
  campaign: string;
};

function isSafeTarget(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Mint a tracked link. Returns the public URL, or null if the target is unsafe
 *  or the DB isn't available (tracking degrades to the raw target upstream). */
export async function createTrackedLink(
  input: TrackedLinkInput,
): Promise<{ token: string; url: string } | null> {
  if (!isSafeTarget(input.target) || !isDbConfigured()) return null;
  const token = randomBytes(12).toString("base64url"); // opaque, non-enumerable
  try {
    await ensureSchema();
    const res = await tryQuery(
      `INSERT INTO tracked_links (token, lead_id, prospect_id, campaign, target_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [token, input.leadId ?? null, input.prospectId ?? null, input.campaign ?? "outreach", input.target],
    );
    if (!res) return null;
    await recordEvent("lead.link.created", {
      token, campaign: input.campaign ?? "outreach", leadId: input.leadId, prospectId: input.prospectId,
    });
    return { token, url: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/api/track/${token}` };
  } catch {
    return null;
  }
}

/** Resolve a token and record the click (idempotent-ish: bumps clicks, stamps
 *  first click time). Returns the target to redirect to, or null if unknown. */
export async function resolveAndRecordClick(token: string): Promise<ResolvedLink | null> {
  if (!isDbConfigured()) return null;
  try {
    await ensureSchema();
    const res = await tryQuery<{
      token: string;
      target_url: string;
      lead_id: number | null;
      prospect_id: number | null;
      session_id: string | null;
      campaign: string;
    }>(
      `WITH clicked AS (
         UPDATE tracked_links
            SET clicks = clicks + 1, clicked_at = COALESCE(clicked_at, now())
          WHERE token = $1
          RETURNING token, target_url, lead_id, prospect_id, campaign
       )
       SELECT c.token, c.target_url, c.lead_id::int AS lead_id,
              c.prospect_id::int AS prospect_id, c.campaign,
              l.session_id::text AS session_id
       FROM clicked c
       LEFT JOIN leads l ON l.id = c.lead_id`,
      [token],
    );
    const row = res?.rows?.[0];
    if (!row) return null;
    await recordEvent("lead.link.clicked", {
      token,
      campaign: row.campaign,
      leadId: row.lead_id,
      prospectId: row.prospect_id,
      sessionId: row.session_id,
    });
    return {
      token: row.token, targetUrl: row.target_url,
      leadId: row.lead_id,
      prospectId: row.prospect_id,
      sessionId: row.session_id,
      campaign: row.campaign,
    };
  } catch {
    return null;
  }
}
