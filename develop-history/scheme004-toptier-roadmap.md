# Scheme 004 — Top-Tier Roadmap (UX flama + sistema real)

Fecha: 2026-07-01. Fuente: pedido directo del usuario (sesión Claude Code).
Regla: UNA fase por vez, autorización antes de la siguiente (claude.md §0).

## Visión
Pasar de "front pegado con cinta" a producto top-tier: UX cinematográfica y
marketinera, media lista para Cloudflare, agente IA calificador de leads con
bases de delibot (OpenRouter GLM 5.2), e infraestructura mínima real
(Postgres + worker en Docker) sin sobreingeniería.

## Fases

### FASE A — UX core: cards holográficas + Hall video + transiciones (EN CURSO)
1. Todas las cards de proyecto (Hall of Fame + Featured) pasan al efecto
   holográfico 3D de la imagen de perfil: imagen dominante, texto mínimo
   superpuesto, estética aero/glass.
2. Video de fondo del Hall of Fame cambia según el proyecto seleccionado
   (`assets.heroVideo` por proyecto, crossfade; fallback al video global).
3. Modelo de proyecto: `assets.heroVideo/heroVideoPoster` + links
   `playstore/appstore/website` (validators + admin form básico).
4. `lib/media/resolve.ts`: resolver de URLs de media Cloudflare-ready
   (R2/Stream) con fallback local — switch por env, sin tocar componentes.
5. Transición de sección más cinematográfica (fold 3D más profundo +
   iluminación dinámica durante el giro).
6. ParticleWaveField mejorado (crest line, twinkle) en las cards finales.
7. Form de contacto real en la home (mismo Formspree que /os), amoldado a la
   nueva UX.

### FASE B — Project rooms 2.0
- Página de proyecto más estética: bloques interactivos animados como la home,
  galería de imágenes, player de video(s), bloque link/Playstore/App.
- Consumir los nuevos campos de assets/links.

### FASE C — Admin 2.0
- Panel de creación/edición de proyectos nativo e interactivo: preview en vivo,
  editor por bloques, upload de media (driver local hoy, R2 mañana), UX no
  "manija".

### FASE D — Infra mínima real
- docker-compose: + postgres (driver `postgres` del ProjectRepository ya
  contratado en types.ts), + worker liviano para el agente; redis SOLO si el
  worker lo justifica.
- Migraciones mínimas + seed desde content/projects.ts.
- Config Cloudflare por env (pegar credenciales y salir andando; fallback local).

### FASE E — Agente IA "clippy" calificador de leads
- Base conceptual: delibot_estable (conversation_service: memoria persistente,
  no-silence fallback, tools_registry SSoT, salida única tipo DeliveryService,
  golden tests). NO copiar repos enteros; portar patrones a TypeScript.
- OpenRouter con `z-ai/glm-5.2` (env OPENROUTER_API_KEY, fallback determinista
  actual si no hay key — el response-builder existente ES el no-silence).
- UX: widget más grande/importante (aero), proactivo ("¿arrancamos?"),
  web + mobile bien resueltos.
- Memoria visitante: cookie/localStorage + persistencia liviana en DB
  (empresa/startup/idea/presupuesto/contacto) → calificador de leads.
- Tools: mostrar proyectos, abrir form contacto, descargar CV PDF con datos de
  la web, capturar datos de contacto elegante.
- Vista admin liviana de leads.

### FASE F — Polish marketinero + QA
- Cohesión de fondo entre escenas, copy marketinero, Lighthouse ≥ 90,
  smoke E2E, deploy docs.

## Riesgos
- Peso 3D/video en mobile → siempre fallback (reduced-motion / no video).
- Vercel read-only → todo lo escribible va al backend Docker (ya existe patrón
  PROJECT_STORAGE_DRIVER).
- Delibot: portar PATRONES, no código Python literal, para no inflar el front.
