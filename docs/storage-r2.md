# Storage — Cloudflare R2 con fallback local

## storageService (`lib/media/storage.ts`)
Una sola vía de escritura para todo asset subido:

```
storeFile(key, buffer) -> { url, storage: "r2"|"local", key, bytes }
```

- **R2 configurado** (todas las `R2_*`): sube vía S3 API
  (`@aws-sdk/client-s3`, import dinámico) y devuelve
  `R2_PUBLIC_BASE_URL/key` (o `endpoint/bucket/key` si no hay base pública).
- **Sin configurar / R2 caído**: volumen local durable (`mediaDir()/`),
  servido por `GET /api/media/[...path]` — el error de R2 se loguea SIN
  secretos y se degrada a local (el admin nunca se bloquea).
- Eventos: `storage.r2.uploaded` / `storage.local.uploaded` / `media.uploaded`.

## Variables
```
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=            # https://<account>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=     # dominio público del bucket (r2.dev o custom)
CLOUDFLARE_ACCOUNT_ID=  # reservada (API general)
CLOUDFLARE_API_TOKEN=   # reservada
CLOUDFLARE_ZONE_ID=     # reservada
```

## Consumidores
- `POST /api/admin/upload` (drag & drop del editor) → `uploads/<ts>-<name>`.
- El resolver `lib/media/resolve.ts` + `NEXT_PUBLIC_MEDIA_CDN_BASE` siguen
  cubriendo los assets estáticos históricos (`/imgs/...`).

## Activación
1. Crear bucket R2 + token S3 (Object Read & Write) en el dash de Cloudflare.
2. Pegar las `R2_*` en el entorno (ver docs/secrets-and-deploy.md).
3. Subir algo desde el admin → la respuesta trae `storage:"r2"` y URL pública.
4. `next.config` remotePatterns: agregar el dominio público si se usan
   `<Image>` de Next sobre esas URLs.
