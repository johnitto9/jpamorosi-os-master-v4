# Internal & public APIs — el primer nodo del ecosistema Amorosi Labs

Todas las respuestas son JSON. Errores: `{ error, message? }` con status
semántico (400/401/404/413/415/422/503).

## Salud
| Ruta | Qué devuelve |
|---|---|
| `GET /api/health` | `{ ok, uptimeSeconds, db: ok\|down\|off }` — para healthchecks |
| `GET /api/status` | flags de capacidades (db, pgvector, llm, email, r2, webSearch, mockups, internalApi) — solo booleanos, nunca valores |

## Públicas / semi-públicas
| Ruta | Descripción |
|---|---|
| `POST /api/leads` | alta de lead `{name?, email?, phone?, company?, budget?, need?, notes?, source?}` — requiere email, phone o need. Notifica al admin |
| `GET /api/projects` | proyectos publicados agrupados `{hall, featured, archive}` |
| `GET /api/projects/:slug` | un proyecto publicado |
| `POST /api/sessions` | crea sesión de conversación → `{sessionId}` |
| `POST /api/sessions/:id/messages` | `{message}` → respuesta del agente |
| `POST /api/ai/chat` | `{message, sessionId?}` → `{sessionId, ...AssistantResponse}` |
| `POST /api/assistant` | endpoint del widget (sesión por cookie `al_sid`) |

## Admin (cookie de sesión admin; 401 sin ella)
`GET /api/admin/leads · /sessions · /events?type= · /ai-logs · /email-logs`
más las ya existentes de proyectos (`/api/admin/projects[...]`), upload y media.

## Internal (service-to-service)
Header requerido: `Authorization: Bearer <INTERNAL_API_TOKEN|SERVICE_API_TOKEN>`.
Sin token configurado en el server → **503** (superficie apagada, nunca abierta).

| Ruta | Descripción |
|---|---|
| `POST /api/internal/events` | `{type, payload?, actorId?}` → registra evento |
| `POST /api/internal/leads` | alta de lead desde otro servicio |
| `POST /api/internal/sessions` | crea sesión → `{sessionId}` |
| `GET /api/internal/projects/:slug/context` | contexto compacto para agentes externos |
| `POST /api/internal/agent/run` | `{sessionId?, message, page?}` → corre el cerebro |
| `POST /api/internal/memory/write` | `{content, kind?, sessionId?}` |
| `GET /api/internal/memory/search?q=&sessionId=` | keyword search (seam pgvector) |

## Eventos (tabla `events`)
`{ source:"portfolio", type, actorId, project:"amorosi-portfolio", payload, created_at }`
Tipos activos: lead.created/updated/scored, session.started,
session.message.created, ai.response.generated, ai.tool.called/failed,
project.viewed, admin.login.requested/success, email.sent/failed,
media.uploaded, storage.r2.uploaded, storage.local.uploaded.
