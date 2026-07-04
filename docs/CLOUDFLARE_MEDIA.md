# Cloudflare media — switch preparado (aún NO activo)

Toda imagen/video de la UI pública resuelve su URL a través de
`frontend-app/lib/media/resolve.ts`. Hoy devuelve el path local tal cual;
cuando haya credenciales de Cloudflare, se activa por env sin tocar componentes.

## Cómo activar (día del switch)

1. Subir assets a Cloudflare:
   - Imágenes → R2 (bucket detrás de dominio propio) o Cloudflare Images.
   - Videos → Cloudflare Stream (o R2 si son loops chicos ya optimizados).
2. Setear en `.env` / Vercel / docker-compose:

```bash
NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.amorosilabs.com
# opcional; si falta, los videos usan MEDIA_CDN_BASE
NEXT_PUBLIC_VIDEO_CDN_BASE=https://customer-<id>.cloudflarestream.com
```

3. Nada más: los paths relativos (`/imgs/...`, `/videos/...`) se prefijan con
   la base; las URLs absolutas guardadas en un proyecto pasan intactas (se
   puede migrar proyecto por proyecto guardando la URL completa de Cloudflare
   en el admin).

## Puntos ya cableados al resolver

- `HallOfFameCard` (heroImage, logo).
- `HallOfFameGrid` (video de sala por proyecto + fallback global).
- Campos de admin: `Room video (mp4 path)` + poster por proyecto.

## Pendiente (fases C/D)

- Upload directo a R2 desde el admin (hoy: upload local via /api/media).
- `next.config.js` → `images.remotePatterns` para el dominio CDN cuando se
  active `NEXT_PUBLIC_MEDIA_CDN_BASE` (next/image lo exige para hosts remotos).
