// scripts/worker.mjs — Kubernetes-lite sidecar (plain Node, zero deps).
//
//   1. HEALTH PROBE: pings BACKEND_URL/api/health every HEALTH_INTERVAL_S.
//      Logs one greppable line per probe; escalating warnings on consecutive
//      failures. Actual container restarts belong to Docker (healthcheck +
//      the autoheal service in docker-compose) — this probe is the observer
//      that makes the state visible in `docker compose logs worker`.
//   2. DAILY SCOUT: once per day at SCOUT_HOUR (server time) triggers
//      POST /api/cron/daily-scout with the internal bearer token.
//   3. HEARTBEAT: once per day at PULSE_HOUR the system acts on its own —
//      advances the prospect dragnet, follows up quiet warm leads (opt-in),
//      writes its self-reflection and emails the daily pulse.
//
// Env: BACKEND_URL, INTERNAL_API_TOKEN (or SERVICE_API_TOKEN),
//      HEALTH_INTERVAL_S=60, SCOUT_HOUR=9, PULSE_HOUR=20

const BACKEND = process.env.BACKEND_URL || "http://amorosi-backend:3000";
const TOKEN = process.env.INTERNAL_API_TOKEN || process.env.SERVICE_API_TOKEN || "";
const INTERVAL = Math.max(15, Number(process.env.HEALTH_INTERVAL_S || 60)) * 1000;
const SCOUT_HOUR = Number(process.env.SCOUT_HOUR ?? 9);
const PULSE_HOUR = Number(process.env.PULSE_HOUR ?? 20);

let failures = 0;
let lastScoutDate = "";
let lastPulseDate = "";

async function probe() {
  try {
    const res = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.ok) {
      if (failures >= 3) console.log(`[worker] RECOVERED after ${failures} failures`);
      failures = 0;
      console.log(`[worker] health ok · db=${body.db} · up=${body.uptimeSeconds}s`);
      return;
    }
    throw new Error(`status ${res.status}`);
  } catch (err) {
    failures += 1;
    const level = failures >= 3 ? "CRITICAL" : "warn";
    console.error(`[worker] health ${level} (${failures} consecutive): ${err.message}`);
    // Docker's healthcheck + autoheal restart the container; we just witness.
  }
}

async function maybeScout() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Run once per day, at OR AFTER SCOUT_HOUR — the old gate required the exact
  // hour AND dayOfYear%3, and lastScoutDate lives in RAM (resets on restart),
  // so in practice the scout almost never fired. ">= hour" makes a restart
  // after the hour still catch up the day's run.
  if (now.getHours() < SCOUT_HOUR || lastScoutDate === today) return;
  lastScoutDate = today;
  if (!TOKEN) {
    console.warn("[worker] scout skipped: INTERNAL_API_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(`${BACKEND}/api/cron/daily-scout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(110_000),
    });
    console.log(`[worker] daily-scout -> ${res.status} ${JSON.stringify(await res.json().catch(() => ({})))}`);
  } catch (err) {
    console.error(`[worker] daily-scout failed: ${err.message}`);
  }
}

async function maybePulse() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // the heartbeat runs EVERY day (unlike the every-3-days wide-net scout):
  // initiative is cheap — it only spends LLM/serper on what actually moved
  if (now.getHours() !== PULSE_HOUR || lastPulseDate === today) return;
  lastPulseDate = today;
  if (!TOKEN) {
    console.warn("[worker] heartbeat skipped: INTERNAL_API_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(`${BACKEND}/api/cron/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(170_000),
    });
    console.log(`[worker] heartbeat -> ${res.status} ${JSON.stringify(await res.json().catch(() => ({})))}`);
  } catch (err) {
    console.error(`[worker] heartbeat failed: ${err.message}`);
  }
}

console.log(
  `[worker] up · probing ${BACKEND} every ${INTERVAL / 1000}s · scout at ${SCOUT_HOUR}:00 · heartbeat at ${PULSE_HOUR}:00`,
);
setInterval(() => {
  void probe();
  void maybeScout();
  void maybePulse();
}, INTERVAL);
void probe();
