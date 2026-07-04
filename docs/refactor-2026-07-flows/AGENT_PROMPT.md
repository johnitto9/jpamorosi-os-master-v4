# Prompt para el agente que continúa

Copiá/pegá esto como primer mensaje al nuevo agente (Claude Code, working dir
`/mnt/c/Users/jamor/Downloads/jpamorosi-os-master-v4`):

---

Sos Claude Code continuando una refacción del CV interactivo "Amorosi Labs"
(Next.js + Tailwind v4, app en `frontend-app/`). Trabajás en el repo, no desde cero.

**ANTES DE TOCAR NADA, leé en este orden:**
1. `CLAUDE.md` (raíz) — protocolo: UNA fase por vez, te detenés y pedís autorización
   antes de la siguiente; registrás cada cambio en `develop-history/` y actualizás
   `develop-history/claude_state.json`; nada de features fuera de fase.
2. `docs/refactor-2026-07-flows/HANDOFF.md` — QUÉ está hecho y QUÉ falta (autoridad).
3. `docs/refactor-2026-07-flows/00_MASTER_PLAN.md` y `01_PROJECT_ROOM_BRANDING_FLOW.md`.
4. `develop-history/PHASE_FLOWS_F0_2026-07-04.md` y el `claude_state.json`.
5. La memoria del proyecto (índice en la ruta memory/MEMORY.md): la topología
   docker :3000 (espejo estático sin IA) vs :3001 (lab real con IA/admin).

**Reglas duras que ya rigen:**
- Probar SIEMPRE en `http://localhost:3001`. Comandos docker con `docker.exe` desde WSL.
- La imagen NO se reconstruye sola: tras cambios de código, `docker.exe compose
  --profile backend up --build -d` para dejarlo vivo en :3001.
- Modelos: texto `z-ai/glm-5.2`, imágenes `bytedance-seed/seedream-4.5` (endpoint
  `/api/v1/images`, `b64_json`, **resolución mínima 2K** — "1K" da 400). Ya configurado.
- Persistencia T05 YA existe (BrandDNA, Assets con `role`, StackDecisions, VisualPlan
  max-9, confirmPalette en `lib/agent/project-workspace.ts`) — REUSALA, no dupliques.
- Validá con `cd frontend-app && node_modules/.bin/tsc --noEmit` y `next build` antes
  de rebuildear. i18n: 7 idiomas (en/es/pt/fr/ru/zh/ar) — todo string nuevo va en los 7.

**Primer trabajo concreto (Fase 2a — cerrar):** el código de la máquina de estados
`phase` está escrito y `tsc` pasa, pero FALTA rebuildear y verificar la migración.
Corré `docker.exe compose --profile backend up --build -d`, luego
`docker.exe exec jpamorosi-os-master-v4-postgres-1 psql -U amorosi -d amorosi -c "\\d session_projects"`
y confirmá que existe la columna `phase` y que `GET /api/assistant/projects` la devuelve
(creá un proyecto por curl y probá `PATCH {id, phase:"branding"}`).

**Después seguí en orden arquitectónico** (ver HANDOFF §"FALTA"): 2b (derivación a
Branding + gating de tabs) → 2c (multistep de Branding subir/generar + vault propio) →
2d (cards de decisiones) → Fase 3 (subir cap + generar mapa/home/pantallas usando
VisualPlan) → Fase 1 (omni chat) → Fase 4 (interludios animados, necesita fotos de Juan).

**Hay decisiones abiertas de Juan** (HANDOFF §"Decisiones abiertas"): mapa siempre o
por tipo, límites de imágenes, branding obligatorio, fuente del chat. Preguntáselas
cuando lleguen a ser bloqueantes, no antes.

Empezá confirmando que releíste el HANDOFF y cerrá Fase 2a (rebuild + verificación de
migración). Luego pedí autorización para arrancar Fase 2b.
