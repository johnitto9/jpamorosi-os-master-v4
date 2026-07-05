# EXEC LOG 04 — 2026-07-05 (P1: admin sube imágenes de interludios)

## Problema
El usuario no encontraba en /admin dónde subir las imágenes de las cards de los
interludios. Correcto: sólo existía "Hero video". P1 estaba speceado pero no
implementado.

## Solución (R2-ready, admin + read-side)
### Admin (subida)
- `lib/media/store.ts`: `SiteSettings` extendido con `interludes?: {before1,
  before2, proof1, living1}` (tipo `InterludeImages`).
- `app/api/admin/interludes/route.ts` (NUEVO): guardAdmin + zod; mergea keys en
  `settings.interludes` (string vacío borra, undefined no toca) → saveSiteSettings.
- `components/admin/InterludePanel.tsx` (NUEVO): 4 `MediaDropzone` (reusa el de
  ProjectForm; sube por `/api/admin/upload` → storeFile R2/local) con auto-save
  por campo a `/api/admin/interludes`. Feedback "Guardado ✓".
- `app/admin/media/page.tsx`: sección "Interlude card images" con `<InterludePanel
  initial={settings.interludes ?? {}} />` bajo el hero video.

### Read-side (que se vean en el home)
- `components/hall/Interludes.tsx`:
  - `InterludeImagesCtx` + `InterludeImagesProvider` (context, sin DOM wrapper →
    NO rompe el sticky de la coreografía GSAP).
  - `InterludeImage` ahora: lee overrides del context, **reverse-mapea su `src`
    default a la key de IMG** (así NO hubo que tocar ninguno de los ~9 callers),
    y pasa el resultado por `resolveMediaUrl` (R2/CDN). Fallback al default/emoji
    intacto.
- `app/page.tsx`: `const ilImages = (await getSiteSettings()).interludes;` y los
  3 interludios envueltos en `<InterludeImagesProvider images={ilImages}>`.

## Verificación
- tsc 0. Rebuild en curso.
- POST-rebuild manual: en /admin/media subir una imagen para "INSIDE THE PROOF"
  → /api/admin/interludes guarda → recargar home → la card muestra la imagen (ya
  no el emoji monitor). R2 real sólo cuando se seteen las envs R2_* (hoy local).

## Nota infra
R2 sigue sin configurar en la instancia viva (uploads locales). Todo el pipeline
es R2-ready: al setear R2_* + NEXT_PUBLIC_MEDIA_CDN_BASE, las mismas subidas van
al bucket y `resolveMediaUrl` las sirve del CDN, sin cambios de código.
