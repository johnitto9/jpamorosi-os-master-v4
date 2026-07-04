// scripts/r2-smoke-test.mjs
// -----------------------------------------------------------------------------
// Proves the Cloudflare R2 media pipe end-to-end WITHOUT touching the app:
//   1. PutObject   — write a tiny file to the bucket
//   2. HeadObject  — confirm it exists via the S3 API (write path works)
//   3. GET public  — fetch it via R2_PUBLIC_BASE_URL (custom domain + public read)
//   4. DeleteObject— clean up
//
// Reads R2_* from frontend-app/.env.local (or the ambient env). Secret values
// are never printed — only masked confirmations. Run:
//   node scripts/r2-smoke-test.mjs
// -----------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, "..", ".env.local");

// tiny .env parser (no dotenv dependency)
function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* fall back to ambient env */
  }
}
loadEnv(envPath);

const need = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("❌ Missing R2 vars:", missing.join(", "));
  process.exit(1);
}

const mask = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)` : "—");
console.log("R2 config:");
console.log("  bucket   :", process.env.R2_BUCKET_NAME);
console.log("  endpoint :", process.env.R2_ENDPOINT);
console.log("  publicURL:", process.env.R2_PUBLIC_BASE_URL ?? "(none — will use S3 path)");
console.log("  accessKey:", mask(process.env.R2_ACCESS_KEY_ID));
console.log("  secret   :", mask(process.env.R2_SECRET_ACCESS_KEY));
console.log("");

const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } =
  await import("@aws-sdk/client-s3");

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const key = `smoke/r2-test-${Date.now()}.txt`;
const body = `r2 smoke test @ ${new Date().toISOString()}`;
let failed = false;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  console.log("✅ 1/4 PutObject   — wrote", key);
} catch (e) {
  console.error("❌ 1/4 PutObject FAILED:", e.name, "-", e.message);
  process.exit(2);
}

try {
  const head = await client.send(
    new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
  );
  console.log("✅ 2/4 HeadObject  — exists, bytes:", head.ContentLength);
} catch (e) {
  console.error("❌ 2/4 HeadObject FAILED:", e.name, "-", e.message);
  failed = true;
}

if (process.env.R2_PUBLIC_BASE_URL) {
  const url = `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (res.ok && text === body) {
      console.log("✅ 3/4 Public GET  — custom domain serves the object:", url);
    } else {
      console.warn(
        `⚠️  3/4 Public GET  — ${url} returned ${res.status}. ` +
          "Object is in the bucket, but the custom domain / public access is not serving it yet " +
          "(check R2 → Settings → Public access / custom domain DNS).",
      );
      failed = true;
    }
  } catch (e) {
    console.warn("⚠️  3/4 Public GET  — fetch error:", e.message, "(DNS/custom domain not ready?)");
    failed = true;
  }
} else {
  console.log("ℹ️  3/4 Public GET  — skipped (no R2_PUBLIC_BASE_URL set)");
}

try {
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
  );
  console.log("✅ 4/4 DeleteObject— cleaned up test object");
} catch (e) {
  console.warn("⚠️  4/4 DeleteObject — could not clean up:", e.message, "(leftover:", key + ")");
}

console.log("");
console.log(failed ? "RESULT: ⚠️  write path OK, public serving needs attention (see above)"
                   : "RESULT: ✅ R2 fully working (write + S3 read + public custom-domain read)");
process.exit(failed ? 3 : 0);
