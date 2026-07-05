# 03 — Prospecting real + Email tracking (R5–R6)

Base medida en `00-verified-findings.md`: el scout FUNCIONA (12 ingest/pass) pero
(1) casi nunca dispara solo y (2) los leads salen HUECOS (1/32 con email, company
null) porque no hay extracción de contacto. Referencia probada: scraper de BBN
(`BBNfinalrepo/services/scripting_v9/bbn/{scraper,downloader}.py`, Python, dos
modos: Selenium pesado + requests liviano).

---

## §A (R5.1) — Scheduling: que el scout dispare de verdad + trigger manual

### Problema
`scripts/worker.mjs`: scout sólo si `hour===SCOUT_HOUR(9)` && `dayOfYear%3===0`
&& `lastScoutDate!==hoy`, y `lastScoutDate` es RAM (se resetea al reiniciar el
worker) → ventana casi imposible.

### Fix
1. **Persistir `lastScoutDate`** (no RAM): guardarlo en la DB (tabla
   `system_state(key,value)`) o pedir al backend la última corrida (evento
   `daily-scout` en `events`). Así el gate `%3` es real y no se re-dispara por
   restart.
2. **Aflojar el gate** para arranque: en boot del worker, si no corrió "hoy" y
   estamos dentro de una ventana horaria amplia (no exactamente las 9), permitir
   una corrida. O simplemente: correr al boot si `lastScoutDate` < hoy-3d.
3. **Trigger manual desde admin** (clave para testear): botón "Run scout now" en
   `/admin/prospects` (o `/admin/pipeline`) → `POST /api/admin/scout-run`
   (guardAdmin) que internamente llama la lógica de `daily-scout`. Esto lo vuelve
   probable end-to-end a demanda (ya lo probé por token; falta el botón para Juan).

### Archivos
`scripts/worker.mjs`, nuevo `app/api/admin/scout-run/route.ts`,
`app/admin/prospects/page.tsx` o `ProspectBoard.tsx` (botón),
`lib/db/bootstrap.ts` (system_state).

---

## §B (R5.2) — Extracción real de email/empresa/contacto (el gap central)

### Problema
El scout ingesta `title/snippet/link` de serper pero NO fetchea la página ni
extrae contacto → cartas vacías, inútiles para outreach.

### Fix — portar el enfoque BBN (fetch liviano + parse), Node/TS

Nuevo módulo `lib/agent/harvest.ts`:

```ts
// harvestContact(url): fetch liviano + extracción de emails/empresa/contacto.
// Modo liviano (equivalente a BBN downloader.py): fetch con UA real + timeout.
// Escalación opcional a Playwright para páginas JS (equivalente al Selenium de
// BBN scraper.py) — fase 2, detrás de un flag (browser pesado).
const UA = "Mozilla/5.0 (compatible; AmorosiLabsBot/1.0; +https://jpamorosi.dev)";
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const JUNK = /(example\.|sentry|wixpress|\.png|\.jpg|@2x|u003e|placeholder)/i;

export async function harvestContact(url: string): Promise<{
  emails: string[]; company: string | null; contactName: string | null;
}> {
  const pages = [url, ...contactCandidates(url)]; // url, /contact, /about
  const emails = new Set<string>();
  let company: string | null = null;
  for (const p of pages.slice(0, 3)) {
    const html = await fetchText(p);            // UA + AbortSignal.timeout(12s)
    if (!html) continue;
    for (const m of html.match(EMAIL_RE) ?? []) if (!JUNK.test(m)) emails.add(m.toLowerCase());
    company ??= extractCompany(html, url);      // og:site_name / <title> / dominio
    if (emails.size) break;                     // suficiente
  }
  return { emails: [...emails].slice(0, 3), company, contactName: null };
}
```
- `contactCandidates(url)`: mismo dominio + `/contact`, `/contacto`, `/about`,
  `/nosotros` (heurística barata que multiplica hallazgos de email).
- `extractCompany`: regex sobre `<meta property="og:site_name">`, `<title>`, o
  el dominio (`acme.com` → "Acme"). Sin dep si se usa regex; con `cheerio` si ya
  está en package.json (verificar: `grep cheerio frontend-app/package.json`).
- **Escalación Playwright (fase 2)**: si el fetch liviano no rinde y la página es
  JS, `playwright` (Node) headless para render + re-extraer. Detrás de flag
  `HARVEST_BROWSER=1` (pesado, no default). Equivale al `fetch_rendered_html` de
  BBN. Documentar como opcional.

### Cablear en el pipeline
`lib/agent/prospects.ts` — en la transición `filter -> enrich` (o `enrich ->
qualify`), llamar `harvestContact(prospect.url)` y persistir
`email/company/contactName`. Sólo el mejor email. Costo acotado (1 fetch + ≤2
follow-ups por prospecto, ya hay batch cap de 8/pass).

### Verificación E2E
1. Trigger scout (botón admin o node fetch como en `00`).
2. Correr el pipeline unas pasadas (`processPipelineBatch`).
3. Query DB: `SELECT count(email) FROM prospects` debe subir de 1/32 a varios.
4. `/admin/prospects`: cartas con email/empresa reales.

### Archivos
Nuevo `lib/agent/harvest.ts`, `lib/agent/prospects.ts` (enrich usa harvest),
`frontend-app/package.json` (verificar cheerio; si no, regex-only), opcional
Playwright (fase 2).

---

## §C (R6) — Email tracking con links jpamorosi.dev (callbacks + atribución)

### Objetivo
Emails lindos de Amorosi Labs (Resend, ya existe) con **links rastreables** en el
dominio `jpamorosi.dev` (Cloudflare). Como las sesiones son loginless, el link
rastreable ata el click a una sesión/lead → sabemos si la empresa/email a la que
escribimos realmente visitó/se interesó, y queda constancia del lado admin (el
lead no queda huérfano).

### Diseño
1. **Endpoint de tracking**: `GET /api/track/[token]` (o ruta `/r/[token]`):
   - `token` firmado/opaco que codifica `{ leadId?, prospectId?, campaign, target }`
     (tabla `tracked_links(token, lead_id, prospect_id, campaign, target_url,
     created_at)` o JWT firmado con secreto).
   - Al visitar: `recordEvent("lead.link.clicked", {campaign, leadId})`, upsert
     "visited" en el lead/prospect, **setear/bindear la cookie `al_sid`** a la
     sesión conocida del lead (así su navegación loginless queda atribuida), y
     `302` redirect a `target_url` (ej. `jpamorosi.dev/?utm=...` o la sala del
     proyecto).
   - Idempotente, sin PII en la URL (sólo token).
2. **Emails** (`lib/email/service.ts`): en los templates de outreach/seguimiento,
   envolver los CTAs con `trackedUrl(leadId, campaign, target)` que genera el
   token y arma `https://jpamorosi.dev/api/track/<token>`. Reusar el estilo lindo
   existente.
3. **Secuencia por estado del lead**: follow-ups según señal (envió email / abrió
   link / creó proyecto / se interesó). El heartbeat (`app/api/cron/heartbeat`) ya
   hace follow-ups a leads tibios (opt-in `AGENT_FOLLOWUP_ENABLED`) — enganchar
   ahí la lógica de "si clickeó el link pero no volvió → segundo toque".
4. **Admin**: el dossier de sesión/lead (`/admin/sessions/[id]`, `/admin/leads`)
   muestra el timeline de clicks (evento `lead.link.clicked`) → constancia, no
   huérfano. El prospecto contactado (R5) que clickea se promueve a lead inbound
   (ya existe `POST /api/admin/leads` con `x-lead-source`).
5. **Dominio**: `jpamorosi.dev` en Cloudflare ya apunta a la app → `/api/track/*`
   sirve directo. Verificar que Cloudflare no cachee el redirect (Cache-Control:
   no-store en la respuesta).

### Loop completo (outbound → inbound, atribuido)
scout → harvest email (R5) → prospecto con email → outreach email con link
trackeado (R6) → lead clickea → `al_sid` bindeado + evento → visita/crea proyecto
→ dossier admin lo muestra → follow-up por estado. Cierra el círculo que hoy está
roto (leads huecos + sin atribución).

### Archivos
Nuevo `app/api/track/[token]/route.ts`, `lib/email/tracking.ts` (firmar/generar),
`lib/email/service.ts` (envolver CTAs), `lib/db/bootstrap.ts` (tracked_links),
`app/api/cron/heartbeat/route.ts` (secuencias), admin dossier (timeline de clicks).

### Seguridad
Token opaco/firmado (no enumerable), sin PII en URL, redirect sólo a targets
whitelisteados (mismo dominio o lista), `no-store`. Bindear `al_sid` sólo a
sesiones ya asociadas al lead (no crear identidad falsa desde un click ajeno).
