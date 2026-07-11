// tests/outreach_studio.spec.ts — the human-in-the-loop Outreach Studio.
// Covers the pure surfaces: renderers, escaping, validation, preview/send
// parity, subject override, recipient guards, and the outbound classification.
import { describe, expect, it } from "vitest";
import { composeEmail } from "@/lib/email/composer/compose";
import {
  COMPOSER_TEMPLATES,
  getComposerTemplate,
  composerCatalogue,
} from "@/lib/email/composer/registry";
import { isNoreplyAddress } from "@/lib/email/service";

const MEDIA = { avatarUrl: "https://jpamorosi.dev/imgs/img-profile-jpa.jpg", visualUrl: "https://jpamorosi.dev/og.jpg" };

const founderData = {
  lang: "es",
  contactName: "Ana",
  company: "Northstar",
  title: "Founder",
  opening: "Escribo directo, sin vueltas.",
  observed: "Vi que lanzaron un onboarding manual para operaciones.",
  reading: "Eso suele significar horas perdidas en clasificación.",
  proposal: "Un agente chico que ordene el intake.",
  proof: "Ya shippeé un sistema de scoring en producción.",
  cta: "Respondé con un flujo y te devuelvo algo medible.",
  sourceUrl: "https://northstar.example/careers",
  showVisual: true,
};

describe("composer renderers", () => {
  it("every template produces subject, html and text", () => {
    for (const tpl of COMPOSER_TEMPLATES) {
      const res = composeEmail({ template: tpl.key, data: tpl.defaults, media: MEDIA });
      expect(res.ok).toBe(true);
      if (!res.ok) continue;
      expect(res.rendered.subject.length).toBeGreaterThan(0);
      expect(res.rendered.html).toContain("Amorosi");
      expect(res.rendered.html.startsWith("<!doctype html>")).toBe(true);
      expect(typeof res.rendered.text).toBe("string");
      expect(res.rendered.text.length).toBeGreaterThan(0);
    }
  });

  it("renders founder content into the html and text", () => {
    const res = composeEmail({ template: "founder_direct", data: founderData, media: MEDIA });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rendered.html).toContain("onboarding manual");
    expect(res.rendered.html).toContain("Ana");
    expect(res.rendered.text).toContain("onboarding manual");
    // proof visual present when showVisual + visualUrl
    expect(res.rendered.html).toContain(MEDIA.visualUrl);
    expect(res.rendered.html).toContain(MEDIA.avatarUrl);
  });

  it("hides the secondary visual when showVisual is false", () => {
    const res = composeEmail({
      template: "warm_followup",
      data: { lang: "es", contactName: "Ana", context: "Veníamos hablando de agentes.", update: "Terminé el prototipo.", nextStep: "¿Lo vemos el jueves?", showVisual: false },
      media: MEDIA,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rendered.html).not.toContain(MEDIA.visualUrl);
  });
});

describe("escaping / html injection", () => {
  it("never lets user content inject raw markup", () => {
    const res = composeEmail({
      template: "founder_direct",
      data: {
        ...founderData,
        observed: `<script>alert('xss')</script>`,
        company: `Acme"><img src=x onerror=alert(1)>`,
        opening: `Line1\nLine2 & <b>bold</b>`,
      },
      media: MEDIA,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rendered.html).not.toContain("<script>alert");
    expect(res.rendered.html).toContain("&lt;script&gt;");
    expect(res.rendered.html).not.toContain("onerror=alert(1)>");
    expect(res.rendered.html).toContain("&amp;");
  });
});

describe("validation", () => {
  it("rejects an unknown template", () => {
    const res = composeEmail({ template: "does_not_exist", data: {}, media: MEDIA });
    expect(res).toMatchObject({ ok: false, error: "unknown_template" });
  });

  it("rejects invalid data types", () => {
    const res = composeEmail({ template: "founder_direct", data: { company: 123 }, media: MEDIA });
    expect(res).toMatchObject({ ok: false, error: "invalid_data" });
  });

  it("warns when the body is essentially empty", () => {
    const res = composeEmail({ template: "founder_direct", data: { lang: "es" }, media: MEDIA });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.warnings.some((w) => w.toLowerCase().includes("vacío"))).toBe(true);
  });
});

describe("subject override", () => {
  it("uses the generated subject when the override is empty", () => {
    const res = composeEmail({ template: "founder_direct", data: founderData, media: MEDIA, subjectOverride: "  " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rendered.subject).toContain("Northstar");
  });

  it("respects a non-empty override verbatim", () => {
    const res = composeEmail({ template: "founder_direct", data: founderData, media: MEDIA, subjectOverride: "Custom subject" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rendered.subject).toBe("Custom subject");
  });
});

describe("preview / send parity", () => {
  it("identical inputs yield byte-identical subject, html and text (pure, no side effects)", () => {
    const input = { template: "opportunity_fit", data: { lang: "en", contactName: "Sam", company: "Globex", roleNeed: "AI Engineer", why: "You posted a role.", fit: "Direct overlap.", system: "A production agent.", value: "Ship faster.", cta: "15 min?", showVisual: true }, media: MEDIA, subjectOverride: "" };
    const a = composeEmail(input);
    const b = composeEmail(input);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.rendered.subject).toBe(b.rendered.subject);
    expect(a.rendered.html).toBe(b.rendered.html);
    expect(a.rendered.text).toBe(b.rendered.text);
  });
});

describe("recipient guards", () => {
  it("flags noreply / unattended mailboxes", () => {
    for (const addr of ["noreply@acme.com", "no-reply@acme.com", "do-not-reply@x.io", "donotreply@x.io", "postmaster@x.io"]) {
      expect(isNoreplyAddress(addr)).toBe(true);
    }
  });
  it("allows real human addresses", () => {
    for (const addr of ["ana@northstar.com", "sam.jones@globex.io", "founder@startup.ai"]) {
      expect(isNoreplyAddress(addr)).toBe(false);
    }
  });
});

describe("outbound classification & catalogue", () => {
  it("every composer category is outbound-gated (customer-facing)", () => {
    for (const tpl of COMPOSER_TEMPLATES) expect(tpl.outboundGated).toBe(true);
  });
  it("exposes exactly the three initial categories with fields", () => {
    const cat = composerCatalogue();
    expect(cat.map((c) => c.key).sort()).toEqual(["founder_direct", "opportunity_fit", "warm_followup"]);
    for (const c of cat) {
      expect(c.fields.some((f) => f.name === "email")).toBe(true);
      expect(c.fields.length).toBeGreaterThan(3);
    }
  });
  it("getComposerTemplate resolves known keys and rejects unknown", () => {
    expect(getComposerTemplate("founder_direct")?.key).toBe("founder_direct");
    expect(getComposerTemplate("nope")).toBeUndefined();
  });
});
