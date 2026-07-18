import { afterEach, describe, expect, it, vi } from "vitest";
import { harvestContact, harvestContactFromUrls } from "@/lib/agent/prospects";

function htmlResponse(html: string, ok = true) {
  return {
    ok,
    text: async () => html,
  } as Response;
}

describe("prospect contact harvesting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses email already found in enrichment text without requiring a URL", async () => {
    await expect(harvestContact(null, "Reach us at founders@signalforge.ai")).resolves.toEqual({
      email: "founders@signalforge.ai",
      company: null,
    });
  });

  it("rejects placeholder/example emails as junk", async () => {
    await expect(harvestContact(null, "Reach us at hello@example.com")).resolves.toEqual({
      email: null,
      company: null,
    });
  });

  it("rejects LLM-hallucinated placeholder localparts even on a real-looking domain", async () => {
    await expect(harvestContact(null, "Contact john.doe@acmecorp.com")).resolves.toEqual({
      email: null,
      company: null,
    });
    await expect(harvestContact(null, "Write to you@realcompany.io")).resolves.toEqual({
      email: null,
      company: null,
    });
    // bare template localparts (first@, name@) leaked once in prod (first@fullstack.ca)
    await expect(harvestContact(null, "Reach first@fullstack.ca")).resolves.toEqual({
      email: null,
      company: null,
    });
  });

  it("prefers a named person over a generic inbox and skips dead-end roles", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      htmlResponse(`
        <html><head><meta property="og:site_name" content="Boutique AI" /></head>
        <body>
          <a href="mailto:support@boutiqueai.dev">support</a>
          <a href="mailto:info@boutiqueai.dev">general</a>
          <a href="mailto:maria.paz@boutiqueai.dev">Maria</a>
        </body></html>
      `),
    ));
    await expect(harvestContact("https://boutiqueai.dev/jobs", null)).resolves.toEqual({
      email: "maria.paz@boutiqueai.dev",
      company: "Boutique AI",
    });
  });

  it("falls back to a generic inbox when no person is exposed, never a dead-end", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      htmlResponse(`<body>
        <a href="mailto:sales@smallco.io">sales</a>
        <a href="mailto:hola@smallco.io">hola</a>
      </body>`),
    ));
    await expect(harvestContact("https://smallco.io/contacto", null)).resolves.toMatchObject({
      email: "hola@smallco.io",
    });
  });

  it("finds mailto contact and company from the original page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      htmlResponse(`
        <html>
          <head><meta property="og:site_name" content="SignalForge AI" /></head>
          <body><a href="mailto:hiring@signalforge.ai">contact</a></body>
        </html>
      `),
    ));
    await expect(harvestContact("https://signalforge.ai/jobs", null)).resolves.toEqual({
      email: "hiring@signalforge.ai",
      company: "SignalForge AI",
    });
  });

  it("falls through to /contact when the listing has no email", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/jobs")) return htmlResponse("<title>Hiring</title><p>No email here</p>");
      if (u.endsWith("/contact")) return htmlResponse("<title>Acme Labs</title><p>ops@acmelabs.dev</p>");
      return htmlResponse("", false);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(harvestContact("https://acmelabs.dev/jobs", null)).resolves.toEqual({
      email: "ops@acmelabs.dev",
      company: "Hiring",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("harvests from premium Serper URLs when the original listing is hollow", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("job-board.dev")) return htmlResponse("<title>Job Board</title><p>No direct email</p>");
      if (u === "https://signalforge.ai/contact") {
        return htmlResponse(`
          <html>
            <head><meta property="og:site_name" content="SignalForge" /></head>
            <body><a href="mailto:founders@signalforge.ai">Founders</a></body>
          </html>
        `);
      }
      return htmlResponse("", false);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      harvestContactFromUrls(
        ["https://job-board.dev/signalforge", "https://signalforge.ai/contact"],
        "premium enrichment found official contact page",
      ),
    ).resolves.toEqual({
      email: "founders@signalforge.ai",
      company: "Job Board",
      sourceUrl: "https://signalforge.ai/contact",
    });
  });
});
