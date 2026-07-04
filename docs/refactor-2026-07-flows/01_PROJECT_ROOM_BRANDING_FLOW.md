# Sala de Proyecto + Branding — Flujo Guiado (Fases 2-3)

El corazón de la refacción: convertir el chat post-creación de "rumiante y libre"
en un **carril guiado, preseteado, con cards lindas y pensamiento de fondo**, que
recién abre libertad conversacional cuando el proyecto está consolidado.

Principio: **inteligencia alta por detrás, UX preseteada y fluida por delante.**
Menos "vamos por acá o por allá" (eso es el omni chat); acá, pasos claros.

---

## 1. Máquina de estados del proyecto

Nuevo campo `phase` en el pre-proyecto (session_projects). Gatea qué ofrece el chat.

```
created ──▶ branding ──▶ decisions ──▶ consolidated ──▶ generating ──▶ ready
   │          (tab       (dudas +        (stack/core     (mapa→home
   │         Branding)   cards sol.)      fijados)        →pantallas)
   └─ multistep ya dio: name, kind, concept, colores
```

- `created`: recién salido del multistep (con colores). Sala de proyecto muestra
  **1 mensaje presentado + botón "Generar branding"** (NO texto libre divagante).
- `branding`: se trabaja en el **tab Branding** (multistep propio). Al terminar → `decisions`.
- `decisions`: sala de proyecto habilita cards de dudas + stack/features/core/APIs.
- `consolidated`: decisiones fijadas; el vault las refleja compactas. Habilita generación.
- `generating`/`ready`: mapa/home/pantallas generadas y en vault. Libertad conversacional.

Persistencia: extender `getProjectWorkspace` (T05) con `branding{}`, `decisions[]`,
`screens[]`, `map`. El vault ya es la vista; sumamos secciones.

---

## 2. Sala de proyecto tras crear (estado `created`)

Reemplaza el greeting divagante actual por un **turno preseteado + card de acción**:

> 🚀 "**{name}** ya tiene cimientos y colores. El primer paso es darle su universo
> visual — logo, imagen y storyboard. Después definimos el sistema."
> **[ ✨ Generar branding → ]**  (deriva al tab Branding con la card activa)

- El botón NO manda un mensaje al LLM: hace `switchThread("branding")` + marca la
  card activa. El multistep de branding vive en el tab Branding, no acá.
- Composer bloqueado hasta que branding exista (foundations-first, ya hay patrón).

---

## 3. Tab Branding — multistep propio (estado `branding`)

Branding **solo hace esto**. Mismo lenguaje visual que `ProjectSetup` (cards lindas,
step dots, theater). 3 pasos, cada uno = **subir O generar** (Seedream) + brief textbox.

### Step B1 — Logo
- Mensaje presentado del chat + **card** con: preview, textbox "breve indicación",
  botones **[Subir]** y **[✨ Generar]** (Seedream `aspect_ratio:"1:1"`).
- Generar usa colores del proyecto + brief. Persiste como `logoUrl` + asset `logo`.

### Step B2 — Imagen representativa
- Igual patrón. `aspect_ratio:"16:9"` o `"4:3"`. Asset tipo `hero`/`representative`.

### Step B3 — Storyboard
- "Que muestre de todo un poco, resumido." `aspect_ratio:"16:9"`, prompt que pide
  un collage/storyboard. Asset tipo `storyboard`.

Obligatorio generar el universo antes de seguir. Al completar → `phase = decisions`
+ botón **"Seguir en sala de proyecto →"** (única salida; branding queda ahí).

### Vault propio de Branding
- Tab Branding tiene su **vault especializado**: paleta + los 3 assets (logo/
  representativa/storyboard), personalizado para branding. NO el vault general.
- Reusar `AssetVault` con un `scope="branding"` (filtra secciones) o componente hermano.

### Gating del tab Branding
- Si **no hay proyecto/card** y alguien abre Branding de la nada → solo un botón
  **"Iniciar proyecto"** que deriva a Sala de proyecto. Nada más.
- Branding solo se habilita desde una **card activa / derivación** de Sala de proyecto.

---

## 4. Sala de proyecto — decisiones (estado `decisions`)

Branding hecho → se habilitan steps guiados. **Libertad media**, inferencia fácil,
cards lindas, sin tecnicismo. El agente piensa fuerte por detrás (glm-5.2) pero
presenta poco y claro.

1. **Dudas del agente**: "Si algo te genera duda, planteálo acá" + **cards con
   soluciones** (opciones). Máx **3-4 decisiones**; cada una una card con 2-3 opciones.
   El visitante elige card → se registra decisión.
2. **Stack mínimo + features**: pocas preguntas, cards de opción (no técnicas).
3. **Core + algoritmos anexos + APIs**: idem, sin mucho detalle, cards guiadas.

Cada decisión → `decisions[]` en el workspace. El **vault de sala de proyecto**
refleja esto **compacto** (chips/línea, sin ocupar mucho). Al cerrar → `consolidated`.

Implementación: un "step engine" server-driven — el agente propone las cards
(opciones) con un tool `propose_decisions`; el cliente las renderiza; la elección
vuelve como turno estructurado. Determinista-first con enriquecimiento LLM.

---

## 5. Sala de proyecto — generación (estado `consolidated` → `generating`)

Posibilidades preseteadas (botones/cards), en orden:

1. **Generar mapa** — une todo (arquitectura/flujo). Tarda; theater de progreso;
   se agrega al vault. Según tipo de proyecto (mayormente sí).
2. **Generar home** — estima **cuántas imágenes** necesita según lo planificado.
   Genera (Seedream), muestra la home con sus imágenes + **pitch/explicación breve**,
   guarda en vault de sala de proyecto.
3. **Generar resto de pantallas** — habilitado tras la home. **Máx 9**. Van a una
   sección **"Pantallas" desplegable dentro del vault desplegable** (comprimido).
4. **Mockups** — sobre una pantalla o imagen de la home: botones **"Mockup mobile"**
   / **"Mockup web (notebook)"** (Seedream con aspect ratio del device).

Consolidado = un poco más de libertad para hablar de todo lo generado.

### Cap de generación
- Hoy `MOCKUPS_PER_SESSION = 3` (tools-server). Insuficiente. Cambiar a **por
  proyecto** con techos por tipo: logo(1) + representativa(1) + storyboard(1) +
  mapa(1) + home(N≤? imágenes) + pantallas(≤9) + mockups(≤ algunos). Contabilizar
  por carpeta de sesión/proyecto, no global. Definir números con Juan.

---

## 6. Vault — layout final (compacto, desplegable)

Vault de **sala de proyecto** (dentro del chat, no home):
```
▸ Paleta        ● ● ●
▸ Branding      logo · representativa · storyboard   (mini thumbs)
▸ Decisiones    stack: … · core: … · APIs: …          (chips, 1-2 líneas)
▸ Mapa          [thumb]
▸ Home          [thumb] + pitch corto
▸ Pantallas (n) ▸ desplegable → grid mini de ≤9
```
Vault de **branding**: solo Paleta + los 3 assets.

---

## 7. Sub-fases de implementación (checkpoint entre cada una)
- **2a** Estado/persistencia: `phase` + workspace extendido + gating de tabs.
- **2b** Sala `created`: mensaje preseteado + botón "Generar branding" + derivación.
- **2c** Tab Branding: multistep 3 pasos (subir/generar) + vault de branding.
- **2d** Sala `decisions`: step engine + cards de dudas/stack/core (tool propose_decisions).
- **3a** Cap por proyecto + generar mapa.
- **3b** Generar home (estimación de imágenes + pitch).
- **3c** Pantallas ≤9 + sección desplegable en vault.
- **3d** Mockups mobile/web + libertad conversacional consolidada.
