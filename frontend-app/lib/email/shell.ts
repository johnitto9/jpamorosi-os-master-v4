// lib/email/shell.ts
// -----------------------------------------------------------------------------
// Shared visual primitives for every outbound email (the Amorosi Labs identity:
// dark noir-cyber shell, cyan→violet energy bar, glass card, rounded CTA).
//
// This is the SINGLE source of the brand chrome. Both the autonomous templates
// (lib/email/templates.ts) and the human-in-the-loop composer
// (lib/email/composer/*) build on these exact functions, so an outreach email
// written by hand and one sent by the heartbeat read as the same brand.
//
// All primitives are pure string builders. Every caller-supplied value passes
// through `esc()` so user input can never inject HTML into an email.
// -----------------------------------------------------------------------------

export type RenderedEmail = { subject: string; html: string; text: string };

/** HTML-escape untrusted text before interpolating into markup. Newlines are
 *  preserved (callers pair this with `white-space:pre-line` for multiline). */
export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Branded noir-cyber shell (matches the site: dark, cyan→violet energy).
// Inline styles only, table-free flow that survives Gmail/Outlook.
export function shell(title: string, bodyHtml: string, accent = "#00e5ff"): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;color:#e8ecf1">
  <div style="max-width:560px;margin:0 auto;padding:36px 20px">
    <!-- wordmark -->
    <p style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:5px;color:${accent};text-transform:uppercase;margin:0 0 10px;font-weight:700">Amorosi&nbsp;Labs</p>
    <!-- energy bar -->
    <div style="height:3px;border-radius:99px;background:linear-gradient(90deg,#00e5ff 0%,#8b5cf6 60%,transparent 100%);margin:0 0 26px"></div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 18px;color:#ffffff">${esc(title)}</h1>
    <!-- glass card -->
    <div style="background:#10101c;border:1px solid #262640;border-radius:16px;padding:26px;font-size:14px;line-height:1.65;box-shadow:0 0 0 1px rgba(0,229,255,0.06)">
      ${bodyHtml}
    </div>
    <!-- footer -->
    <p style="font-size:11px;color:#565672;margin-top:22px;line-height:1.6">
      <span style="color:#8b5cf6">◆</span>&nbsp; Amorosi Labs · Juan Pablo Amorosi ·
      <a href="https://jpamorosi.dev" style="color:#00b8cc;text-decoration:none">jpamorosi.dev</a><br>
      <span style="color:#3d3d52">First architecture. Then marble. Then neon.</span>
    </p>
  </div></body></html>`;
}

export const button = (href: string, label: string) =>
  `<p style="margin:22px 0 8px"><a href="${esc(href)}" style="background:linear-gradient(90deg,#00e5ff,#4dc6ff);color:#00131a;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:999px;display:inline-block">${esc(label)}</a></p>`;

export const row = (k: string, v?: string) =>
  v
    ? `<p style="margin:6px 0;padding:8px 12px;background:#161628;border-left:3px solid #00e5ff;border-radius:6px"><b style="color:#9aa3b2;font-size:11px;text-transform:uppercase;letter-spacing:1px">${esc(k)}</b><br><span style="color:#e8ecf1;white-space:pre-line">${esc(v)}</span></p>`
    : "";

// visitor words, quoted — the human core of a session report
export const quote = (text?: string) =>
  text
    ? `<blockquote style="margin:14px 0;padding:12px 16px;background:#0c1420;border-left:3px solid #8b5cf6;border-radius:8px;font-style:italic;color:#c9d4e3">&ldquo;${esc(text)}&rdquo;</blockquote>`
    : "";

// compact inline chips for context signals (lang, country, device, campaign)
export const chips = (items: Array<[string, string | undefined]>) => {
  const on = items.filter((i): i is [string, string] => !!i[1]);
  if (on.length === 0) return "";
  return `<p style="margin:0 0 14px">${on
    .map(
      ([k, v]) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid #2b2b45;border-radius:999px;font-size:11px;color:#9aa3b2"><b style="color:#00d5e8">${esc(k)}</b>&nbsp;${esc(v)}</span>`,
    )
    .join("")}</p>`;
};

export const paletteBar = (colors?: string[]) =>
  colors && colors.length > 0
    ? `<p style="margin:10px 0 0">${colors
        .slice(0, 6)
        .map(
          (c) =>
            `<span style="display:inline-block;width:26px;height:14px;margin-right:4px;border-radius:4px;border:1px solid #2b2b45;background:${esc(c)}"></span>`,
        )
        .join("")}</p>`
    : "";

export const bulletList = (items?: string[], label = "Signals I reviewed") => {
  const on = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
  if (on.length === 0) return "";
  return `<div style="margin:16px 0;padding:14px 16px;background:#0c1420;border:1px solid #202f46;border-radius:10px">
    <p style="margin:0 0 8px;color:#00d5e8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700">${esc(label)}</p>
    <ul style="margin:0;padding-left:18px;color:#c9d4e3">${on
      .map((item) => `<li style="margin:6px 0">${esc(item)}</li>`)
      .join("")}</ul>
  </div>`;
};

// free-flowing message paragraph (multiline safe via pre-line)
export const paragraph = (text?: string) =>
  text && text.trim()
    ? `<p style="white-space:pre-line;margin:0 0 14px;color:#e8ecf1">${esc(text.trim())}</p>`
    : "";

/** The signed identity bubble with avatar — used verbatim by prospect_outreach
 *  and the composer so the "who is writing" moment is identical everywhere. */
export const introBubble = (d: {
  avatarUrl?: string;
  eyebrow: string;
  name: string;
  role: string;
}) =>
  `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #262640;border-radius:14px;background:#0c1420;display:flex;align-items:center;gap:14px">
      ${
        d.avatarUrl
          ? `<img src="${esc(d.avatarUrl)}" alt="${esc(d.name)}" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:50%;border:1px solid #2f3a54;object-fit:cover;flex:0 0 auto;margin-right:2px">`
          : ""
      }
      <div style="min-width:0">
        <div style="color:#00d5e8;font-size:10px;font-weight:700;line-height:1;text-transform:uppercase;letter-spacing:1.6px;margin-bottom:4px">${esc(d.eyebrow)}</div>
        <div style="color:#ffffff;font-size:14px;font-weight:700;line-height:1.25">${esc(d.name)}</div>
        <div style="color:#9aa3b2;font-size:11px;line-height:1.35">${esc(d.role)}</div>
      </div>
    </div>`;

/** Systems visual (proof), rendered right before the CTA with a caption so it
 *  reads as evidence, never decoration. */
export const proofVisual = (d: { url?: string; alt: string; caption: string }) =>
  d.url
    ? `<div style="margin:20px 0 6px">
           <img src="${esc(d.url)}" alt="${esc(d.alt)}" width="508" style="display:block;width:100%;max-width:508px;border-radius:12px;border:1px solid #262640">
           <p style="margin:8px 0 0;color:#565672;font-size:11px;text-align:center">${esc(d.caption)}</p>
         </div>`
    : "";

export const signature = (name: string, role: string) =>
  `<p style="margin:16px 0 0;color:#c9d4e3;font-size:13px;line-height:1.55">${esc(name)}<br><span style="color:#8b93a7">${esc(role)}</span></p>`;

export const replyLine = (text: string) =>
  `<p style="color:#9aa3b2;font-size:12px">${esc(text)}</p>`;

// -----------------------------------------------------------------------------
// renderComposite — ONE layout for the human composer. Categories only declare
// how their fields map to this ordered model; the visual assembly lives here so
// adding a category never means rebuilding the email shell.
// -----------------------------------------------------------------------------

export type CompositeBlock =
  | { kind: "paragraph"; text?: string }
  | { kind: "row"; label: string; value?: string }
  | { kind: "signals"; label: string; items?: string[] };

export type CompositeModel = {
  accent?: string;
  greeting: string; // shell title, e.g. "Hola, equipo de X"
  introEyebrow: string;
  introName: string;
  introRole: string;
  avatarUrl?: string;
  blocks: CompositeBlock[];
  visualUrl?: string;
  visualShown: boolean;
  visualAlt: string;
  visualCaption: string;
  ctaLabel: string;
  ctaHref: string;
  sourceUrl?: string;
  sourceLabel: string;
  signName: string;
  signRole: string;
  replyNote: string;
};

const renderBlockHtml = (b: CompositeBlock): string => {
  if (b.kind === "paragraph") return paragraph(b.text);
  if (b.kind === "row") return row(b.label, b.value?.trim() || undefined);
  return bulletList(b.items, b.label);
};

const renderBlockText = (b: CompositeBlock): string | null => {
  if (b.kind === "paragraph") return b.text?.trim() || null;
  if (b.kind === "row") return b.value?.trim() ? `${b.label}:\n${b.value.trim()}` : null;
  const items = (b.items ?? []).map((i) => i.trim()).filter(Boolean).slice(0, 4);
  return items.length ? `${b.label}:\n${items.map((i) => `- ${i}`).join("\n")}` : null;
};

export function renderComposite(model: CompositeModel): { html: string; text: string } {
  const body = [
    introBubble({
      avatarUrl: model.avatarUrl,
      eyebrow: model.introEyebrow,
      name: model.introName,
      role: model.introRole,
    }),
    ...model.blocks.map(renderBlockHtml),
    model.visualShown
      ? proofVisual({ url: model.visualUrl, alt: model.visualAlt, caption: model.visualCaption })
      : "",
    button(model.ctaHref, model.ctaLabel),
    model.sourceUrl
      ? `<p style="margin-top:14px;color:#565672;font-size:11px">${esc(model.sourceLabel)} <a href="${esc(
          model.sourceUrl,
        )}" style="color:#00b8cc;text-decoration:none">${esc(model.sourceUrl)}</a></p>`
      : "",
    signature(model.signName, model.signRole),
    replyLine(model.replyNote),
  ]
    .filter(Boolean)
    .join("\n");

  const html = shell(model.greeting, body, model.accent);

  const textBlocks = model.blocks
    .map(renderBlockText)
    .filter((s): s is string => Boolean(s));
  const text = [
    model.greeting,
    "",
    ...textBlocks,
    "",
    model.ctaHref,
    model.sourceUrl ? `\n${model.sourceLabel} ${model.sourceUrl}` : "",
    "",
    `${model.signName}`,
    model.signRole,
    "",
    model.replyNote,
  ]
    .filter((s) => s !== "" || true) // keep intentional blank lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}
