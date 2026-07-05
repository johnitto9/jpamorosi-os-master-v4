# 02 — Refacción: inteligencia + embudo del chat (R1–R4)

Meta global: el chat (omni + sala de proyecto) debe recolectar datos implícita e
inteligentemente, asegurar permanencia de sesión loginless vía email, e insistir
en contacto/datos sin ser molesto. Embudo preciso. Ya existe la plomería (schema
de lead con name/email/company, tools, ctx.projects) — falta ACCIONARLA en UI +
prompt. Ver `00-verified-findings.md`.

---

## §A (R1) — Captura implícita (nombre/persona/empresa) desde el primer step

### Objetivo
En el step 0 de creación de proyecto (nombre del proyecto), pedir también, sutil,
el nombre de la persona/usuario/empresa. Y que el chat en general vaya pidiendo
datos de forma inteligente.

### Estado
`ProjectSetup` (`components/assistant/AssistantProjectOrbit.tsx`) step 0 = nombre
del proyecto + pitch + kind + ADN. No pide quién es el visitante.
`leadPatchSchema` ya tiene `name`/`company`.

### Plan
1. Step 0 de `ProjectSetup`: agregar un campo sutil "¿Cómo te llamás? / empresa
   (opcional)" — `creatorName`. Al crear el proyecto (`POST /api/assistant/projects`)
   mandar también un lead patch: `name`/`company` → persistir en el lead de la
   sesión (hay `leadPatchSchema` + memoria por `al_sid`). Verificar si projects
   route puede recibir/propagar el lead o si hay que llamar aparte a un endpoint
   de lead (revisar `orchestrator`/`leads.ts` para el write path directo).
2. Prompt: reforzar en el systemPrompt (omni y project) que pida el nombre
   temprano y natural ("¿con quién tengo el gusto?") y lo capture en `lead.name`.
   El schema ya lo soporta; es instrucción.
3. Copy i18n: sumar la label del campo a `WIZARD[lang]` (7 idiomas). Mínimo.

### Archivos
`components/assistant/AssistantProjectOrbit.tsx`, `lib/i18n/dictionaries.ts`
(WIZARD), `app/api/assistant/projects/route.ts` (propagar lead), `lib/agent/leads.ts`.

---

## §B (R2) — Card de sesión + email (permanencia/backup del progreso)

### Objetivo
Al terminar el multistep de decisiones en sala de proyecto (al consolidar) —y/o
al cerrar branding— mostrar una card con: datos de la sesión (ref corta de
`al_sid`, proyecto(s) creados, assets) + input de email para "asegurar
permanencia de sesión + backup/carga de datos". Loginless: el email queda ligado
a la sesión y se le manda un link de retorno.

### Plan
1. Nuevo componente `SessionCard` (en `AssistantFlow.tsx` o propio) que se
   renderiza tras `DecisionsBoard.onConsolidate` (y/o en fase `ready`). Muestra:
   - Ref de sesión: primeros 8 chars de `al_sid` ("Ref: ab12cd34").
   - Lista de proyectos de la sesión (nombre + palette).
   - Input email + botón "Guardar mi progreso / mandame el link para retomar".
2. Endpoint `POST /api/assistant/session-save { email }`:
   - `guard` por `al_sid` (misma sesión).
   - Persistir email en el lead de la sesión (`leadPatch { email }`) + generar un
     **resume token** (firmar `al_sid` o token en tabla `session_resume(token,
     session_id, email, created_at)`).
   - Enviar email (Resend ya está — templates en `lib/email/service.ts`) con un
     link `https://jpamorosi.dev/?s=<token>` (loginless resume).
   - `recordEvent("session.saved", {...})` + notifyAdmin opcional.
3. **Resume loginless**: middleware o `app/page.tsx` lee `?s=<token>`, valida,
   re-setea la cookie `al_sid` a la sesión original → el visitante recupera sus
   proyectos/canon. (Reusa el patrón de la magic-link admin, `lib/auth`.)
4. Insistencia sana: si el visitante generó branding/decisiones y no dejó email,
   un nudge suave (una vez) ofreciendo guardar el progreso.

### Archivos
Nuevo `components/assistant/SessionCard.tsx`, `AssistantWidget.tsx` (montar en
consolidate/ready), nuevo `app/api/assistant/session-save/route.ts`,
`lib/email/service.ts` (template resume), `lib/db/bootstrap.ts` (DDL session_resume),
`app/page.tsx`/middleware (leer `?s=`).

---

## §C (R3) — Omni hilbanador: constancia cross-tab de proyectos

### Objetivo
Omni debe estar al tanto de TODO: proyectos en creación/formación del usuario,
aunque estén en otra pestaña; hilvanar la conversación con eso.

### Estado (bueno)
`orchestrator.ts` ya carga `ctx.projects = listSessionProjects(sid)` → omni YA
tiene los proyectos de la sesión (son por-sesión). El gap es de PROMPT.

### Plan (mayormente prompt-level)
1. En el `systemPrompt` de omni: inyectar un bloque "Proyectos en curso de este
   visitante" con nombre/kind/fase/palette de `ctx.projects`, e instruir a omni a
   REFERENCIARLOS proactivamente ("vi que arrancaste 'appie' — ¿seguimos con
   eso?"), conectar ideas entre proyectos y steerear a contacto.
2. Asegurar que el proyecto creado en la tab "project" se persiste inmediatamente
   (ya lo hace `POST /api/assistant/projects`) para que omni (misma sesión) lo
   vea sin delay. Verificar que omni recarga `ctx.projects` en cada turno.
3. Sumar fase/decisiones/assets al contexto de omni (resumen corto) para que
   pueda hablar del estado real, no genérico.

### Archivos
`lib/agent/orchestrator.ts` (systemPrompt + ctx enrich).

---

## §D (R4) — Cards interactivas (texto IA + opciones, respuestas en bloques)

### Objetivo
Más interactividad y guía: botones preseteados, enviar card + explicación breve,
respuestas en bloques/pasos (card → explicación → siguiente), usar imágenes/
paletas/textos generados en la sesión, y cards con texto editado por la IA +
opciones para que el usuario elija DENTRO de la card. Todo seguro y guiado.

### Estado
Ya existe `propose_decisions` (card de opciones que persisten). `AssistantMessage`
renderiza turnos + `onDecision`. Falta un tipo de card genérico/rico y respuestas
multi-bloque.

### Plan
1. **Nuevo tool `show_card`** en el registry (whitelist del orquestador):
   payload tipado, ej:
   ```ts
   { type: "choice", title, body /* texto editado por IA */,
     options: [{ id, label, detail? }], // el user elige DENTRO de la card
     asset?: { role|id } /* opcional: adjunta imagen/palette/texto de la sesión */ }
   ```
   Persistir la elección como se hace con decisions (o como señal de lead).
2. **AssistantMessage**: renderizar por `type` — `choice` (card con opciones),
   `showcase` (imagen/asset de la sesión + caption), `palette` (swatches). Reusar
   el lightbox del `InlineCanon`.
3. **Respuestas en bloques/pasos**: permitir que el orquestador devuelva varios
   segmentos (array de mensajes/cards) que se renderizan en secuencia (card →
   explicación → acción). Hoy el response es 1 turno; extender el contrato de
   `AssistantMessage`/orchestrator a lista de bloques con pequeño stagger.
4. **Usar assets de la sesión**: el agente puede referenciar un asset por rol/id
   (logo/reference/home/palette) y mostrarlo inline como parte de la respuesta
   (lee `/api/assistant/workspace`). Seguro: sólo assets de la sesión.
5. **Botones preseteados**: ampliar `quickReplies`/suggestions por fase/kind (ya
   existe el mecanismo en `AssistantWidget`), más contextuales.

### Riesgo / nota
Es el bloque más grande. Subdividir: (1) `show_card` choice + render, (2) bloques
multi-segmento, (3) showcase de assets. Cada uno un commit con verificación.

### Archivos
`lib/assistant/tool-registry.ts`, `lib/agent/orchestrator.ts` (contrato de
respuesta + prompt), `components/assistant/AssistantMessage.tsx`,
`components/assistant/AssistantWidget.tsx` (quickReplies).
