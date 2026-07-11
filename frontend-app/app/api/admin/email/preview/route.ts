// app/api/admin/email/preview/route.ts
// Renders a composer email for live preview. PURE read: never sends, never
// touches prospects, never writes email_logs, never calls Resend. Uses the
// exact same composeEmail() the send route uses, so preview == sent output.
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAdmin } from "@/lib/auth/guard";
import { composeEmail } from "@/lib/email/composer/compose";
import { resolveComposerMedia } from "@/lib/email/composer/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  template: z.string().min(1).max(64),
  data: z.record(z.unknown()).default({}),
  subjectOverride: z.string().max(300).optional(),
  prospectId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const media = await resolveComposerMedia();
  const result = composeEmail({
    template: parsed.data.template,
    data: parsed.data.data,
    media,
    subjectOverride: parsed.data.subjectOverride,
  });

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      subject: result.rendered.subject,
      html: result.rendered.html,
      text: result.rendered.text,
      warnings: result.warnings,
    });
  }

  return NextResponse.json(
    { error: result.error, issues: result.issues },
    { status: result.error === "unknown_template" ? 404 : 422 },
  );
}
