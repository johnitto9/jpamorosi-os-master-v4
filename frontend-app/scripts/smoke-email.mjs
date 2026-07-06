#!/usr/bin/env node

const DEFAULT_URL = "http://localhost:3001";
const DEFAULT_EMAIL = "jpamorosi14@gmail.com";

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const baseUrl = readArg("url", process.env.SMOKE_EMAIL_BASE_URL ?? DEFAULT_URL).replace(/\/$/, "");
const to = readArg("to", process.env.SMOKE_EMAIL_TO ?? DEFAULT_EMAIL);
const leadEmail = readArg("lead-email", process.env.SMOKE_LEAD_EMAIL ?? to);
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
  body: JSON.stringify({ to, leadEmail }),
});

const body = await response.json().catch(() => ({}));

console.log(
  JSON.stringify(
    {
      status: response.status,
      ok: response.ok && body.ok === true,
      sent: body.ok === true,
      skipped: body.skipped === true,
      error: body.error,
      template: body.template,
      to: body.to,
      leadEmail: body.leadEmail,
      subject: body.subject,
      htmlHasJsonArtifacts: body.htmlHasJsonArtifacts,
      textPreview: body.textPreview,
      providerId: body.providerId,
    },
    null,
    2,
  ),
);

if (!response.ok || body.ok !== true || body.htmlHasJsonArtifacts) {
  process.exit(1);
}
