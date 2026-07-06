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
