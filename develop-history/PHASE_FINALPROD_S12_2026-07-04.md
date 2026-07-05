# Change Log: 2026-07-04 — FINALPROD S12 (fix generación imagen representativa 16:9)

## 1. Objetivo
El branding wizard genera bien el logo (step 1, 1:1) pero la imagen
representativa (step 2, role `reference`, 16:9) falla con "Didn't work".

## 2. Diagnóstico (verificado en vivo contra el endpoint)
El cliente (AssistantFlow.tsx) muestra t.bFail cuando POST
/api/assistant/branding no devuelve `asset`. La ruta devuelve 502
`generation_failed` porque `generateImageToSession` devuelve null.
Query a `events` (ai.tool.failed) → `"openrouter images 400"`.
Reproducido con node dentro del contenedor: el body del 400 es
`The parameter 'size' … must be at least 3686400 pixels` (provider "Seed").

Tabla de verdad (endpoint real, Seedream 4.5):
  - 1:1  @ 2K → 200  (2048² = 4.19M ≥ 3.686.400)  ← el logo
  - 16:9 @ 2K → 400  (~1920×1080 = 2.07M < mínimo) ← el bug
  - 16:9 @ 4K → 200
  - 9:16 @ 4K → 200
  - *:*   sin `resolution` → 200 (Seed elige tamaño válido, pero más chico)

Causa: el preset "2K" de Seed sólo supera el mínimo de 3.686.400 px cuando el
aspecto es CUADRADO. Cualquier no-cuadrado a 2K queda por debajo → 400.

## 3. Fix
`lib/agent/tools-server.ts`: nuevo helper `sizedRequest(aspectRatio, resolution)`
que arma `{ aspect_ratio, resolution }` forzando **"4K" para todo aspecto
no-cuadrado** (incl. "auto"); 1:1 conserva lo pedido (2K por defecto).
`generateImageToSession` ahora usa `...sizedRequest(...)` en el body en vez de
`aspect_ratio/resolution` hardcodeados. 4K además da la calidad "hero" que la
imagen representativa/storyboard/home quieren. Comentario de MockupOpts
corregido (2K NO es el piso universal). Desktop/logo intactos.

## 4. Testing
- tsc --noEmit: 0 errores.
- Probes en vivo: 16:9/9:16 @ 4K → 200; 1:1 @ 2K → 200.
- Rebuild + recreate: health {"ok":true}; server compilado contiene
  `"1:1"===c?b??"2K":"4K"` (la rama del helper).
- Pendiente: usuario reintenta el step 2 del branding en :3001.

## 5. Persistencia
claude_state.json → phase FINALPROD_S12_BRANDING_16x9_FIXED.
Memoria: constraint de Seed (min 3.686.400 px; 2K sólo sirve 1:1) guardada.
