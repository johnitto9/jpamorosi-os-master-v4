import { describe, expect, it, vi } from "vitest";

async function loadEmailService(gate: "true" | "false" | undefined = "false") {
  vi.resetModules();
  const prev = { ...process.env };
  process.env = {
    ...prev,
    OUTBOUND_LEAD_EMAILS_ENABLED: gate,
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
  };
  const mod = await import("@/lib/email/service");
  return { mod, restore: () => { process.env = prev; } };
}

describe("outbound lead email gate", () => {
  it("blocks autonomous lead/prospect outbound by default", async () => {
    const { mod, restore } = await loadEmailService("false");
    try {
      const result = await mod.sendEmail({
        template: "prospect_outreach",
        to: "lead@example.com",
        data: {
          body: "Short pitch",
          siteUrl: "https://example.com",
        },
      });
      expect(result).toMatchObject({
        ok: false,
        skipped: true,
        error: "outbound_lead_email_disabled",
      });
    } finally {
      restore();
    }
  });

  it("does not classify admin templates as outbound lead emails", async () => {
    const { mod, restore } = await loadEmailService("false");
    try {
      expect(mod.isOutboundLeadTemplate("admin_alert")).toBe(false);
      expect(mod.isOutboundLeadTemplate("lead_followup")).toBe(true);
      expect(mod.isOutboundLeadTemplate("prospect_outreach")).toBe(true);
    } finally {
      restore();
    }
  });

  it("blocks lead followups too", async () => {
    const { mod, restore } = await loadEmailService("false");
    try {
      const result = await mod.sendEmail({
        template: "lead_followup",
        to: "lead@signalforge.ai",
        data: {
          body: "Following up from the conversation.",
          siteUrl: "https://jpamorosi.dev",
        },
      });
      expect(result.error).toBe("outbound_lead_email_disabled");
    } finally {
      restore();
    }
  });

  it("falls through to normal email config checks when the gate is enabled", async () => {
    const { mod, restore } = await loadEmailService("true");
    try {
      const result = await mod.sendEmail({
        template: "prospect_outreach",
        to: "lead@signalforge.ai",
        data: {
          body: "Short pitch",
          siteUrl: "https://jpamorosi.dev",
        },
      });
      expect(result).toMatchObject({
        ok: false,
        skipped: true,
        error: "skipped_no_api_key",
      });
    } finally {
      restore();
    }
  });
});
