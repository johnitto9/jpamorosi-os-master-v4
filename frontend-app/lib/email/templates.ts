// lib/email/templates.ts
// -----------------------------------------------------------------------------
// Email templates, decoupled from the transport (lib/email/service.ts).
// Each template is a pure function: data in -> { subject, html, text } out.
// Minimal inline-styled dark HTML that renders fine everywhere. No secrets,
// no remote assets, no tracking pixels.
// -----------------------------------------------------------------------------

export type RenderedEmail = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Branded noir-cyber shell (matches the site: dark, cyan→violet energy).
// Inline styles only, table-free flow that survives Gmail/Outlook.
function shell(title: string, bodyHtml: string, accent = "#00e5ff"): string {
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

const button = (href: string, label: string) =>
  `<p style="margin:22px 0 8px"><a href="${esc(href)}" style="background:linear-gradient(90deg,#00e5ff,#4dc6ff);color:#00131a;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:999px;display:inline-block">${esc(label)}</a></p>`;

const row = (k: string, v?: string) =>
  v
    ? `<p style="margin:6px 0;padding:8px 12px;background:#161628;border-left:3px solid #00e5ff;border-radius:6px"><b style="color:#9aa3b2;font-size:11px;text-transform:uppercase;letter-spacing:1px">${esc(k)}</b><br><span style="color:#e8ecf1">${esc(v)}</span></p>`
    : "";

// visitor words, quoted — the human core of a session report
const quote = (text?: string) =>
  text
    ? `<blockquote style="margin:14px 0;padding:12px 16px;background:#0c1420;border-left:3px solid #8b5cf6;border-radius:8px;font-style:italic;color:#c9d4e3">&ldquo;${esc(text)}&rdquo;</blockquote>`
    : "";

// compact inline chips for context signals (lang, country, device, campaign)
const chips = (items: Array<[string, string | undefined]>) => {
  const on = items.filter((i): i is [string, string] => !!i[1]);
  if (on.length === 0) return "";
  return `<p style="margin:0 0 14px">${on
    .map(
      ([k, v]) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid #2b2b45;border-radius:999px;font-size:11px;color:#9aa3b2"><b style="color:#00d5e8">${esc(k)}</b>&nbsp;${esc(v)}</span>`,
    )
    .join("")}</p>`;
};

const paletteBar = (colors?: string[]) =>
  colors && colors.length > 0
    ? `<p style="margin:10px 0 0">${colors
        .slice(0, 6)
        .map(
          (c) =>
            `<span style="display:inline-block;width:26px;height:14px;margin-right:4px;border-radius:4px;border:1px solid #2b2b45;background:${esc(c)}"></span>`,
        )
        .join("")}</p>`
    : "";

const bulletList = (items?: string[], label = "Signals I reviewed") => {
  const on = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
  if (on.length === 0) return "";
  return `<div style="margin:16px 0;padding:14px 16px;background:#0c1420;border:1px solid #202f46;border-radius:10px">
    <p style="margin:0 0 8px;color:#00d5e8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700">${esc(label)}</p>
    <ul style="margin:0;padding-left:18px;color:#c9d4e3">${on
      .map((item) => `<li style="margin:6px 0">${esc(item)}</li>`)
      .join("")}</ul>
  </div>`;
};

// Bilingual labels for prospect_outreach — 0 tokens, pure lookup.
const OUTREACH_LANG = {
  es: {
    greeting: "Hola",
    intro: "Soy Juan",
    role: "AI Product Engineer · Amorosi Labs",
    signals: "Señales observadas",
    fitLabel: "Overlap con lo que construí",
    actionLabel: "Próximo paso",
    cta: "Ver los sistemas en producción →",
    contextLabel: "Contexto que revisé:",
    replyNote: "Respondé a este email y le llega directamente a Juan.",
    visualAlt: "Orbe — empezá un proyecto con IA dentro del CV interactivo de Juan",
    visualCaption: "Pasate por mi CV interactivo y conocé a Orbe — empecemos juntos un nuevo proyecto con IA",
  },
  en: {
    greeting: "Hi",
    intro: "I'm Juan",
    role: "AI Product Engineer · Amorosi Labs",
    signals: "Signals observed",
    fitLabel: "Overlap with what I've built",
    actionLabel: "Next step",
    cta: "See the systems in production →",
    contextLabel: "Context I reviewed:",
    replyNote: "Reply here and it lands directly with Juan.",
    visualAlt: "Orbe — start an AI project inside Juan's interactive CV",
    visualCaption: "Drop by my interactive CV and meet Orbe — let's start a new AI project together",
  },
} as const;

// ---- templates ---------------------------------------------------------------

export const templates = {
  magic_link(d: { link: string; minutes: number }): RenderedEmail {
    return {
      subject: "Your Amorosi Labs admin sign-in link",
      html: shell(
        "Admin sign-in",
        `<p>Click to sign in to the Amorosi Labs backoffice. The link expires in ${d.minutes} minutes and works once.</p>
         ${button(d.link, "Sign in →")}
         <p style="color:#9aa3b2;font-size:12px">If you didn't request this, ignore it — nothing happens without the link.</p>`,
      ),
      text: `Sign in to Amorosi Labs admin (expires in ${d.minutes} min, single use):\n${d.link}\n\nIf you didn't request this, ignore it.`,
    };
  },

  lead_received(d: {
    name?: string; email?: string; phone?: string; company?: string;
    budget?: string; need?: string; stage?: string; score?: number; sessionId?: string;
    adminUrl?: string;
  }): RenderedEmail {
    const title = `New lead${d.name ? `: ${d.name}` : ""}${d.score != null ? ` (score ${d.score})` : ""}`;
    return {
      subject: `🔥 ${title}`,
      html: shell(
        title,
        `${chips([["stage", d.stage], ["score", d.score != null ? `${d.score}/100` : undefined]])}
         ${row("Name", d.name)}${row("Email", d.email)}${row("Phone", d.phone)}
         ${row("Company", d.company)}${row("Budget", d.budget)}${row("Need", d.need)}
         ${d.adminUrl ? button(d.adminUrl, "Open full dossier →") : `<p style="margin-top:16px;color:#9aa3b2;font-size:12px">Full conversation in /admin/leads.</p>`}`,
        "#8b5cf6",
      ),
      text: `New lead\n${Object.entries(d).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
    };
  },

  contact_confirmation(d: { name?: string }): RenderedEmail {
    return {
      subject: "Got it — Juan will reach out shortly",
      html: shell(
        `Thanks${d.name ? `, ${d.name}` : ""}!`,
        `<p>Your message reached Juan Pablo Amorosi. He reads everything personally and usually replies within a day.</p>
         <p>Meanwhile, the shipped systems live at <a href="https://jpamorosi.dev" style="color:#00d5e8">jpamorosi.dev</a>.</p>`,
      ),
      text: `Thanks${d.name ? `, ${d.name}` : ""}! Your message reached Juan. He usually replies within a day.`,
    };
  },

  session_started(d: {
    sessionId: string;
    page?: string;
    firstMessage?: string;
    lang?: string;
    country?: string;
    device?: string;
    campaign?: string;
    returningLead?: string;
    adminUrl?: string;
  }): RenderedEmail {
    // subject carries the strongest signals so the inbox itself is a dashboard
    const who = d.returningLead ?? (d.country ? `visitor from ${d.country}` : "anonymous visitor");
    const subject = `💬 New conversation — ${who}${d.campaign ? ` · 📣 ${d.campaign}` : ""}`;
    return {
      subject,
      html: shell(
        d.returningLead ? `${d.returningLead} is back in the chat` : "Someone started talking to the guide",
        `${chips([
          ["lang", d.lang],
          ["country", d.country],
          ["device", d.device],
          ["campaign", d.campaign],
          ["entry", d.page],
        ])}
         ${d.firstMessage ? `<p style="margin:0;color:#9aa3b2;font-size:12px">Their opening message:</p>${quote(d.firstMessage)}` : `<p style="margin:0;color:#9aa3b2;font-size:12px">Session opened without a message yet (project setup or recovery).</p>`}
         ${row("Session", d.sessionId)}
         ${d.adminUrl ? button(d.adminUrl, "Watch it live →") : ""}
         <p style="margin-top:14px;color:#565672;font-size:11px">This dossier updates itself as the agent learns more — you'll get a separate ping when contact data lands.</p>`,
      ),
      text: `New assistant conversation (${who})${d.campaign ? ` [campaign: ${d.campaign}]` : ""}\nFirst message: ${d.firstMessage ?? "—"}\nEntry: ${d.page ?? "—"} · lang: ${d.lang ?? "—"} · country: ${d.country ?? "—"} · device: ${d.device ?? "—"}\nSession: ${d.sessionId}${d.adminUrl ? `\n${d.adminUrl}` : ""}`,
    };
  },

  project_created(d: {
    sessionId: string;
    name: string;
    kind?: string;
    concept?: string;
    stack?: string[];
    palette?: string[];
    leadName?: string;
    adminUrl?: string;
  }): RenderedEmail {
    return {
      subject: `🚀 Project foundations laid: "${d.name}"${d.leadName ? ` — by ${d.leadName}` : ""}`,
      html: shell(
        `"${d.name}" was born in the chat`,
        `<p style="margin:0 0 14px;color:#c9d4e3">A visitor just laid the foundations of a pre-project with the guide. This is the strongest intent signal the funnel produces — everything they do next orbits around it.</p>
         ${chips([["type", d.kind], ["by", d.leadName]])}
         ${row("Concept", d.concept)}
         ${row("Stack", d.stack && d.stack.length > 0 ? d.stack.join(" · ") : undefined)}
         ${paletteBar(d.palette)}
         ${d.adminUrl ? button(d.adminUrl, "Open the dossier →") : ""}`,
        "#00e0a4",
      ),
      text: `Project foundations created: "${d.name}" (${d.kind ?? "app"})${d.leadName ? ` by ${d.leadName}` : ""}\nConcept: ${d.concept ?? "—"}\nStack: ${d.stack?.join(", ") ?? "—"}\nSession: ${d.sessionId}${d.adminUrl ? `\n${d.adminUrl}` : ""}`,
    };
  },

  mockup_generated(d: {
    sessionId: string;
    project?: string;
    description?: string;
    imageUrl?: string;
    adminUrl?: string;
  }): RenderedEmail {
    return {
      subject: `🎨 Visual concept generated${d.project ? ` for "${d.project}"` : ""}`,
      html: shell(
        `Branding moment${d.project ? `: "${d.project}"` : ""}`,
        `<p style="margin:0 0 14px;color:#c9d4e3">The guide rendered a visual concept for a visitor's project — they're investing in the identity, which usually means the idea is getting real for them.</p>
         ${row("Project", d.project)}
         ${row("Brief", d.description)}
         ${d.imageUrl ? `<p style="margin:14px 0 0"><a href="${esc(d.imageUrl)}" style="color:#00d5e8">View the generated concept →</a></p>` : ""}
         ${d.adminUrl ? button(d.adminUrl, "Open the dossier →") : ""}`,
        "#8b5cf6",
      ),
      text: `Visual concept generated${d.project ? ` for "${d.project}"` : ""}\nBrief: ${d.description ?? "—"}\nImage: ${d.imageUrl ?? "—"}\nSession: ${d.sessionId}${d.adminUrl ? `\n${d.adminUrl}` : ""}`,
    };
  },

  project_followup(d: { project: string; summary?: string; email?: string }): RenderedEmail {
    return {
      subject: `Follow-up: ${d.project}`,
      html: shell(
        `About ${d.project}`,
        `<p>${esc(d.summary ?? `Following up on ${d.project} — here's the room with the full story.`)}</p>
         ${button(`https://jpamorosi.dev/projects/${encodeURIComponent(d.project)}`, "Open the project room →")}`,
      ),
      text: `${d.summary ?? `Following up on ${d.project}.`}\nhttps://jpamorosi.dev/projects/${d.project}`,
    };
  },

  session_recovery(d: { link: string; days: number }): RenderedEmail {
    return {
      subject: "Recover your Amorosi Labs session",
      html: shell(
        "Pick up where you left off",
        `<p>This link restores your conversation with Orbe, Juan's lab intelligence — everything you discussed, your project brief and preferences — on ANY device. Valid for ${d.days} days, single use.</p>
         ${button(d.link, "Restore my session →")}
         <p style="color:#9aa3b2;font-size:12px">Didn't request this? Ignore it — nothing happens without the link.</p>`,
      ),
      text: `Restore your Amorosi Labs session (valid ${d.days} days, single use):\n${d.link}`,
    };
  },

  admin_alert(d: { title: string; detail?: string }): RenderedEmail {
    return {
      subject: `⚠ ${d.title}`,
      html: shell(d.title, `<p>${esc(d.detail ?? "")}</p>`, "#f0a500"),
      text: `${d.title}\n${d.detail ?? ""}`,
    };
  },

  scout_digest(d: {
    date: string;
    queries: string[];
    ingested: number;
    advanced: number;
    total: number;
    rawIngest: number;
    withEmail: number;
    readyToContact: number;
    highScore: number;
    summary?: string;
    top?: Array<{
      company?: string | null;
      title?: string | null;
      email?: string | null;
      url?: string | null;
      score?: number;
      fitReason?: string | null;
      nextAction?: string | null;
    }>;
    adminUrl: string;
    exportUrl: string;
  }): RenderedEmail {
    const stat = (label: string, value: number | string, color = "#ffffff") =>
      `<td style="padding:9px 10px;text-align:center;border:1px solid #262640;border-radius:10px">
        <div style="font-size:21px;font-weight:800;color:${color}">${esc(String(value))}</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#9aa3b2">${esc(label)}</div>
      </td>`;
    const top = (d.top ?? []).slice(0, 5);
    return {
      subject: `🛰 Scout ${d.date} — +${d.ingested} captured · ${d.readyToContact} ready · ${d.withEmail} emails`,
      html: shell(
        `Scout diario ${d.date}`,
        `<p style="margin:0 0 14px;color:#c9d4e3">El radar corrió discovery amplio, avanzó el pipeline y dejó el bruto como archivo. Las cards del admin muestran solo señales únicas que avanzaron o califican.</p>
         <table style="width:100%;border-collapse:separate;border-spacing:6px;margin:0 0 16px"><tr>
           ${stat("captured", d.ingested, "#00e5ff")}
           ${stat("advanced", d.advanced, "#8b5cf6")}
           ${stat("ready", d.readyToContact, "#34d399")}
         </tr><tr>
           ${stat("total", d.total)}
           ${stat("raw bag", d.rawIngest, "#f0a500")}
           ${stat("emails", d.withEmail, "#00e0a4")}
         </tr></table>
         ${chips(d.queries.map((q, i) => [`query ${i + 1}`, q]))}
         ${d.summary ? `<p style="margin:0 0 4px;color:#9aa3b2;font-size:12px">Lectura del scout:</p>${quote(d.summary)}` : ""}
         ${top.length > 0 ? `<div style="margin:16px 0 0">
           <p style="margin:0 0 8px;color:#9aa3b2;font-size:12px;text-transform:uppercase;letter-spacing:1px">Top señales</p>
           ${top.map((p) => `
             <div style="margin:8px 0;padding:12px;border:1px solid #262640;border-radius:12px;background:#0c1420">
               <p style="margin:0;color:#fff;font-weight:700">${esc(p.company || p.title || "Prospect")}${p.score != null ? ` <span style="color:#00e5ff;font-size:12px">score ${p.score}</span>` : ""}</p>
               ${p.company && p.title ? `<p style="margin:3px 0 0;color:#9aa3b2;font-size:12px">${esc(p.title)}</p>` : ""}
               ${p.fitReason ? `<p style="margin:8px 0 0;color:#c9d4e3;font-size:12px">${esc(p.fitReason)}</p>` : ""}
               ${p.nextAction ? `<p style="margin:8px 0 0;color:#b7f7d4;font-size:12px">→ ${esc(p.nextAction)}</p>` : ""}
               ${p.email ? `<p style="margin:6px 0 0;color:#00e5ff;font-size:12px">${esc(p.email)}</p>` : ""}
               ${p.url ? `<p style="margin:6px 0 0"><a href="${esc(p.url)}" style="color:#00b8cc;text-decoration:none;font-size:12px">${esc(p.url)}</a></p>` : ""}
             </div>
           `).join("")}
         </div>` : ""}
         ${button(d.adminUrl, "Open prospect board →")}
         <p style="margin:10px 0 0"><a href="${esc(d.exportUrl)}" style="color:#00b8cc;text-decoration:none">Download JSONL snapshot →</a></p>`,
        "#00e5ff",
      ),
      text: `Scout ${d.date}
Captured: ${d.ingested} · advanced: ${d.advanced} · ready: ${d.readyToContact} · emails: ${d.withEmail}
Queries: ${d.queries.join(" | ")}
${d.summary ? `\nSummary:\n${d.summary}\n` : ""}
Top:
${top.map((p, i) => `${i + 1}. ${p.company || p.title || "Prospect"}${p.score != null ? ` (${p.score})` : ""}${p.email ? ` · ${p.email}` : ""}${p.url ? ` · ${p.url}` : ""}\n${p.fitReason ?? ""}\n${p.nextAction ? `→ ${p.nextAction}` : ""}`).join("\n\n")}

Board: ${d.adminUrl}
Snapshot: ${d.exportUrl}`,
    };
  },

  // the heartbeat's warm outreach: the system follows up with a lead that
  // went quiet, using words the LLM wrote from THEIR actual conversation
  lead_followup(d: {
    name?: string;
    body: string;
    projectName?: string;
    siteUrl: string;
  }): RenderedEmail {
    return {
      subject: d.projectName
        ? `Your project "${d.projectName}" is still on the table`
        : "Picking up where we left off",
      html: shell(
        `Hi${d.name ? `, ${d.name}` : ""} 👋`,
        `<p style="white-space:pre-line">${esc(d.body)}</p>
         ${button(d.siteUrl, "Continue the conversation →")}
         <p style="color:#9aa3b2;font-size:12px">Reply to this email and it lands directly with Juan.</p>`,
      ),
      text: `Hi${d.name ? ` ${d.name}` : ""},\n\n${d.body}\n\n${d.siteUrl}\n\nReply to this email and it lands directly with Juan.`,
    };
  },

  prospect_outreach(d: {
    company?: string;
    contactName?: string;
    subjectSignal?: string;
    subjectReason?: string;
    body: string;
    siteUrl: string;
    sourceUrl?: string;
    signals?: string[];
    fitReason?: string;
    nextAction?: string;
    visualUrl?: string;
    lang?: "es" | "en";
    avatarUrl?: string;
    seed?: number;
  }): RenderedEmail {
    const lang = d.lang ?? "es";
    const L = OUTREACH_LANG[lang];
    const evidence = bulletList(d.signals, L.signals);
    const fit = d.fitReason ? row(L.fitLabel, d.fitReason) : "";
    const action = d.nextAction ? row(L.actionLabel, d.nextAction) : "";
    const fallbackSignal = d.company
      ? lang === "en" ? `Operational signals at ${d.company}` : `Señales operativas en ${d.company}`
      : lang === "en" ? "Operational signals" : "Señales operativas";
    const fallbackReason = lang === "en"
      ? "a focused AI system may fit"
      : "un sistema de IA enfocado puede encajar";
    const subject = `${d.subjectSignal ?? fallbackSignal} — ${d.subjectReason ?? fallbackReason}`;
    const greetingTarget =
      d.contactName ??
      (d.company ? (lang === "en" ? `${d.company} team` : `equipo de ${d.company}`) : undefined);
    const introBubble = `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #262640;border-radius:14px;background:#0c1420;display:flex;align-items:center;gap:14px">
      ${
        d.avatarUrl
          ? `<img src="${esc(d.avatarUrl)}" alt="Juan Pablo Amorosi" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:50%;border:1px solid #2f3a54;object-fit:cover;flex:0 0 auto;margin-right:2px">`
          : ""
      }
      <div style="min-width:0">
        <div style="color:#00d5e8;font-size:10px;font-weight:700;line-height:1;text-transform:uppercase;letter-spacing:1.6px;margin-bottom:4px">${esc(L.intro)}</div>
        <div style="color:#ffffff;font-size:14px;font-weight:700;line-height:1.25">Juan Pablo Amorosi</div>
        <div style="color:#9aa3b2;font-size:11px;line-height:1.35">${esc(L.role)}</div>
      </div>
    </div>`;

    // Systems visual as proof, right before the CTA, with a caption so it has a
    // clear purpose instead of feeling like decoration.
    const visual = d.visualUrl
      ? `<div style="margin:20px 0 6px">
           <img src="${esc(d.visualUrl)}" alt="${esc(L.visualAlt)}" width="508" style="display:block;width:100%;max-width:508px;border-radius:12px;border:1px solid #262640">
           <p style="margin:8px 0 0;color:#565672;font-size:11px;text-align:center">${esc(L.visualCaption)}</p>
         </div>`
      : "";

    return {
      subject,
      html: shell(
        `${L.greeting}${greetingTarget ? `, ${greetingTarget}` : ""}`,
        `${introBubble}
         <p style="white-space:pre-line;margin-top:0">${esc(d.body)}</p>
         ${evidence}${fit}${action}
         ${visual}
         ${button(d.siteUrl, L.cta)}
         ${d.sourceUrl ? `<p style="margin-top:14px;color:#565672;font-size:11px">${esc(L.contextLabel)} <a href="${esc(d.sourceUrl)}" style="color:#00b8cc;text-decoration:none">${esc(d.sourceUrl)}</a></p>` : ""}
         <p style="margin:16px 0 0;color:#c9d4e3;font-size:13px;line-height:1.55">Juan Pablo Amorosi<br><span style="color:#8b93a7">AI Product Engineer · Amorosi Labs</span></p>
         <p style="color:#9aa3b2;font-size:12px">${esc(L.replyNote)}</p>`,
      ),
      text: `${L.greeting}${greetingTarget ? ` ${greetingTarget}` : ""},\n\n${d.body}${
        d.signals?.length ? `\n\n${L.signals}:\n${d.signals.slice(0, 4).map((s) => `- ${s}`).join("\n")}` : ""
      }${d.fitReason ? `\n\n${L.fitLabel}:\n${d.fitReason}` : ""}${d.nextAction ? `\n\n${L.actionLabel}:\n${d.nextAction}` : ""}\n\n${d.siteUrl}${d.sourceUrl ? `\n\n${L.contextLabel} ${d.sourceUrl}` : ""}\n\n${L.replyNote}`,
    };
  },

  // the system's daily self-report: what it did ON ITS OWN in the last cycle
  daily_pulse(d: {
    date: string;
    sessions: number;
    leads: number;
    followupsSent: number;
    prospectsMoved: number;
    prospectsReady: number;
    aiCalls: number;
    aiOkRate?: number;
    reflection?: string;
    adminUrl: string;
  }): RenderedEmail {
    const stat = (label: string, v: string | number) =>
      `<td style="padding:10px 14px;text-align:center"><div style="font-size:22px;font-weight:700;color:#ffffff">${esc(String(v))}</div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9aa3b2">${esc(label)}</div></td>`;
    return {
      subject: `🫀 Pulse ${d.date} — ${d.sessions} sessions · ${d.leads} leads · ${d.prospectsMoved} prospects moved`,
      html: shell(
        "While you were living, the system worked",
        `<table style="width:100%;border-collapse:collapse;margin:0 0 16px"><tr>
           ${stat("sessions", d.sessions)}${stat("leads", d.leads)}${stat("follow-ups", d.followupsSent)}
         </tr><tr>
           ${stat("prospects moved", d.prospectsMoved)}${stat("ready to contact", d.prospectsReady)}${stat("AI calls", d.aiOkRate != null ? `${d.aiCalls} (${d.aiOkRate}% ok)` : d.aiCalls)}
         </tr></table>
         ${d.reflection ? `<p style="margin:0 0 4px;color:#9aa3b2;font-size:12px">The system's own reflection on the day:</p>${quote(d.reflection)}` : ""}
         ${button(d.adminUrl, "Open the backoffice →")}`,
        "#00e0a4",
      ),
      text: `Daily pulse ${d.date}\nSessions: ${d.sessions} · Leads: ${d.leads} · Follow-ups sent: ${d.followupsSent}\nProspects moved: ${d.prospectsMoved} · Ready to contact: ${d.prospectsReady} · AI calls: ${d.aiCalls}${d.aiOkRate != null ? ` (${d.aiOkRate}% ok)` : ""}\n${d.reflection ? `\nReflection:\n${d.reflection}\n` : ""}\n${d.adminUrl}`,
    };
  },
} as const;

export type TemplateName = keyof typeof templates;
