# 02 — Wizard de setup: de "quiz técnico" a "easy guide"

Archivo: `frontend-app/components/assistant/AssistantProjectOrbit.tsx` — setup wizard desde L110.
Hoy: step 0 identity (name + kind) → step 1 **stack quick-picks** → step 2 concept/vision.

Veredicto del usuario: "el multistep no está mal pero ya el segundo paso arranca mal… no que si Next, que si Tailwind, hay que hacerla corta".

## Rediseño de steps

### Step 1 — Identidad + ADN de marca
- Mantener: nombre + breve descripción.
- **Agregar**: campo de indicaciones de branding — "¿cómo es o cómo te la imaginás?" (texto libre corto: tono, colores, referencias). Opcional pero visible.

### Step 2 — Necesidades en lenguaje de negocio (reemplaza stack quick-picks)
Nada de tecnologías. Toggles/chips simples, multi-select, redactados para no-devs:
- 🚦 Bancar mucho tráfico
- ✨ Visuales fluidas / animaciones
- 🌍 Rápido en todo el mundo (edge)
- 🔐 Soberanía de la data / dónde viven los datos
- (agregar 2-3 más del mismo estilo si el dominio lo pide: pagos, multi-idioma, app móvil)

Debajo, **sección colapsable "¿Sos dev / tenés stack definido?"** (cerrada por defecto): un textbox libre para tecnología específica ("si querés que use algo puntual, ponelo acá"). Eso es TODO el espacio técnico.

El mapeo necesidad→stack lo infiere el agente después, internamente — nunca se le pregunta al usuario.

### Step 3 — Assets opcionales (un solo step, ver detalle en `03-BRANDING-flow.md`)
Tres slots opcionales: **logo**, **imagen representativa**, **storyboard**. Cada slot: botón subir + botón **generar**. De cada asset subido/generado se extrae paleta.

### Step 4 (final, era step 2) — Concepto/visión
Mantener, alimentado por todo lo anterior.

## Card resultante

La card del proyecto (donde hoy se renderiza la paleta fallback `["#00e5ff","#8b5cf6"]`, ~L79) debe mostrar:
1. Logo subido, si existe →
2. Logo generado, si existe →
3. Fallback: icono/emoji derivado del kind/nombre del proyecto.

## Vínculo proyecto ↔ branding

Ya existe base: las cards de "project room" y "branding" comparten colores y al crear una se crea la otra. Hacerlo **explícito y navegable**: desde la vista de proyecto, acceso claro al branding y viceversa; un solo modelo de datos compartido (ADN del proyecto) que alimenta ambas caras. Verificar también que desde **omni** se pueda disparar la creación de proyecto/branding/card (el usuario no pudo comprobarlo — probalo y si no se puede, habilitarlo).

## Aceptación
- Flujo completable en <2 minutos sin conocer ninguna tecnología.
- Textbox dev presente pero colapsado y 100% opcional.
- Card con logo/fallback correcto en los 3 casos.
- Crear desde omni, project room o branding converge al mismo ADN.
