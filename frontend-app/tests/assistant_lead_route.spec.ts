import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/assistant/lead/route";

function req(body: unknown) {
  return new Request("http://localhost/api/assistant/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/assistant/lead", () => {
  it("rejects unknown fields before touching persistence", async () => {
    const res = await POST(req({ unknown: "x" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_body" });
  });

  it("rejects empty lead captures", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ error: "empty_lead" });
  });
});
