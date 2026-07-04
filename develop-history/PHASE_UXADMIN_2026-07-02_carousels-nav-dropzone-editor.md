# Change Log: 2026-07-02 (5/5) — Carruseles, nav cyberpunk, admin plug & play

## 1. Objetivo
Pedidos del usuario: (a) Featured + Archive en carrusel Embla infinito como el
Hall pero SIN cambiar el formato de sus cards, (b) botones laterales de
sección menos escondidos, sin scrollbar manual, estilo "perilla de nodos
cyberpunk" con animación al cambiar, (c) upload de media local con drag &
drop y editor de proyectos rediseñado tomando el editor de noticias de BBN
(BBNfinprod /editor) como referencia visual.

## 2. Revisión previa
- BBN editor v2 estudiado: header sticky con acciones, título gigante sin
  borde, secciones en cards, dropzone punteado con preview + veil de subida.
- /api/media/[...path] ya sirve archivos del volumen durable con protección
  de traversal → un upload genérico solo necesita escribir ahí.

## 3. Cambios aplicados (frontend-app/)
- `components/ui/card-carousel.tsx` (NUEVO): Embla loop reutilizable para
  grids de cards — slides 1/2/3 por vista responsive, duplicación si <7 para
  anillo denso, dots por proyecto (módulo + salto al duplicado más cercano),
  flechas. Recibe `slides: ReactNode[]` para cruzar el boundary server→client.
- `FeaturedSystemsGrid` y `LabArchiveGrid`: grid flex-wrap → CardCarousel
  (accents #0070f3 / #8b5cf6). Formato de card intacto (HallOfFameCard
  compacta). `/projects` hereda.
- `components/ui/chapter-nav.tsx`: rediseño total — rail de energía vertical
  (gradiente cyan→violeta), nodos perilla (anillo + núcleo glow) que crecen
  con spring al activarse, pulse ring expansivo que se re-dispara en cada
  cambio (scroll o click), labels que se deslizan. Movido a right-7.
- Scrollbar manual oculto: clase existente `.no-scrollbar` aplicada a los
  contenedores de scroll de home, /projects y /projects/[slug].
- `app/api/admin/upload/route.ts` (NUEVO): upload genérico admin-only —
  imágenes (png/jpg/webp/avif/gif/svg, 15MB) y videos (mp4/webm, 250MB),
  nombre saneado + timestamp, guarda en mediaDir()/uploads/, devuelve
  `/api/media/uploads/<n>` (Cloudflare-ready vía resolver).
- `/api/media/[...path]`: content-types avif/gif/svg agregados.
- `components/admin/MediaDropzone.tsx` (NUEVO): MediaDropzone (single, drag&
  drop + click, preview img/video, veil de subida, remove, input manual de
  path) y MultiImageDrop (screenshots múltiples con thumbs + remove).
- `components/admin/ProjectForm.tsx`: Admin 2.1 — tabs eliminadas; columna
  única de Sections glass (Identity/Story/Media/Links/Theme), título estilo
  BBN (input gigante sin borde), action bar sticky (Draft/Published toggle +
  Save + Delete), todos los assets como dropzones, screenshots como array
  con editor visual. API contract intacto (POST/PUT /api/admin/projects).

## 4. Implicancias
- Screenshots pasan de textarea a string[]; payload idéntico.
- Upload requiere driver escribible (local-json/Docker); en Vercel responde
  409 como el hero-video upload.

## 5. Testing
- tsc limpio. GET / y /projects 200 con ambos carruseles y nav SSR.
- /admin/projects/new → 307 login (auth intacta); POST /api/admin/upload sin
  sesión → 401.

## 6. Referencias
- BBNfinprod/BBNfinprodAPP/app/editor/new/editor-client-v2.tsx (referencia UX).

## 7. Persistencia
- claude_state.json actualizado; scheme005 (agente ventas) creado y PENDIENTE
  de autorización.
