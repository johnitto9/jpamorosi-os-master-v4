# Orden de Ejecucion

## Fase 0: estabilizar base y runbooks

1. Confirmar comando Docker esperado:
   - `web` publico mirror en `:3000`.
   - `amorosi-backend` admin/API en `:3001`.
2. Crear `.env.production.dokploy.example` sin secretos reales.
3. Agregar runbook dump/restore probado.
4. Smoke local:
   - `/api/health`
   - `/api/status`
   - admin login
   - assistant
   - media upload
   - scout manual

Criterio: cualquiera puede levantar, dumpear y restaurar sin adivinar.

## Fase 1: quick wins UX sin riesgo alto

Estado: implementado, pendiente QA visual manual.

1. Compactar `ProjectStrip`:
   - sacar `active`.
   - sacar `—`.
   - cards wide y bajas.
2. Mover `SessionRecoveryCard` arriba como boton compacto/popover.
3. Eliminar `Explore Projects` de contact/open-to-work y usar iconos Email/GitHub.
4. Cambiar hero:
   - `Enter Proof Rooms` -> `Let's started`.
   - eliminar `Explore Project Rooms`.
   - scroll al primer interlude.
5. Ajustar shimmer de nombre.

Criterio: `pnpm test`/`tsc`, screenshot desktop/mobile sin perdida de espacio del chat.

## Fase 2: Home Media y mobile interludes

Estado: media/CTA implementado; ajustes finos mobile/interlude pendientes de QA visual manual.

1. `profileImage` desde Home Media.
2. Soporte video para `living1`.
3. Ajustar mobile de `BeforeTheSystems`.
4. Ajustar mobile de `InsideTheProof`.
5. Ajustar station feel al entrar a Hall/Featured/Archive.
6. Extender scroll de interludios levemente.
7. ChapterNav con barras interlude entre nodos.

Criterio: Playwright screenshots mobile/desktop y no regresion desktop.

## Fase 3: agente lead funnel

Estado: captura contextual implementada; quedan tests especificos de persistencia y link recovery single-use.

1. Card/action `lead_capture` disparable por agente.
2. Prompt/orchestrator con intencion de calificacion:
   - email
   - empresa
   - rol/necesidad
   - urgencia/presupuesto cuando corresponda
3. Recovery links single-use o secreto separado.
4. Tests de persistence:
   - email en chat -> lead actualizado.
   - card recovery -> lead actualizado.
   - recover link -> cookie recuperada.

Criterio: el agente pide datos cuando hay oportunidad real y no molesta en consultas frias.

## Fase 4: SearchProvider + Serper wrapper

Estado: implementado con test unitario focalizado.

1. Crear `lib/search/types.ts`.
2. Crear normalizacion/canonicalizacion/dedupe.
3. Crear `SerperProvider` desde codigo existente.
4. Crear `SearchRouter` deterministico.
5. Mantener wrappers viejos para compatibilidad.
6. Tests unitarios.

Criterio: cero cambio funcional externo; Serper sigue funcionando igual, pero ya desacoplado.

## Fase 5: SearXNG local

Estado: compose/config/provider implementados; falta levantar SearXNG por servicio nombrado y probar discovery real.

1. Agregar config `deploy/searxng/settings.yml` o equivalente.
2. Agregar servicio `searxng` + `searxng-valkey` en compose/profile.
3. Agregar env vars.
4. Implementar `SearxngProvider`.
5. Router:
   - discovery -> SearXNG.
   - critical/enrichment selectivo -> Serper.
6. Tests de fallback.

Criterio: discovery amplio no consume Serper cuando SearXNG esta sano.

## Fase 6: inteligencia longitudinal

1. Tabla `opportunity_signals`.
2. Persistir `firstSeenAt`, `lastSeenAt`, `occurrenceCount`, `providersSeen`.
3. Asociacion simple entity/company por dominio/company heuristica.
4. Dashboard admin basico de señales en evolucion.
5. Scoring incremental.

Criterio: el sistema deja de ver cada busqueda como foto aislada.

## Fase 7: prod cutover

1. Backup local.
2. Restore en VPS staging.
3. Smoke staging.
4. Configurar DNS/subdominios:
   - `www.jpamorosi.dev` -> Vercel.
   - `api.jpamorosi.dev` o `admin.jpamorosi.dev` -> Dokploy backend.
   - `media.jpamorosi.dev` -> R2 public.
5. Validar CORS/CSP/media.
6. Activar worker.
7. Monitorear logs 24h.

Criterio: admin y agente operan con datos restaurados, front publico no contiene secretos, SearXNG queda privado.
