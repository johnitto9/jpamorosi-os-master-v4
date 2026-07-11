// lib/email/composer/registry.ts
// -----------------------------------------------------------------------------
// The modular catalogue of human-composed outreach intentions. Adding a fourth
// category is: register metadata + fields, declare a schema, write a render()
// mapping into renderComposite(). The screen never changes.
//
// Every render() reuses the shared Amorosi Labs chrome (lib/email/shell.ts), so
// the three categories read as variations of one identity, not three emails.
// -----------------------------------------------------------------------------
import { z } from "zod";
import { renderComposite, type CompositeBlock, type RenderedEmail } from "../shell";
import type { ComposerMedia, ComposerTemplate, FieldDef } from "./types";

// Public canonical origin — the CTA + tracked links must point at the live site
// regardless of the runtime's NEXT_PUBLIC_SITE_URL (keeps render env-free/pure).
const CTA_HREF = "https://jpamorosi.dev";
const SIGN_NAME = "Juan Pablo Amorosi";

type Lang = "es" | "en";

const L = {
  es: {
    greeting: "Hola",
    intro: "Soy Juan",
    role: "AI Product Engineer · Amorosi Labs",
    teamOf: (c: string) => `equipo de ${c}`,
    observed: "Qué vi",
    reading: "Mi lectura",
    proposal: "Qué propondría",
    proof: "Prueba concreta",
    nextStep: "Próximo paso",
    fitLabel: "Por qué encaja",
    systemLabel: "Sistema relevante",
    valueLabel: "Qué aportaría",
    context: "Contexto anterior",
    update: "Novedad",
    cta: "Ver los sistemas en producción →",
    ctaFollow: "Retomemos la conversación →",
    sourceLabel: "Contexto que revisé:",
    replyNote: "Respondé a este email y le llega directamente a Juan.",
    visualAlt: "Orbe — empezá un proyecto con IA dentro del CV interactivo de Juan",
    visualCaption:
      "Pasate por mi CV interactivo y conocé a Orbe — empecemos juntos un nuevo proyecto con IA",
    subjFounder: (company: string, hint: string) =>
      `${company ? `${company}: ` : ""}${hint || "una señal que vi"}`,
    subjOpportunity: (company: string, roleNeed: string) =>
      `Sobre ${roleNeed || "la búsqueda"}${company ? ` en ${company}` : ""}`,
    subjFollowup: (company: string) =>
      `Retomamos lo que hablamos${company ? ` — ${company}` : ""}`,
  },
  en: {
    greeting: "Hi",
    intro: "I'm Juan",
    role: "AI Product Engineer · Amorosi Labs",
    teamOf: (c: string) => `${c} team`,
    observed: "What I saw",
    reading: "My read",
    proposal: "What I'd propose",
    proof: "Concrete proof",
    nextStep: "Next step",
    fitLabel: "Why it fits",
    systemLabel: "Relevant system",
    valueLabel: "What I'd bring",
    context: "Earlier context",
    update: "What's new",
    cta: "See the systems in production →",
    ctaFollow: "Let's pick the conversation back up →",
    sourceLabel: "Context I reviewed:",
    replyNote: "Reply here and it lands directly with Juan.",
    visualAlt: "Orbe — start an AI project inside Juan's interactive CV",
    visualCaption:
      "Drop by my interactive CV and meet Orbe — let's start a new AI project together",
    subjOpportunity: (company: string, roleNeed: string) =>
      `About ${roleNeed || "the role"}${company ? ` at ${company}` : ""}`,
    subjFounder: (company: string, hint: string) =>
      `${company ? `${company}: ` : ""}${hint || "something I noticed"}`,
    subjFollowup: (company: string) =>
      `Picking up where we left off${company ? ` — ${company}` : ""}`,
  },
} satisfies Record<Lang, Record<string, unknown>>;

// short subject hint from the first words of a body block
const firstWords = (s: string, words = 8) =>
  s.replace(/\s+/g, " ").trim().split(" ").slice(0, words).join(" ").slice(0, 80);

function greetingLine(lang: Lang, contactName?: string, company?: string): string {
  const l = L[lang];
  const target = contactName?.trim() || (company?.trim() ? l.teamOf(company.trim()) : "");
  return `${l.greeting}${target ? `, ${target}` : ""}`;
}

// shared assembly — every category funnels its blocks through here so the
// visual identity and text/plain output are produced in ONE place.
function assemble(opts: {
  lang: Lang;
  accent?: string;
  contactName?: string;
  company?: string;
  blocks: CompositeBlock[];
  ctaLabel: string;
  subject: string;
  sourceUrl?: string;
  showVisual: boolean;
  media: ComposerMedia;
}): RenderedEmail {
  const l = L[opts.lang];
  const { html, text } = renderComposite({
    accent: opts.accent,
    greeting: greetingLine(opts.lang, opts.contactName, opts.company),
    introEyebrow: l.intro,
    introName: SIGN_NAME,
    introRole: l.role,
    avatarUrl: opts.media.avatarUrl,
    blocks: opts.blocks,
    visualUrl: opts.media.visualUrl,
    visualShown: opts.showVisual,
    visualAlt: l.visualAlt,
    visualCaption: l.visualCaption,
    ctaLabel: opts.ctaLabel,
    ctaHref: CTA_HREF,
    sourceUrl: opts.sourceUrl?.trim() || undefined,
    sourceLabel: l.sourceLabel,
    signName: SIGN_NAME,
    signRole: l.role,
    replyNote: l.replyNote,
  });
  return { subject: opts.subject, html, text };
}

// ---- shared field builders ---------------------------------------------------
const langField: FieldDef = {
  name: "lang",
  label: "Idioma",
  type: "select",
  group: "common",
  options: [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
  ],
};
const visualField: FieldDef = {
  name: "showVisual",
  label: "Mostrar visual secundaria (Orbe)",
  type: "checkbox",
  group: "body",
};
const commonHead: FieldDef[] = [
  { name: "contactName", label: "Nombre", type: "text", group: "common", placeholder: "Nombre del destinatario", maxLength: 120 },
  { name: "email", label: "Email", type: "email", group: "common", required: true, placeholder: "persona@empresa.com" },
  { name: "company", label: "Empresa", type: "text", group: "common", placeholder: "Empresa u organización", maxLength: 160 },
];

const langSchema = z.enum(["es", "en"]).default("es");
const optStr = (max: number) => z.string().max(max).optional().default("");

// Small helper so each template keeps its own inferred data type inside render
// while the map stays a plain ComposerTemplate[].
function define<S extends z.ZodType>(cfg: {
  key: string;
  label: string;
  description: string;
  outboundGated: boolean;
  fields: FieldDef[];
  schema: S;
  defaults: z.input<S>;
  render: (data: z.infer<S>, media: ComposerMedia) => RenderedEmail;
}): ComposerTemplate {
  return {
    key: cfg.key,
    label: cfg.label,
    description: cfg.description,
    outboundGated: cfg.outboundGated,
    fields: cfg.fields,
    schema: cfg.schema,
    defaults: cfg.defaults as Record<string, unknown>,
    render: (data, media) => cfg.render(cfg.schema.parse(data) as z.infer<S>, media),
  };
}

// ---- A. Founder / concrete signal -------------------------------------------
const founderSchema = z.object({
  lang: langSchema,
  contactName: optStr(120),
  company: optStr(160),
  title: optStr(160),
  opening: optStr(1200),
  observed: optStr(1600),
  reading: optStr(1600),
  proposal: optStr(1600),
  proof: optStr(1600),
  cta: optStr(600),
  sourceUrl: optStr(500),
  showVisual: z.boolean().default(true),
});

const founder = define({
  key: "founder_direct",
  label: "Founder / señal concreta",
  description:
    "Para un founder o decisor cuando sabés qué está construyendo y dónde hay una oportunidad. Investigado y específico, nunca genérico.",
  outboundGated: true,
  fields: [
    ...commonHead,
    { name: "title", label: "Cargo o rol", type: "text", group: "common", placeholder: "Founder, Head of Ops…", maxLength: 160 },
    langField,
    { name: "opening", label: "Apertura", type: "textarea", group: "body", rows: 3, placeholder: "Una línea honesta de por qué escribís, sin vueltas.", maxLength: 1200 },
    { name: "observed", label: "Qué observé", type: "textarea", group: "body", rows: 3, placeholder: "La señal concreta que viste (producto, búsqueda, post, cambio).", maxLength: 1600 },
    { name: "reading", label: "Lectura del problema/oportunidad", type: "textarea", group: "body", rows: 3, placeholder: "Tu interpretación útil de lo que eso implica.", maxLength: 1600 },
    { name: "proposal", label: "Qué propondría construir/resolver", type: "textarea", group: "body", rows: 3, placeholder: "Algo chico, creíble y medible.", maxLength: 1600 },
    { name: "proof", label: "Prueba o experiencia relevante", type: "textarea", group: "body", rows: 2, placeholder: "Un sistema real que ya shippeaste y aplica.", maxLength: 1600 },
    { name: "cta", label: "CTA / próximo paso", type: "textarea", group: "body", rows: 2, placeholder: "Un pedido de baja fricción.", maxLength: 600 },
    { name: "sourceUrl", label: "URL de origen (opcional)", type: "url", group: "body", placeholder: "https://…" },
    visualField,
  ],
  schema: founderSchema,
  defaults: { lang: "es", showVisual: true },
  render: (d, media) => {
    const l = L[d.lang];
    const blocks: CompositeBlock[] = [
      { kind: "paragraph", text: d.opening },
      { kind: "row", label: l.observed, value: d.observed },
      { kind: "row", label: l.reading, value: d.reading },
      { kind: "row", label: l.proposal, value: d.proposal },
      { kind: "row", label: l.proof, value: d.proof },
      { kind: "row", label: l.nextStep, value: d.cta },
    ];
    return assemble({
      lang: d.lang,
      accent: "#00e5ff",
      contactName: d.contactName,
      company: d.company,
      blocks,
      ctaLabel: l.cta,
      subject: l.subjFounder(d.company.trim(), firstWords(d.observed || d.opening)),
      sourceUrl: d.sourceUrl,
      showVisual: d.showVisual,
      media,
    });
  },
});

// ---- B. Opportunity / professional fit --------------------------------------
const opportunitySchema = z.object({
  lang: langSchema,
  contactName: optStr(120),
  company: optStr(160),
  roleNeed: optStr(200),
  why: optStr(1600),
  fit: optStr(1600),
  system: optStr(1600),
  value: optStr(1600),
  cta: optStr(600),
  sourceUrl: optStr(500),
  showVisual: z.boolean().default(true),
});

const opportunity = define({
  key: "opportunity_fit",
  label: "Oportunidad / encaje profesional",
  description:
    "Para una empresa, recruiter o equipo sobre una posición o necesidad donde tu perfil encaja. Muestra capacidad técnica y de producto, no una cover letter.",
  outboundGated: true,
  fields: [
    ...commonHead,
    { name: "roleNeed", label: "Rol, búsqueda o necesidad", type: "text", group: "common", placeholder: "AI Engineer, automatización de ops…", maxLength: 200 },
    langField,
    { name: "why", label: "Por qué escribo", type: "textarea", group: "body", rows: 3, placeholder: "El motivo concreto del contacto.", maxLength: 1600 },
    { name: "fit", label: "Por qué hay encaje", type: "textarea", group: "body", rows: 3, placeholder: "El overlap real entre lo que buscan y lo que hacés.", maxLength: 1600 },
    { name: "system", label: "Sistema/proyecto relevante", type: "textarea", group: "body", rows: 3, placeholder: "Un sistema en producción que lo prueba.", maxLength: 1600 },
    { name: "value", label: "Qué valor podría aportar", type: "textarea", group: "body", rows: 3, placeholder: "El impacto puntual que podrías generar.", maxLength: 1600 },
    { name: "cta", label: "CTA", type: "textarea", group: "body", rows: 2, placeholder: "Un próximo paso simple.", maxLength: 600 },
    { name: "sourceUrl", label: "URL de origen (opcional)", type: "url", group: "body", placeholder: "https://…" },
    visualField,
  ],
  schema: opportunitySchema,
  defaults: { lang: "es", showVisual: true },
  render: (d, media) => {
    const l = L[d.lang];
    const blocks: CompositeBlock[] = [
      { kind: "paragraph", text: d.why },
      { kind: "row", label: l.fitLabel, value: d.fit },
      { kind: "row", label: l.systemLabel, value: d.system },
      { kind: "row", label: l.valueLabel, value: d.value },
      { kind: "row", label: l.nextStep, value: d.cta },
    ];
    return assemble({
      lang: d.lang,
      accent: "#8b5cf6",
      contactName: d.contactName,
      company: d.company,
      blocks,
      ctaLabel: l.cta,
      subject: l.subjOpportunity(d.company.trim(), d.roleNeed.trim()),
      sourceUrl: d.sourceUrl,
      showVisual: d.showVisual,
      media,
    });
  },
});

// ---- C. Follow-up / continuity ----------------------------------------------
const followupSchema = z.object({
  lang: langSchema,
  contactName: optStr(120),
  company: optStr(160),
  context: optStr(1600),
  update: optStr(1600),
  nextStep: optStr(1000),
  showVisual: z.boolean().default(false),
});

const followup = define({
  key: "warm_followup",
  label: "Follow-up / continuidad",
  description:
    "Para retomar una conversación o hacer seguimiento sin sonar automático. Más liviano; la visual es opcional.",
  outboundGated: true,
  fields: [
    ...commonHead,
    langField,
    { name: "context", label: "Contexto anterior", type: "textarea", group: "body", rows: 3, placeholder: "De qué venían hablando, sin repetir todo.", maxLength: 1600 },
    { name: "update", label: "Nueva señal, avance o valor", type: "textarea", group: "body", rows: 3, placeholder: "Lo nuevo que justifica volver a escribir.", maxLength: 1600 },
    { name: "nextStep", label: "Próximo paso sugerido", type: "textarea", group: "body", rows: 2, placeholder: "Un paso claro y sin presión.", maxLength: 1000 },
    visualField,
  ],
  schema: followupSchema,
  defaults: { lang: "es", showVisual: false },
  render: (d, media) => {
    const l = L[d.lang];
    const blocks: CompositeBlock[] = [
      { kind: "paragraph", text: d.context },
      { kind: "paragraph", text: d.update },
      { kind: "row", label: l.nextStep, value: d.nextStep },
    ];
    return assemble({
      lang: d.lang,
      accent: "#00e0a4",
      contactName: d.contactName,
      company: d.company,
      blocks,
      ctaLabel: l.ctaFollow,
      subject: l.subjFollowup(d.company.trim()),
      showVisual: d.showVisual,
      media,
    });
  },
});

// ---- registry ----------------------------------------------------------------
export const COMPOSER_TEMPLATES: ComposerTemplate[] = [founder, opportunity, followup];

export const COMPOSER_BY_KEY: Record<string, ComposerTemplate> = Object.fromEntries(
  COMPOSER_TEMPLATES.map((t) => [t.key, t]),
);

export function getComposerTemplate(key: string): ComposerTemplate | undefined {
  return COMPOSER_BY_KEY[key];
}

/** Metadata safe to ship to the client (no zod/render closures). */
export type ComposerTemplateMeta = {
  key: string;
  label: string;
  description: string;
  outboundGated: boolean;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
};

export function composerCatalogue(): ComposerTemplateMeta[] {
  return COMPOSER_TEMPLATES.map(({ key, label, description, outboundGated, fields, defaults }) => ({
    key,
    label,
    description,
    outboundGated,
    fields,
    defaults,
  }));
}
