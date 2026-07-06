# Finalizacion Prod 2026-07-05

Carpeta aislada para ordenar el cierre serio del sistema antes de tocar mas codigo funcional.

## Documentos

- `00-auditoria-inicial.md`: estado verificado del repo, Docker, front/backend, Serper, sesiones, media y SearXNG.
- `01-plan-prod-deploy.md`: plan de deploy VPS/Dokploy/Vercel, secretos, servicios, dump/restore de Postgres y readiness.
- `02-plan-ux-front.md`: plan de refaccion UI/UX solicitado para chat, home, interludios, media y CTAs.
- `03-search-intelligence-searxng.md`: arquitectura propuesta para SearXNG + Serper como capa de Search/Opportunity Intelligence.
- `04-orden-de-ejecucion.md`: orden pragmatico de implementacion y criterios de aceptacion.
- `05-runbook-dokploy-cutover.md`: pasos concretos para preparar secretos, dump/restore, deploy backend, SearXNG privado y smoke prod.
- `06-finiquitacion-real-test-gate.md`: segunda capa de tests, criterios de maquina afilada y compuerta para bloquear outbound a leads/prospects.
- `DEV_HISTORY.md`: bitacora corta de cambios y proximos pasos para continuar si se corta la sesion.

## Decision inicial

No conviene empezar por una reescritura grande. El repo ya tiene piezas valiosas: backend Docker, Postgres, worker, prospecting, tracking, session recovery, media admin y R2-ready. El cierre correcto es consolidar contratos, desacoplar busqueda, reducir costo Serper, ajustar UX mobile y dejar runbooks reproducibles.

## Estado de avance verificado

- Backend local vive en `localhost:3001` como servicio `amorosi-backend`; `web` no esta corriendo.
- SearchProvider + SearXNG/Serper router implementado con tests.
- Admin prospects separa archivo bruto masivo de cards accionables.
- Scout digest al admin enriquecido con metricas, top señales y links a exports.
- Omni puede mostrar una card de captura de lead contextual y persistirla en la sesion/dossier.
