# HANDOFF — Assistant v5: Project/Branding flow, Guided Tour, Admin Sessions

**Para el agente que tome este trabajo (Opus 4.8 o superior).**
Autor del handoff: Claude Fable 5, 2026-07-03. Investigación de código ya hecha; los archivos y líneas citados fueron verificados.

## Protocolo obligatorio

1. Leé `CLAUDE.md` de la raíz (modo de operación del repo: **una fase por vez**, logs en `develop-history/`, nunca borrar — renombrar `._backup`).
2. Leé TODOS los archivos de esta carpeta en orden numérico antes de tocar código.
3. Ejecutá las fases de `PLAN-FASES.md` en orden. Al terminar cada fase: `pnpm build` verde en `frontend-app/`, log en `develop-history/`, y frenás a pedir autorización.
4. App real: `frontend-app/` (Next.js App Router, pnpm). El resto de la raíz es documentación/historia.
5. Idioma con el usuario (Juan): español rioplatense, directo, sin humo.

## Qué se pide (resumen ejecutivo)

Juan probó el asistente del portfolio (widget omni + project rooms + branding) y encontró:

- **P0 — Bug bloqueante**: en project mode, escribir "quiero un ecommerce con backoffice" dispara un refusal de guardrail en loop. Causa raíz confirmada: regex `ADMIN_SECRETS` matchea la palabra "backoffice". Ver `01-BUGFIX-guardrails.md`.
- **Wizard de setup demasiado técnico**: el step 2 pregunta por stack (Next, Tailwind). Debe ser "easy guide": opciones de negocio simples + textbox opcional para devs. Ver `02-WIZARD-easyguide.md`.
- **Flujo de branding incompleto**: falta step de uploads opcionales (logo / imagen / storyboard) con extracción de paleta y botones "generar"; la card debe usar el logo con fallback a emoji. Proyecto y branding ya comparten base — hay que vincularlos explícitamente. Ver `03-BRANDING-flow.md`.
- **Generación de imágenes sin criterio**: hoy genera 1 concepto genérico suelto. Debe ser un pipeline coherente de pantallas/mockups (tope 9) con apartado propio en el chat. Ver `04-IMAGENES-pipeline.md`.
- **Guided tour gasta tokens**: debe ser 100% preseteado (cero LLM), guionado en pasos, con escape limpio a modos inteligentes. Ver `05-GUIDED-TOUR-preset.md`.
- **Admin sessions pobre**: cada sesión debe mostrar pestañas (chats múltiples, branding/ADN, logs de seguimiento). Ver `06-ADMIN-SESSIONS.md`.

## Mapa de archivos clave (verificado)

| Archivo | Qué es |
|---|---|
| `frontend-app/components/assistant/AssistantWidget.tsx` (922 líneas) | Widget principal del chat. Guided tour: L34, L95, L142, L552. Mensaje "Project mode on 🚀": L106. |
| `frontend-app/components/assistant/AssistantProjectOrbit.tsx` | **El wizard de setup** (L110+: step 0 identity → 1 stack quick-picks → 2 concept/vision) y `BrandingBoard` (L11: paleta, logo slot, botón generar concepto vía Seedream). |
| `frontend-app/lib/assistant/guardrails.ts` (108 líneas) | Guardrails determinísticos de input/output. **Bug en L37**. `enforceResponse` (L94) solo permite cards de imagen bajo `/api/media/`. |
| `frontend-app/lib/agent/orchestrator.ts` (453) | Orquestador LLM del agente (logAiCall, parseo de JSON, safety net determinístico ~L368). |
| `frontend-app/lib/agent/playbooks.ts` (131) | Prompts/stages por audiencia (recruiter/dev/etc.), tono premium. |
| `frontend-app/lib/agent/projects.ts` (113) | Lógica proyecto/branding del agente. |
| `frontend-app/lib/assistant/response-builder.ts`, `tool-registry.ts` | Construcción de respuestas y tools del asistente. |
| `frontend-app/app/admin/sessions/page.tsx` (117) y `[id]/page.tsx` (322) | Vista admin de sesiones — a extender con tabs. |
| `frontend-app/components/admin/ProjectForm.tsx` (587) | Form admin de proyectos (single-page, campos logo/stack) — referencia, no es el wizard. |
| APIs | `app/api/admin/sessions`, `app/api/session`, `app/api/sessions`, `app/api/internal/sessions`, media en `/api/media/`. |

## Guardarrieles de diseño (no negociables)

- **Cero tokens donde no hace falta**: guided tour y wizard son determinísticos. LLM solo en conversación libre y generación de assets.
- **Todo opcional, siempre "subir o generar"**: nunca bloquear el avance por un asset faltante.
- **Nada de imágenes sueltas**: todo asset generado/subido vive en un apartado estructurado (branding board / galería), tanto en el chat del visitante como en admin.
- **No romper lo que funciona**: el caso de éxito en test es la sesión "marco". Verificá que siga funcionando tras cada fase.
- **Seguridad**: los guardrails se corrigen, no se eliminan. `enforceResponse` y el allowlist de rutas quedan intactos.
