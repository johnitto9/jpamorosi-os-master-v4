# Change Log: 2026-07-03 (2) — Orbe de proyectos + i18n profundo + fixes

## Fixes visuales
- FlipCards de "Why this matters"/"From the builder" recuperaron el efecto
  holográfico (HolographicCard envuelve al flip: rectángulo irregular 3D +
  sheen + giro + confetti — lo mejor de ambos mundos).
- Logos: fit="cover" sin padding (hero 64px, chip del Hall, banda store) —
  el logo llena SIEMPRE su área (zoom-crop; los assets traen padding propio).
- EvidenceWall: carrusel desde >=3 fotos (antes >3).
- Hero: botones despegados de los tags (mt-9).

## i18n profundo
- Auto-detección sin cookie: IP country (x-vercel-ip-country/cf-ipcountry,
  mapa 30+ países) → Accept-Language → en. La elección manual siempre gana.
- Switch: entrada con spring pop + 3 pulsos de atención (primera visita).
- Primera sección traducida entera: rol, tagline, thesis, CTAs, capabilities
  label (HallHero async + getDict; 7 idiomas en dictionaries).
- Agente consciente del idioma: lang viaja en cada mensaje → directiva dura
  en el prompt ("DEFAULT a ese idioma en respuestas/botones/preguntas").
  Widget: saludos/nudges/chips localizados ES completo (resto fallback EN,
  el agente igual contesta en el idioma del visitante).
- Límite conocido: contenido de proyectos queda EN canónico.

## EL ORBE (concepto central)
- Tabla session_projects (name/kind/concept/stack/palette/logo por sesión
  loginless, cascade). lib/agent/projects.ts (create/list/update parcial,
  ids casteados ::int — FIX: bigserial llegaba como string y rompía el
  matching de ids en toda la cadena).
- API /api/assistant/projects (GET/POST, cookie-scoped, crea sesión si es
  la primera interacción).
- Widget: ProjectSetup (easy multiple-choice: nombre + tipo chips + stack
  quick-picks + concepto 1 línea) que aparece solo en tabs project/branding
  sin orbe; ProjectStrip (carrusel de cards bajo las tabs: activa a color,
  resto en gris/grayscale; project/branding = single pin, omni = multi
  hasta 3); BrandingBoard (paleta + logo + "✨ Generar concepto" one-tap
  que dispara Seedream con la identidad del proyecto).
- Server: projectIds por tab → bloque ACTIVE PRE-PROJECT en el prompt
  (todo orbita: refinar concepto, decidir stack, embudo a contacto) + tool
  update_project (arg JSON string validado con zod) + RED DETERMINISTA
  delibot-style: si hay 1 proyecto pinneado y el mensaje nombra techs
  conocidas, el server mergea el stack SIN depender del LLM.
- VERIFICADO E2E: crear proyecto → chat pinneado → agente contesta
  nombrándolo → stack persistido ["Redis","Docker"] en DB.

## Campañas de email
- CampaignCatcher en root layout: ?al_ref=token → cookie 90d → meta.campaign
  de la sesión → chip 📣 en /admin/sessions + campaña en el email
  session_started. Los links de outreach cierran el loop sesión↔perfil.

## Referencia lumenscript (lumenscriot14-slim, agregado a .gitignore)
- Aprendizajes capturados para futura mejora de generate_mockup: prompt
  estructurado (estilo→composición→mood→paleta), anti-glyph agresivo,
  nunca nombres propios, imágenes de referencia multimodales.
