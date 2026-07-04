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

import { env, isEmailConfigured } from "@/lib/env";
import { isDbConfigured, tryQuery } from "@/lib/db/pool";
import { ensureSchema } from "@/lib/db/bootstrap";
import { recordEvent } from "@/lib/events";
import { templates, type TemplateName, type RenderedEmail } from "./templates";

export type SendResult = { ok: boolean; id?: string; skipped?: boolean; error?: string };

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
}): Promise<SendResult> {
  const { template, to } = input;
  const rendered: RenderedEmail = (
    templates[template] as (d: unknown) => RenderedEmail
  )(input.data);

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
