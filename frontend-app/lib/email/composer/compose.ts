// lib/email/composer/compose.ts
// The ONE function that turns a composer request into { subject, html, text }.
// Preview and send both call this with the same inputs, so what the admin sees
// is byte-for-byte what Resend receives. Pure: no env, no I/O, no side effects.
import { getComposerTemplate } from "./registry";
import type { ComposerMedia } from "./types";
import type { RenderedEmail } from "../shell";

export type ComposeInput = {
  template: string;
  data: unknown;
  media: ComposerMedia;
  subjectOverride?: string;
};

// Flat shape (this project runs with `strict: false`, so discriminated-union
// narrowing on `ok` is unreliable — keep the fields directly accessible).
export type ComposeError = "unknown_template" | "invalid_data";
export type ComposeResult = {
  ok: boolean;
  rendered?: RenderedEmail;
  warnings?: string[];
  error?: ComposeError;
  issues?: Record<string, string[]>;
};

export function composeEmail(input: ComposeInput): ComposeResult {
  const tpl = getComposerTemplate(input.template);
  if (!tpl) return { ok: false, error: "unknown_template" };

  const parsed = tpl.schema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: "invalid_data", issues: parsed.error.flatten().fieldErrors };
  }

  const base = tpl.render(parsed.data, input.media);
  const override = input.subjectOverride?.trim();
  const subject = override || base.subject;
  const rendered: RenderedEmail = { ...base, subject };

  const warnings: string[] = [];
  // Empty-body detection reads the registry's own body fields, not the rendered
  // text (which always carries greeting + CTA + signature chrome).
  const data = parsed.data as Record<string, unknown>;
  const bodyFilled = tpl.fields
    .filter((f) => f.group === "body" && f.type !== "checkbox")
    .some((f) => String(data[f.name] ?? "").trim().length > 0);
  if (!bodyFilled) {
    warnings.push("El cuerpo del email está casi vacío — agregá contenido antes de enviar.");
  }
  if (subject.length > 120) {
    warnings.push("El asunto es muy largo; puede recortarse en algunos clientes de email.");
  }
  const showsVisual = (parsed.data as { showVisual?: boolean }).showVisual === true;
  if (showsVisual && !input.media.visualUrl) {
    warnings.push("La visual secundaria está activada pero no hay imagen configurada; no se mostrará.");
  }

  return { ok: true, rendered, warnings };
}
