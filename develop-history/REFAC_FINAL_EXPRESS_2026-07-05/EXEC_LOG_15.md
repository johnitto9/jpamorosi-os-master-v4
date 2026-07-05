# EXEC_LOG_15 — 2026-07-05

## Objetivo
Activar y verificar Cloudflare R2 end-to-end para media productiva.

## Cambios operativos
- Docker backend no tenia `R2_*` en runtime.
- Se sincronizaron las variables `R2_*` desde el env local hacia
  `frontend-app/.env.docker.local` (archivo git-ignored, sin commit de secretos).
- Se recreo el backend para levantar las envs.

## Prueba end-to-end
Fixtures locales (no trackeadas):
- `mediatest/buenpicktestimg.png`
- `mediatest/videobuenpick.mp4`

Pasos verificados:
- Runtime ve `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
  `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` como `SET`.
- `POST /api/admin/upload` con cookie admin local:
  - imagen → `storage:"r2"`, URL publica `https://media.jpamorosi.dev/...`
  - video → `storage:"r2"`, URL publica `https://media.jpamorosi.dev/...`
- Cloudflare/CDN responde:
  - imagen: `HTTP 200`, `Content-Type: image/png`, bytes correctos.
  - video: `HTTP 200`, `Content-Type: video/mp4`, bytes correctos.
- Eventos DB:
  - `storage.r2.uploaded`
  - `media.uploaded` con `storage:"r2"`
- BuenPick actualizado via API admin:
  - `assets.heroImage` = URL R2 de la imagen.
  - `assets.heroVideo` = URL R2 del video.
- Consumo front:
  - `GET /api/projects/buenpick` devuelve ambas URLs R2.
  - `GET /projects/buenpick` contiene ambas URLs R2.
  - `GET /` contiene ambas URLs R2.

## Resultado
R2 queda activo en el backend Docker local y el flujo admin upload → R2 → DB/store
→ front publico funciona end-to-end.

## Notas
- `frontend-app/.env.docker.local` esta git-ignored: los secrets no se commitean.
- `mediatest/` queda sin trackear como fixture local.
- Warning observado: AWS SDK v3 avisa que versiones futuras requeriran Node >=22;
  el upload actual funciona en Node 20.20.2.
