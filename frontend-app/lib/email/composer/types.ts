// lib/email/composer/types.ts
// Declarative shape of a human-composed outreach category. The UI renders its
// form from `fields`, the endpoints validate with `schema`, and `render` is the
// single pure function that produces the exact { subject, html, text } used by
// BOTH the live preview and the actual send.
import type { z } from "zod";
import type { RenderedEmail } from "../shell";

export type FieldType = "text" | "email" | "textarea" | "url" | "select" | "checkbox";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  /** "common" fields share the top zone across categories; "body" are the
   *  semantic content blocks specific to the intention. */
  group: "common" | "body";
  placeholder?: string;
  help?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number; // textarea height hint
  options?: Array<{ value: string; label: string }>;
};

export type ComposerMedia = { avatarUrl?: string; visualUrl?: string };

export type ComposerTemplate = {
  key: string;
  label: string;
  description: string;
  /** Customer-facing → subject to OUTBOUND_LEAD_EMAILS_ENABLED at send time. */
  outboundGated: boolean;
  fields: FieldDef[];
  schema: z.ZodType;
  defaults: Record<string, unknown>;
  /** PURE renderer — no env, no I/O, no side effects. Same input → same output. */
  render: (data: unknown, media: ComposerMedia) => RenderedEmail;
};
