# EXEC_LOG_09 — 2026-07-05

## Objetivo
Cerrar R1 de forma quirurgica: capturar identidad basica al crear un proyecto.

## Cambios
- `ProjectSetup` ahora suma campos opcionales en step 0:
  - nombre de la persona;
  - empresa;
  - email.
- El POST a `/api/assistant/projects` manda `lead` solo si alguno de esos campos
  tiene valor.
- `/api/assistant/projects` acepta `lead` validado con `leadPatchSchema.pick(...)`
  y hace `upsertLead(sessionId, lead)` antes de crear el proyecto.

## Verificacion
- `cd frontend-app && npx tsc --noEmit` → 0 errores.

## Pendiente operativo
- No se hizo rebuild/recreate por cuota. Para verlo vivo en `:3001`:
  `docker.exe compose --profile backend build amorosi-backend && docker.exe compose --profile backend up -d amorosi-backend`.

## Pendiente despues de exec09
- R4: tool `show_card`.
- P3: living layer vibra al scrollear.
- Worker scout: persistir `lastScoutDate` en DB si hace falta.
