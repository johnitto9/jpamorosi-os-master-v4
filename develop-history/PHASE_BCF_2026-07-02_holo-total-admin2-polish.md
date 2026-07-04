# Change Log: 2026-07-02 (2/2) — Cierre B + C + F: holográfico total, Admin 2.0

## 1. Objetivo
Finiquitar el roadmap: efecto holográfico 3D (el de la foto de perfil) en TODAS
las cards del sitio, hero de room cinematográfico, y Admin 2.0 con preview en
vivo.

## 2. Cambios aplicados (frontend-app/)

### Holográfico en todas las cards
- `projects/ProjectProofCards.tsx`: highlights → HolographicCard subtle.
- `projects/EvidenceWall.tsx`: tiles de screenshots → HolographicCard subtle
  (+ resolver de media CDN).
- `projects/FounderNotes.tsx`: nota → HolographicCard subtle.
- `projects/ProjectRoom.tsx`: related cards → HolographicCard subtle.
- `assistant/AssistantProjectCard.tsx`: mini-cards del chat → HolographicCard.
- (Hall, Featured y /projects ya eran holográficas desde FASE A; /projects
  reutiliza los mismos grids de la home.)

### FASE B (cierre) — ProjectHero 2.0
- `projects/ProjectHero.tsx` (REESCRITO): ParticleWaveField de marca +
  watermark gigante del título + hero image flotando como card holográfica
  (desktop) + fila de links completa (demo primario con color de marca,
  website/Play Store/App Store/GitHub secundarios) — todo por el resolver CDN.
- `projects/ProjectMediaShowcase.tsx`: ahora SOLO video ("In motion") — los
  screenshots viven únicamente en EvidenceWall (se eliminó la duplicación).

### FASE C — Admin 2.0
- `admin/ProjectForm.tsx` (REESCRITO): editor por pestañas
  (Basics/Story/Media/Links/Theme) + PREVIEW EN VIVO: la HallOfFameCard real
  (holográfica) renderiza al costado con el estado actual del form.
  - Color pickers nativos sincronizados con el hex (accent/secondary),
    glow con swatch + botón "derive from accent".
  - Editor de screenshots (uno por línea) — antes no editable desde admin.
  - Contador de caracteres del one-liner, toggle Published prominente junto
    a la preview, save bar al pie.
  - Contrato API intacto (POST/PUT /api/admin/projects).

### FASE F — cohesión
- Verificado: rooms y /projects ya promueven la paleta de marca al aurora
  global (SceneSetter/sceneStore); el Hall propaga la paleta del proyecto
  seleccionado. Las escenas quedan hilvanadas por el mismo fondo.

## 3. Testing
- `npx tsc --noEmit` limpio; `pnpm build` exitoso (23/23 páginas, rooms SSG).
- Validación visual pendiente del usuario (tilt/preview en vivo).

## 4. Estado del roadmap scheme004
- A ✔, B ✔, C ✔ (editor; upload directo a R2 queda para el switch Cloudflare),
  D ✔, E ✔ (falta probar vía LLM con API key real), F ✔ (cohesión/polish base).

## 5. Persistencia
claude_state.json y TODO_queue.md actualizados.
