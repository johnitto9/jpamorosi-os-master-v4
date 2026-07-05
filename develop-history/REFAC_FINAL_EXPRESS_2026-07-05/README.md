# REFAC FINAL EXPRESS — 2026-07-05

> Carpeta AISLADA de la refacción final. Cualquier agente que agarre esto debe
> leer **este README + `00-verified-findings.md` COMPLETOS** antes de tocar
> nada. Todo lo de `00` está MEDIDO en vivo (no supuesto). Quota baja: ejecutar
> por bloques, commitear/persistir seguido, no apilar intentos.

## Contexto

Sesión 13 dejó vivo en `:3001`: debug banner fuera, scrollbar on-brand, project
card fixes, Hall+Systems/Lab fade, decisiones deseleccionables, **vault dentro
del chat (InlineCanon)**, botones generate separados. Estado en
`develop-history/claude_state.json` (phase FINALPROD_S13e...) y plan previo de
detalles en `develop-history/PLAN_DETALLES_FINALPROD_2026-07-04/`.

Ahora: (1) bloque de PULIDO final, (2) REFACCIÓN de inteligencia/embudo del chat
+ prospecting real + email tracking. El usuario quiere un embudo preciso: el chat
debe recolectar datos implícita e inteligentemente, asegurar permanencia de
sesión (loginless) vía email, y que la maquinaria outbound realmente consiga
emails y quede trazable con links a `jpamorosi.dev` (Cloudflare).

## Regla de infra (verificada, ver 00)

- Backend real containerizado en `:3001` (imagen HORNEADA). Rebuild:
  `docker.exe compose --profile backend build amorosi-backend && docker.exe compose --profile backend up -d amorosi-backend`.
- **R2 NO está configurado en la instancia viva** (`R2_ACCESS_KEY_ID` vacío,
  `NEXT_PUBLIC_MEDIA_CDN_BASE` vacío). `storeFile` cae a local. El código es
  R2-ready; sólo faltan las envs. Todo lo de "subir a R2" funciona local hoy y
  se vuelve R2 al setear las envs — NO hace falta re-código.
- Worker corre (`...-worker-1`, up). Serper/OpenRouter/Resend/INTERNAL_TOKEN: SET.

## Bloques y prioridad

| # | Bloque | Archivo | Riesgo | Estado |
|---|--------|---------|--------|--------|
| P1 | Admin: subir imágenes de interludios (R2-ready) | `01-polish-items.md` §A | bajo | falta |
| P2 | Featured/Archive: fade "groso" → al borde + smooth | `01-polish-items.md` §B | bajo | falta |
| P3 | Living Layer "vibra" al scrollear | `01-polish-items.md` §C | medio | falta |
| P4 | Hall mobile: cards descentradas (a la derecha) | `01-polish-items.md` §D | bajo | falta |
| P5 | **Hall coverflow desync** (se enciman y reinicia) | `01-polish-items.md` §E | medio | falta (bug histórico) |
| R1 | Embudo: captura implícita (nombre/persona/empresa) | `02-chat-funnel-intelligence.md` §A | medio | falta |
| R2 | Card de sesión + email (permanencia/backup) | `02-chat-funnel-intelligence.md` §B | medio | falta |
| R3 | Omni hilbanador: constancia cross-tab de proyectos | `02-chat-funnel-intelligence.md` §C | bajo | parcial |
| R4 | Cards interactivas (texto IA + opciones, bloques) | `02-chat-funnel-intelligence.md` §D | medio | falta |
| R5 | **Prospecting real**: scheduling + extracción de emails | `03-prospecting-and-email-tracking.md` §A-B | medio | machinery OK, leads huecos |
| R6 | Email tracking con links `jpamorosi.dev` (callbacks) | `03-prospecting-and-email-tracking.md` §C | medio | falta |

## Orden sugerido (quota-safe)

1. **P1 + P2 + P4** (quick wins UI, un commit). 
2. **P5** (el bug histórico del carrusel — vale un commit dedicado + prueba).
3. **P3** (Living Layer, investigar animación).
4. **R5** (prospecting real — alto valor, el usuario duda que funcione; ya
   probado que ingesta pero sin emails → falta paso de extracción).
5. **R1 + R2 + R3** (embudo de datos + permanencia de sesión).
6. **R4 + R6** (cards interactivas + email tracking; los más grandes).

## Archivos

- `00-verified-findings.md` — TODO lo medido en vivo (no re-investigar).
- `01-polish-items.md` — P1–P5.
- `02-chat-funnel-intelligence.md` — R1–R4.
- `03-prospecting-and-email-tracking.md` — R5–R6.
