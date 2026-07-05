# 00 — Hallazgos VERIFICADOS en vivo (2026-07-05)

Todo lo de acá está MEDIDO contra la instancia viva `:3001` o leído del código.
No re-investigar; usar como base de verdad.

## Infra / env (dentro del contenedor amorosi-backend)

```
WEB_SEARCH_API_KEY (serper) : SET ✓
OPENROUTER_API_KEY          : SET ✓
RESEND_API_KEY              : SET ✓
INTERNAL_API_TOKEN          : SET ✓
R2_ACCESS_KEY_ID            : VACÍO ✗  -> storeFile cae a local
NEXT_PUBLIC_MEDIA_CDN_BASE  : VACÍO ✗  -> imágenes se sirven local
worker container            : UP (up ~3h)
```

Implicación: el código R2/CDN está listo (`storeFile`, `resolveMediaUrl`), pero
la instancia NO usa R2 todavía. Todo "subir a R2" funciona local hoy; se vuelve
R2 al setear las envs `R2_*` + `NEXT_PUBLIC_MEDIA_CDN_BASE`. No requiere re-código.

## Prospecting (dragnet) — PROBADO E2E

Disparé `POST /api/cron/daily-scout` a mano (con INTERNAL_API_TOKEN, vía node
fetch dentro del contenedor porque NO hay curl):

```
scout status: 200
{ ok:true, queries:[...], prospects:{ ingested:12, advanced:8 } }
```

**La maquinaria FUNCIONA cuando se dispara.** Pero query a la DB `prospects`:

```
BY STAGE: contact n=5 (email=1) · discarded n=16 · filter n=7 · ingest n=4
TOTALS  : total=32, with_email=1
SAMPLE  : company=null, email=null en casi todos
```

**Dos problemas REALES (root cause):**
1. **Nunca dispara solo.** `scripts/worker.mjs`: el scout corre sólo si
   `hour === SCOUT_HOUR(9)` **Y** `dayOfYear % 3 === 0` **Y** `lastScoutDate !==
   hoy`. Y `lastScoutDate` es memoria en RAM → se resetea en cada restart del
   worker (restartó hace 3h). Ventana tan angosta que en la práctica no corrió.
2. **Los leads salen HUECOS.** El scout ingesta hits de serper (title/snippet/
   link) pero **NUNCA fetchea la página ni extrae email/empresa/contacto**. Los
   SERP de serper no traen emails. 1 de 32 con email (ese vino de un email_drop
   manual, no del scout). Sin extracción, el embudo avanza cartas vacías.

## Referencia BBN (repo `BBNfinalrepo/`, ya en .gitignore)

Scraper PROBADO de BahiaBlancaNoticias, en **Python**, dos modos:
- **Pesado**: `services/scripting_v9/bbn/scraper.py` — Selenium headless Chrome
  (`fetch_rendered_html`), para páginas con JS. Docker-aware (CHROME_BIN/
  CHROMEDRIVER_PATH). BeautifulSoup + selectores CSS para extraer.
- **Liviano**: `bbn/downloader.py` — `requests` con timeout/stream + detección
  de content-type + parse. Rápido, sin browser.
- **R2**: `services/content-engine/r2_uploader.py` — sube a R2 (referencia de
  cómo lo hacen ellos; nosotros ya tenemos `storeFile`).

Nuestro stack es Node/TS → **portar el enfoque, no el código**: `fetch` liviano
+ parse (cheerio/regex) para emails/empresa; Playwright (Node) como escalación
opcional para páginas JS (equivalente al Selenium de BBN). Ver `03` §B.

## Chat / orquestador (código)

- `lib/agent/orchestrator.ts`: carga `ctx.projects = listSessionProjects(sid)` →
  **omni YA ve todos los proyectos de la sesión** (son por-sesión, no por-tab).
  El gap es de PROMPT (no los hilvana), no de datos.
- `leadPatchSchema` (`lib/agent/leads.ts`): ya captura
  `name, email, phone, company, budget, need, notes`. La captura EXISTE; falta
  accionarla en la UI (cards de email/permanencia) y en el prompt (insistencia).
- Tools whitelist ya incluye: `web_search`, `generate_mockup`, `update_project`,
  `confirm_palette`, `set_brand_dna`, `propose_decisions`, `open_github`.
  Para R4 hay que sumar un tool de "card interactiva" genérica.

## Z-index del chat (para no romper el canon inline)

- panel chat `z-[121]`, backdrop `z-[119]`, launcher `z-[122]`.
- `InlineCanon` vive DENTRO del panel (entre transcript y composer). El viejo
  `AssetVault` flotante (`z-[115]`, quedaba detrás) fue desmontado (archivo
  queda como backup).

## SiteSettings store (para interludios)

- `lib/media/store.ts`: `getSiteSettings()/saveSiteSettings()` sobre
  `data/settings.json` (volumen durable). Hoy sólo `{ heroVideo }`. Extensible.
- `app/admin/media/page.tsx` EXISTE pero sólo maneja el hero video (por eso el
  usuario "no vio nada" de interludios). Ahí van los uploaders nuevos.
- Interludios: `components/hall/Interludes.tsx` `IMG` const con paths
  hardcodeados; `InterludeImage` hace `<img src>` directo (sin `resolveMediaUrl`)
  y cae a emoji en `onError`. `app/page.tsx` pasa `t` (copy) a los interludios.
