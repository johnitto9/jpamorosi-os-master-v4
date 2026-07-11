// app/api/admin/email/send/route.ts
// Sends a human-composed outreach email. Renders through the SAME composeEmail()
// as the preview, delivers through the central sendRenderedEmail() transport
// (so gate + tracking + email_logs are preserved), and only marks a prospect
// contacted after Resend actually accepts the message.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { env, outboundLeadEmailsEnabled } from "@/lib/env";
import { sendRenderedEmail, isNoreplyAddress } from "@/lib/email/service";
import { composeEmail } from "@/lib/email/composer/compose";
import { resolveComposerMedia } from "@/lib/email/composer/media";
import { getComposerTemplate } from "@/lib/email/composer/registry";
import { getProspect, markProspectOutreachSent } from "@/lib/agent/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  to: z.string().email().max(320),
  template: z.string().min(1).max(64),
  data: z.record(z.unknown()).default({}),
  subjectOverride: z.string().max(300).optional(),
  prospectId: z.number().int().positive().optional(),
  confirmRecipient: z.string().max(320),
});

const norm = (s: string) => s.trim().toLowerCase();

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { to, template, data, subjectOverride, prospectId, confirmRecipient } = parsed.data;

  const tpl = getComposerTemplate(template);
  if (!tpl) return NextResponse.json({ error: "unknown_template" }, { status: 404 });

  // Recipient guards — cheap, before any render or send.
  if (norm(to) !== norm(confirmRecipient)) {
    return NextResponse.json({ error: "recipient_mismatch" }, { status: 400 });
  }
  if (isNoreplyAddress(to)) {
    return NextResponse.json({ error: "noreply_recipient" }, { status: 400 });
  }
  if (tpl.outboundGated && !outboundLeadEmailsEnabled()) {
    return NextResponse.json(
      { error: "outbound_disabled", message: "La compuerta de outbound está deshabilitada (OUTBOUND_LEAD_EMAILS_ENABLED)." },
      { status: 409 },
    );
  }

  const media = await resolveComposerMedia();
  const composed = composeEmail({ template, data, media, subjectOverride });
  if (!composed.ok) {
    return NextResponse.json({ error: composed.error, issues: composed.issues }, { status: 422 });
  }
  const rendered = composed.rendered;

  const sent = await sendRenderedEmail({
    logTemplate: template,
    to,
    rendered,
    outboundGated: tpl.outboundGated,
    tracking: prospectId
      ? { prospectId, campaign: `outreach_studio_${template}` }
      : { campaign: `outreach_studio_${template}` },
  });

  if (!sent.ok) {
    // Never surface internal detail; the prospect is untouched on failure.
    const status = sent.skipped ? 503 : 502;
    return NextResponse.json(
      { error: sent.error ?? "email_not_sent", skipped: sent.skipped === true },
      { status },
    );
  }

  // Mark contacted ONLY after a successful send, and only for a real contact-
  // stage prospect (markProspectOutreachSent is a no-op otherwise).
  let prospectMarked = false;
  if (prospectId) {
    const prospect = await getProspect(prospectId);
    if (prospect && prospect.stage === "contact") {
      prospectMarked = await markProspectOutreachSent(prospectId, sent.id);
    }
  }

  return NextResponse.json({
    ok: true,
    providerId: sent.id,
    subject: rendered.subject,
    prospectMarked,
  });
}

// Advertise env-derived guardrail state to the client (no secrets).
export async function GET() {
  const blocked = await guardAdmin();
  if (blocked) return blocked;
  return NextResponse.json({
    ok: true,
    resendConfigured: !!env.RESEND_API_KEY && !!env.RESEND_FROM_EMAIL,
    outboundEnabled: outboundLeadEmailsEnabled(),
    adminTo: env.RESEND_ADMIN_TO_EMAIL,
  });
}
