# Change Log: 2026-07-03 — i18n + identidad loginless + tabs de chat + kanban

## 0. Fix previo
- ProjectHero: restaurada la card holográfica del hero (misma imagen que la
  card del Hall) — solo la foto de FONDO quedó eliminada, como se pidió.

## 1. i18n (7 idiomas: en/es/pt/fr/ru/zh/ar)
- lib/i18n/dictionaries.ts: shell de la home traducido (~22 keys/idioma).
  Implementación propia liviana (un framework i18n sería sobreingeniería
  para una página de chrome). El CONTENIDO de proyectos queda en inglés
  canónico; el agente ya responde en el idioma del visitante por su cuenta.
- lib/i18n/server.ts: cookie al_lang leída server-side (home es
  force-dynamic → SSR traducido gratis).
- LanguageSwitch (top-left, glass, banderas) + easy-guide nudge one-time
  ("🌐 Elegí tu idioma", 2.5s→10.5s, no compite con los popups del bot).
- Props de header en HallOfFameGrid/Featured/Archive + labels en ChapterNav
  + banda de contacto + card OS + browseAll.
- VERIFICADO SSR: cookie es → "Salón de la Fama"; zh → "名人堂".
- Limitación conocida: árabe renderiza RTL inline pero el layout sigue LTR.

## 2. Identidad loginless de 3 patas + recovery
- Pata 1: cookie al_sid (existente). Pata 2: al_device_id en localStorage
  (lib/identity.ts) — el route del assistant hace REBIND automático: sin
  cookie pero deviceId conocido → misma sesión (findSessionByDevice sobre
  meta jsonb). Pata 3: hash SHA-256 truncado de la IP en meta (señal blanda,
  nunca clave).
- Recovery total (otro dispositivo/país): POST /api/session/recover-request
  {email} → si hay lead con ese email, manda link firmado HMAC (30 días,
  template session_recovery brandeado); GET /api/session/recover?code= →
  re-emite la cookie y redirige. Anti-enumeration (siempre {ok}).
- VERIFICADO E2E: rebind sin cookie funcionó (mismo session_id); recovery
  email enviado ok=true a marco@logiar.com.

## 3. Tabs de conversación (máx 5)
- agent_messages.thread (ALTER idempotente); loadHistory/saveTurn/runAgent/
  route aceptan thread 0-4 — hilos REALES en el server, no solo UI.
- Widget: barra de tabs en el header (píldora por hilo + botón "+"),
  picker de templates con 3 modos: 💬 Omni (todo), 🚀 Project room
  (co-crear pre-proyecto: stack/scope/pitch visual) y 🎨 Branding — cada
  uno con greeting y suggestion chips propios. Transcripts por hilo en
  sessionStorage (consent-gated). Threads meta en localStorage.
- VERIFICADO: mensajes de thread 1 y 0 separados en DB.

## 4. Kanban admin (/admin/pipeline)
- 4 columnas Discover/Qualify/Propose/Close 🔥 — las cards AVANZAN SOLAS
  porque el stage lo computa el código desde hechos capturados (el tablero
  ES la máquina de estados, sin drag manual a esta escala). Card → sesión.

## 5. Testing
- tsc limpio, vitest 42/42, E2E: threads en DB, rebind sin cookie,
  recovery email, SSR es/zh.

## Pendiente próxima fase
- Panel lateral de assets en el tab Project; acciones programadas de
  seguimiento (cron por stage sin LLM); matching por link de email
  marketing (utm/token → sesión↔perfil); embeddings CPU/reranker.
