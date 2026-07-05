# EXEC_LOG_16 — 2026-07-05

## Objetivo
Cerrar el consumo front de media R2. El upload ya funcionaba end-to-end, pero el
navegador bloqueaba la reproduccion/optimizacion:
- video: CSP rechazaba `https://media.jpamorosi.dev` por `media-src 'self' data: blob:`.
- imagen: `/_next/image?...media.jpamorosi.dev...` devolvia 400 porque Next Image
  no tenia el CDN en `images.remotePatterns`.

## Cambio
Archivo: `frontend-app/next.config.js`
- `media-src` ahora permite `NEXT_PUBLIC_MEDIA_CDN_BASE` o fallback
  `https://media.jpamorosi.dev`.
- `images.remotePatterns` permite `https://media.jpamorosi.dev/uploads/**`.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` -> 0 errores.
- `docker.exe compose --profile backend build amorosi-backend` -> OK.
- `docker.exe compose --profile backend up -d amorosi-backend` -> OK.
- `GET /api/health` en `:3001` -> `{"ok":true}`.
- `GET /projects/buenpick`:
  - status 200.
  - CSP incluye `media-src 'self' data: blob: https://media.jpamorosi.dev`.
  - HTML contiene `heroImage` y `heroVideo` de R2.
- `GET /_next/image?url=https%3A%2F%2Fmedia.jpamorosi.dev%2Fuploads%2F1783278858321-buenpicktestimg.png&w=828&q=75`
  -> status 200, `content-type: image/png`, bytes > 0.

## Resultado
R2 queda productivo tambien en la capa browser/Next optimizer. La imagen y el
video de BuenPick ya no dependen de excepciones locales ni de rutas `/api/media`.

## Notas
- `mediatest/` sigue sin trackear como fixture local.
- Si se cambia de CDN publico, actualizar `NEXT_PUBLIC_MEDIA_CDN_BASE` y agregar
  el hostname nuevo a `images.remotePatterns` si difiere de `media.jpamorosi.dev`.
