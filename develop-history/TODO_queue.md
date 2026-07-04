# TODO queue — fuera de la fase actual

(Se alimenta durante cada fase; ver scheme004-toptier-roadmap.md para el plan.)

- FASE B: HECHA 2026-07-02 (hero 2.0, media wall, links, holo total).
- FASE C: HECHA 2026-07-02 (tabs + live preview). Pendiente: upload de archivos
  directo desde el form (hoy se pegan paths; /admin/media sube el hero video)
  y upload a R2 cuando se active Cloudflare.
- FASE D (HECHA 2026-07-02): postgres en compose + driver postgres + schema
  agente. Pendiente opcional: worker dedicado cuando haya jobs largos
  (CV PDF render, transcodes); redis solo si aparece cola real.
- FASE E (HECHA 2026-07-02, refinamientos pendientes): probar la vía LLM con
  OPENROUTER_API_KEY real; tool "download CV PDF" generado desde datos de la
  web (hoy abre /cv imprimible); notificación al admin ante lead calificado.
- FASE F: cohesión de fondo entre TODAS las escenas (hoy: SceneController
  crossfade — revisar seams en /projects y /preview), copy marketinero,
  Lighthouse ≥ 90.
- next.config.js: remotePatterns para el dominio CDN al activar Cloudflare.
- ProjectForm: hoy `links: {}` vacío se envía igual — al hacer Admin 2.0,
  omitir la key si no hay links para no pisar datos por accidente.
- Grabar/optimizar loops mp4 por proyecto (pipeline en
  docs/VIDEO_ASSET_PIPELINE.md) para aprovechar el video por proyecto del Hall.

## Post-FINIQUITO (2026-07-03)
- Prospects: el worker podría correr `processPipelineBatch` en un cron propio
  (hoy avanza con el scout diario o el botón "Avanzar pipeline").
- Prospects: al marcar "contactado", opcional generar borrador de email de
  outreach con el LLM (hoy da next_action + mailto).
- Docker: rebuild de la imagen del backend para que el stack compose corra el
  código nuevo (el E2E se probó con dev server local + postgres del compose).
- El dossier podría incluir los email_logs dirigidos al lead (hoy solo eventos).
