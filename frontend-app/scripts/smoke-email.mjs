#!/usr/bin/env node

const DEFAULT_URL = "http://localhost:3001";
const DEFAULT_ADMIN_EMAIL = "jpamorosi14@gmail.com";
const DEFAULT_LEAD_EMAIL = "amorosijp@gmail.com";

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const baseUrl = readArg("url", process.env.SMOKE_EMAIL_BASE_URL ?? DEFAULT_URL).replace(/\/$/, "");
const to = readArg("to", process.env.SMOKE_EMAIL_TO ?? DEFAULT_ADMIN_EMAIL);
const leadEmail = readArg("lead-email", process.env.SMOKE_LEAD_EMAIL ?? DEFAULT_LEAD_EMAIL);
const mode = readArg("mode", process.env.SMOKE_EMAIL_MODE ?? "full_lead_cycle");
const token = readArg("token", process.env.INTERNAL_API_TOKEN ?? process.env.SERVICE_API_TOKEN);

if (!token) {
  console.error(
    "Missing internal token. Set INTERNAL_API_TOKEN or pass --token. The route is intentionally closed.",
  );
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/internal/email-smoke`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ to, leadEmail, mode }),
});

const body = await response.json().catch(() => ({}));

console.log(
  JSON.stringify(
    {
      status: response.status,
      ok: response.ok && body.ok === true,
      sent: body.ok === true,
      mode: body.mode,
      error: body.error,
      adminTo: body.adminTo,
      leadEmail: body.leadEmail,
      htmlHasJsonArtifacts: body.htmlHasJsonArtifacts,
      deliveries: body.deliveries,
    },
    null,
    2,
  ),
);

if (!response.ok || body.ok !== true || body.htmlHasJsonArtifacts) {
  process.exit(1);
}
