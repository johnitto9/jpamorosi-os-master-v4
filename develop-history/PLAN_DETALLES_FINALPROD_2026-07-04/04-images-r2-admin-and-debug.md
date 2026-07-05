# 04 — Imágenes / R2 / Admin + Debug banner (items #0, #12, #13)

---

## §D — Sacar el cartel de debug S10 (item #0) — QUICK WIN, hacer primero

### Qué es
`MobileDebugIndicator` — overlay cyan de debug en los interludios mobile.
Ubicación (`components/hall/Interludes.tsx`):
- Definición: `function MobileDebugIndicator(...)` línea **359**.
- Uso: línea **483** (`<MobileDebugIndicator sceneId="before-the-systems" />`),
  precedido por el comentario `{/* S8 debug indicator — remove once ... */}`
  línea 482.
- Bloque de definición del componente ~líneas 338-435 (helper + JSX).

### Fix
1. Borrar la línea 482-483 (el `<MobileDebugIndicator />` y su comentario) en
   `MobileScene1`.
2. Borrar la definición `MobileDebugIndicator` (338-435, verificar límites al leer).
3. Dejar `__IL_DEBUG__` (window hooks) — es liviano y dev-only; el usuario solo
   pidió sacar el CARTEL visible. (Opcional: podés quitarlo también, pero no es
   necesario.)
4. Quitar el `console.log("[S10 ${scene}] mobile build running", ...)` (línea 118)
   si molesta en consola de prod.
5. `npx tsc --noEmit` → 0 errores. Rebuild `:3001`. Verificar que ya no aparece el
   cuadradito cyan en mobile.

### Archivos
- `components/hall/Interludes.tsx`.

---

## §A — Auditoría de imágenes: qué está conectado a R2 y qué no (item #12)

### Contexto de infra (ya existe, VERIFICADO)
- `lib/media/storage.ts` → `storeFile()`: sube a **Cloudflare R2** si hay env
  `R2_*`, si no guarda local en la media dir (servida por `/api/media/[...path]`).
- `lib/media/resolve.ts` → `resolveMediaUrl()`/`resolveVideoUrl()`: si hay
  `NEXT_PUBLIC_MEDIA_CDN_BASE`, sirve todo desde el CDN; rutas absolutas pasan sin
  tocar. **Este es el seam correcto — toda imagen renderizada debería pasar por
  acá.**
- `app/api/admin/upload/route.ts`: upload genérico admin (drag&drop) con
  magic-byte sniff → usa `storeFile()`. Ya listo para R2.
- Admin `ProjectForm.tsx` + `MediaDropzone.tsx`: el editor de proyectos ya sube
  heroImage/screenshots/video vía ese pipeline (Fase C).

### Inventario a auditar (el usuario listó estas superficies)

| Superficie | Fuente actual | ¿Pasa por resolve/R2? | Acción |
|-----------|---------------|------------------------|--------|
| Cards Hall of Fame | `project.assets.heroImage` (DB o `content/projects.ts`) | Hall pasa video por `resolveVideoUrl`; **verificar** que `HallOfFameCard` pase `heroImage` por `resolveMediaUrl` | Si no, envolver. Seed estático tiene varios `heroImage: undefined` (content/projects.ts:127,166,205) → esos caen a fallback |
| 2 cards de **BEFORE THE SYSTEM** | `IMG.before1`/`IMG.before2` hardcoded `/images/interludes/*.jpg` | **NO** (InterludeImage usa `<img src>` directo, sin resolve) | Ver §B/§C |
| **YOU'RE INSIDE THE PROOF** (hoy icono monitor 🖥️) | `IMG.proof1` — la imagen falta → `InterludeImage` cae al emoji `🖥️` | **NO** | Ver §B/§C — subir imagen real |
| **THE LIVING LAYER** | `IMG.living1` hardcoded | **NO** | Ver §B/§C |
| Cards **Systems in Orbit** (Featured) | `project.assets.heroImage` | verificar `FeaturedSystemsGrid`/card | Igual que Hall |
| Cards **Lab Fragments** (Archive) | `project.assets.heroImage` | verificar `LabArchiveGrid`/card | Igual que Hall |

### Cómo auditar (concreto)
1. `grep -rn "heroImage\|resolveMediaUrl\|<img\|Image src" components/hall/HallOfFameCard.tsx`
   — confirmar si `heroImage` pasa por `resolveMediaUrl`. Si renderiza el path
   crudo, envolverlo. Idem el card usado por Featured/Archive.
2. Verificar `env`: ¿está seteado `NEXT_PUBLIC_MEDIA_CDN_BASE` en la instancia
   viva? Si no, todo se sirve local (funciona, pero no "desde R2"). Confirmar con
   el usuario cuál es el objetivo (subir desde /admin y hostear en R2).
3. Para las cards de proyectos: el camino R2 ya existe vía admin ProjectForm →
   `storeFile` → heroImage guardado como URL R2 (o local) → `resolveMediaUrl`. Lo
   único faltante suele ser: (a) el card no envuelve con resolve, (b) el seed
   estático tiene `undefined`. Documentar hallazgos.

### Regla
Toda imagen que hoy se pinta con `<img src={path}>` crudo debería pasar por
`resolveMediaUrl(path)`. Barrer: `grep -rn "<img" components/ | grep -v resolveMediaUrl`.

---

## §B — Interludios: conectar a resolve + fuente editable (base para #13)

### Estado (VERIFICADO)
`components/hall/Interludes.tsx`:
- `IMG` const (línea 130-134): 4 paths hardcodeados `/images/interludes/*.jpg`.
- `InterludeImage` (línea 195-206): recibe `src` string, hace `<img src={src}>`
  directo (NO `resolveMediaUrl`), y en `onError` cae a `emoji`. Por eso INSIDE
  THE PROOF muestra el monitor: la imagen no existe y cae al emoji `🖥️`.

### Fix base (habilita R2 + edición)
1. Envolver el `src` con `resolveMediaUrl(src)` dentro de `InterludeImage`
   (import desde `lib/media/resolve`). Así, si hay CDN, sirve de R2.
2. Reemplazar el `IMG` const hardcodeado por una **fuente editable** (ver §C):
   los 3 interludios leen su(s) imagen(es) de un store de settings.

---

## §C — Admin: subir imágenes de los 3 interludios vía R2 (item #13)

### Objetivo
Que Juan pueda subir desde `/admin` las imágenes de **BEFORE THE SYSTEM (×2),
YOU'RE INSIDE THE PROOF, THE LIVING LAYER**, hosteadas en R2, sin tocar código.
Hoy no existe superficie admin para esto (nunca se hizo).

### Plan
1. **Persistencia (settings key-value):** revisar si ya hay una tabla/servicio de
   settings del sitio. `grep -rn "settings\|site_settings\|getSetting\|SiteSettings"
   lib/ app/api/admin/`. Si existe, agregar claves:
   `interlude.before1`, `interlude.before2`, `interlude.proof1`, `interlude.living1`
   (valores = URLs que devuelve `storeFile`). Si NO existe, crear una tabla simple
   `site_media (key text primary key, url text, updated_at)` con un repo mínimo
   (patrón idempotente DDL como en el resto del proyecto) o un JSON en la media
   dir. Elegir lo más liviano y documentar la decisión.
2. **API admin:** `POST /api/admin/site-media { key, url }` (guarda) + el upload
   ya lo da `/api/admin/upload` (devuelve la URL R2/local). Guardar admin con
   `guardAdmin`.
3. **UI admin:** una sección nueva en el panel admin ("Interludios / Home media")
   con 4 `MediaDropzone` (uno por clave), reusando el componente existente.
   Ubicación: junto al editor de proyectos o una página `/admin/media`.
4. **Lectura en el home:** `Interludes.tsx` deja de usar `IMG` hardcodeado; el
   `page.tsx` (server) lee las 4 URLs del settings store y las pasa como props a
   cada interludio (o `Interludes` las lee vía un fetch server-side). `InterludeImage`
   ya pasará por `resolveMediaUrl` (§B). Fallback: si una clave está vacía, usa el
   path estático actual o el emoji (degradación limpia).

### Verificación
1. En `/admin`, subir una imagen para "INSIDE THE PROOF". Confirmar que
   `/api/admin/upload` devolvió URL (R2 si hay env, local si no) y que el settings
   guardó la clave.
2. Recargar el home en `:3001` → INSIDE THE PROOF ya no muestra el monitor emoji,
   muestra la imagen subida.
3. Repetir para las otras 3.

### Archivos
- Nuevo: repo/servicio de site-media (o extender settings existente).
- Nuevo: `app/api/admin/site-media/route.ts`.
- Nuevo: sección admin (componente + página).
- `components/hall/Interludes.tsx` (leer props/settings en vez de `IMG`),
  `app/page.tsx` (cargar y pasar las URLs).
- `lib/media/resolve.ts` (ya existe, solo usarlo).

### Riesgo / nota
Es el item más "de infra". Confirmar con Juan si quiere R2 activo ya (necesita las
env `R2_*` cargadas en la instancia viva) o si por ahora alcanza local + seam
listo. El código queda R2-ready igual gracias a `storeFile`/`resolveMediaUrl`.
