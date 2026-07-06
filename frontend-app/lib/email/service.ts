// lib/email/service.ts
// -----------------------------------------------------------------------------
// Central reusable email service (Resend transport). Server-only.
//
// Contract:
//   sendEmail({ template, to, data }) -> { ok, id?, skipped? }
//
// Degradation (never breaks a flow):
//   - RESEND_API_KEY missing  -> logged + email_logs row (ok=false,
//     error="skipped_no_api_key"), returns { ok:false, skipped:true }.
//   - Resend/network failure  -> logged + email_logs row + email.failed event.
// Secrets NEVER appear in logs; only template name, recipient and subject.
// -----------------------------------------------------------------------------

import { env, isEmailConfigured, outboundLeadEmailsEnabled } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";
import { templates, type TemplateName, type RenderedEmail } from "./templates";
import { createTrackedLink, type TrackedLinkInput } from "./tracking";

export type SendResult = { ok: boolean; id?: string; skipped?: boolean; error?: string };
export type EmailTrackingContext = Omit<TrackedLinkInput, "target"> & {
  enabled?: boolean;
};

const OUTBOUND_LEAD_TEMPLATES = new Set<TemplateName>([
  "lead_followup",
  "prospect_outreach",
]);

export function isOutboundLeadTemplate(template: TemplateName): boolean {
  return OUTBOUND_LEAD_TEMPLATES.has(template);
}

async function logEmail(
  template: string,
  to: string,
  subject: string,
  ok: boolean,
  providerId?: string,
  error?: string,
): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await ensureSchema();
    await tryQuery(
      `INSERT INTO email_logs (template, to_email, subject, ok, provider_id, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [template, to, subject, ok, providerId ?? null, error?.slice(0, 300) ?? null],
    );
  } catch {
    /* log table is best-effort */
  }
}

export async function sendEmail<T extends TemplateName>(input: {
  template: T;
  to: string;
  data: Parameters<(typeof templates)[T]>[0];
  tracking?: EmailTrackingContext;
}): Promise<SendResult> {
  const { template, to } = input;
  const renderedBase: RenderedEmail = (
    templates[template] as (d: unknown) => RenderedEmail
  )(input.data);
  const rendered = await withTrackedLinks(renderedBase, {
    ...input.tracking,
    campaign: input.tracking?.campaign ?? template,
  });

  if (isOutboundLeadTemplate(template) && !outboundLeadEmailsEnabled()) {
    console.warn(
      `[email] outbound lead gate disabled — "${template}" to ${to} logged only (subject: ${rendered.subject})`,
    );
    await logEmail(template, to, rendered.subject, false, undefined, "outbound_lead_email_disabled");
    await recordEvent("email.blocked", { template, to, reason: "outbound_lead_email_disabled" });
    return { ok: false, skipped: true, error: "outbound_lead_email_disabled" };
  }

  if (!isEmailConfigured()) {
    console.warn(
      `[email] RESEND not configured — "${template}" to ${to} logged only (subject: ${rendered.subject})`,
    );
    await logEmail(template, to, rendered.subject, false, undefined, "skipped_no_api_key");
    return { ok: false, skipped: true, error: "skipped_no_api_key" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL as string,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (error) throw new Error(error.message);
    await logEmail(template, to, rendered.subject, true, data?.id);
    await recordEvent("email.sent", { template, to, subject: rendered.subject });
    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[email] send failed ("${template}" to ${to}):`, msg.slice(0, 200));
    await logEmail(template, to, rendered.subject, false, undefined, msg);
    await recordEvent("email.failed", { template, to, error: msg.slice(0, 200) });
    return { ok: false, error: msg };
  }
}

/** Shortcut: notify the admin inbox (RESEND_ADMIN_TO_EMAIL). */
export async function notifyAdmin<T extends TemplateName>(
  template: T,
  data: Parameters<(typeof templates)[T]>[0],
): Promise<SendResult> {
  return sendEmail({ template, to: env.RESEND_ADMIN_TO_EMAIL, data });
}

function decodeHref(href: string): string {
  return href.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

function escapeHref(href: string): string {
  return href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function isTrackableHref(href: string): boolean {
  try {
    const url = new URL(href);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.pathname.startsWith("/api/track/") &&
      !url.pathname.includes("/api/track/")
    );
  } catch {
    return false;
  }
}

async function withTrackedLinks(
  rendered: RenderedEmail,
  tracking?: EmailTrackingContext,
): Promise<RenderedEmail> {
  if (!tracking?.enabled && !tracking?.leadId && !tracking?.prospectId) return rendered;

  const hrefs = [...rendered.html.matchAll(/href="([^"]+)"/g)]
    .map((m) => decodeHref(m[1]))
    .filter(isTrackableHref);
  const targets = Array.from(new Set(hrefs));
  if (targets.length === 0) return rendered;

  const replacements = new Map<string, string>();
  for (const target of targets) {
    const tracked = await createTrackedLink({
      target,
      campaign: tracking.campaign,
      leadId: tracking.leadId,
      prospectId: tracking.prospectId,
    });
    replacements.set(target, tracked?.url ?? target);
  }

  let html = rendered.html;
  for (const [target, tracked] of replacements) {
    html = html.replaceAll(`href="${escapeHref(target)}"`, `href="${escapeHref(tracked)}"`);
  }

  let text = rendered.text;
  for (const [target, tracked] of replacements) {
    text = text.replaceAll(target, tracked);
  }

  return { ...rendered, html, text };
}

export type EmailLogRow = {
  id: number;
  template: string;
  toEmail: string;
  subject: string;
  ok: boolean;
  providerId: string | null;
  error: string | null;
  createdAt: string;
};

/** Admin listing of email attempts, newest first. */
export async function listEmailLogs(limit = 100): Promise<EmailLogRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
  } catch {
    return [];
  }
  const res = await tryQuery<EmailLogRow>(
    `SELECT id, template, to_email AS "toEmail", subject, ok,
            provider_id AS "providerId", error, created_at::text AS "createdAt"
     FROM email_logs ORDER BY id DESC LIMIT $1`,
    [limit],
  );
  return res?.rows ?? [];
}
