# Change Log: 2026-07-01 — FASE A: Top-tier UX core

## 1. Objetivo
Primera fase del roadmap top-tier (scheme004): cards holográficas
image-dominant en toda la home, video de sala por proyecto en el Hall of Fame,
transición de sección más cinematográfica, partículas mejoradas, form de
contacto real en la home y el seam de media preparado para Cloudflare.

## 2. Revisión previa
- Cards del Hall/Featured eran GlowCard con imagen chica arriba y mucho texto.
- El video de fondo del Hall era único (settings.heroVideo), no cambiaba con el
  proyecto seleccionado.
- SectionTransition ya hacía un fold 3D scroll-linked, pero plano de luz.
- La home no tenía form de contacto (solo mailto); el form real vivía en /os
  (Formspree xanbvlqw).
- No existía seam de CDN: los componentes usaban paths locales directo.

## 3. Cambios aplicados (paths bajo frontend-app/)
- `lib/media/resolve.ts` (NUEVO): resolveMediaUrl/resolveVideoUrl. Cloudflare
  R2/Stream por `NEXT_PUBLIC_MEDIA_CDN_BASE` / `NEXT_PUBLIC_VIDEO_CDN_BASE`;
  hoy passthrough local; URLs absolutas pasan intactas.
- `content/projects.ts`: ProjectAssets += `heroVideo`, `heroVideoPoster`;
  links += `playstore`, `appstore`, `website`.
- `lib/projects/validators.ts`: mismos campos en zod (create/update admin API).
- `components/hall/HallOfFameCard.tsx` (REESCRITO): HolographicCard (efecto
  3D de la foto de perfil) + imagen full-bleed + scrim + panel aero glass con
  texto mínimo (categoría, título, one-liner, 3-4 chips, CTA). Sirve `large`
  (carrusel Hall) y compacto (Featured). Fallback particle-wave intacto.
- `components/hall/FeaturedSystemsGrid.tsx`: usa HallOfFameCard compacto
  (se quitó el <Link> envolvente para no anidar links).
- `components/hall/HallOfFameGrid.tsx`: el fondo de la sala usa
  `active.assets.heroVideo` (resuelto por el resolver) con crossfade 0.9s
  (AnimatePresence) al cambiar de proyecto; fallback al video global.
- `components/ui/section-transition.tsx`: fold más profundo (58°, z -220,
  perspective 1200) + veil de "page lighting" que oscurece la escena mientras
  está inclinada y se limpia al aterrizar.
- `components/ui/particle-wave-field.tsx`: drift lateral con parallax por
  fila, twinkle por punto, crest sparkle blanco en la cresta de la ola.
- `components/hall/ContactSection.tsx` (NUEVO): form Formspree `xanbvlqw`
  (el mismo de /os ContactApp) estilizado aero; montado en la banda "Open to
  work" de `app/page.tsx` (grid 2 columnas). Card CTA del OS ahora también
  lleva ParticleWaveField violeta.
- `components/admin/ProjectForm.tsx`: campos Room video (mp4/poster) + links
  demo/github/website/playstore/appstore.
- `docs/CLOUDFLARE_MEDIA.md` (NUEVO): guía del switch.
- `develop-history/scheme004-toptier-roadmap.md` (NUEVO): fases A-F.
- `develop-history/TODO_queue.md` (NUEVO): cola fuera de fase.

## 4. Implicancias técnicas
- HallOfFameCard sigue siendo server component; HolographicCard (client) lo
  envuelve — sin cambio de arquitectura RSC.
- `links: {}` vacío ahora se envía siempre desde el admin (anotado en TODO
  para Admin 2.0).
- next/image con host remoto requerirá `images.remotePatterns` el día del
  switch CDN (anotado en docs y TODO).

## 5. Testing
- `npx tsc --noEmit`: sin errores.
- `pnpm build`: exitoso (todas las rutas compilan, /projects SSG ok).
- Pendiente validación visual del usuario en `pnpm dev` (tilt de cards,
  crossfade de video con un mp4 por proyecto cargado, form de contacto).

## 6. Referencias
- scheme004-toptier-roadmap.md (plan completo A-F).
- docs/CLOUDFLARE_MEDIA.md, docs/VIDEO_ASSET_PIPELINE.md.

## 7. Persistencia
- claude_state.json actualizado (phase: FASE_A_TOPTIER_UX_CORE_COMPLETE).
