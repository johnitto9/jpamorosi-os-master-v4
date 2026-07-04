# Change Log: 2026-07-02 (3/3) — Seams fuera, mascota, cookies, feedback loop

## Cambios (frontend-app/)
- Seams: strips `from-dark-bg` eliminados de FeaturedSystemsGrid y
  LabArchiveGrid (dibujaban líneas sobre el aurora). El Hall of Fame conserva
  su dark-room completo.
- Asistente v4:
  - `assistant/AssistantAvatar.tsx` (NUEVO): mascota holo-bot SVG animada con
    framer-motion (flota, parpadea, antena pulsa, saluda) — sin Lottie, <2KB.
  - Launcher = la mascota en tile glass con ping de atención hasta la primera
    interacción. Popup de saludo proactivo (4s, una vez): mascota saludando +
    CTAs. El guía habla primero al abrir el chat (greeting tipeado con
    indicador de escritura). Panel CENTRADO 760px glass (mobile: full sheet).
- Cookies (`js-cookie`):
  - `lib/consent.ts`: cookie `al_consent` v1 {necessary, personalization},
    evento `al-consent`, helper `personalizationAllowed()`.
  - `components/CookieConsent.tsx`: banner glass sin dark patterns
    ("Necessary only" / "Accept all"), montado en el root layout.
  - Widget: transcript cross-page SOLO con consentimiento de personalización.
- Feedback loop del agente: el cliente manda `page` (path actual) en cada
  mensaje → route lo valida (solo paths internos) → orchestrator lo mete en el
  system prompt ("visitor is on /projects/x → lead with that project") y
  `touchSession` lo mergea en visitor_sessions.meta (jsonb ||).

## Testing
- tsc limpio; markers verificados en dev (mascota SSR, POST /api/assistant con
  page → 200). Docker backend reconstruido.
- Nota WSL: file-watch de Next no ve /mnt/c — dev server corre con
  WATCHPACK_POLLING=true.
