# Finiquitacion Real: Test Gate y Outbound Gate

## Objetivo

Esta segunda capa valida que el sistema no solo compile: debe demostrar que descubre oportunidades, deduplica, enriquece, encuentra emails cuando existen, puntua con criterio, guarda archivo bruto sin romper el admin y solo permite outreach cuando Juan lo habilita.

## Estado seguro por defecto

Variable:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=false
```

Con este valor:

- `lead_followup` queda bloqueado.
- `prospect_outreach` queda bloqueado.
- Las notificaciones al admin siguen habilitadas si Resend esta configurado.
- `scout_digest`, `lead_received`, `session_started`, `admin_alert`, `daily_pulse` pueden seguir llegando al admin.
- El sistema puede descubrir, procesar, puntuar y mostrar prospects.
- El admin puede revisar/exportar sin riesgo de mandar emails automaticos a leads/prospects.

Para produccion final:

```env
OUTBOUND_LEAD_EMAILS_ENABLED=true
```

No activar hasta pasar el checklist de salida.

## Checklist antes de activar outbound

1. `pnpm exec tsc --noEmit` pasa.
2. Tests unitarios pasan:
   - search router.
   - email gate.
   - prospect email harvesting.
   - lead capture persistence.
3. SearXNG responde JSON por red interna:

```bash
docker.exe compose exec -T amorosi-backend sh -lc "wget -qO- 'http://searxng:8080/search?q=nextjs%20ai%20jobs&format=json' | head -c 300"
```

4. Serper no se usa cuando SearXNG trae resultados suficientes.
5. Serper se usa solo en fallback/enrichment/verification.
6. `daily-scout` genera prospects sin romper.
7. Board admin muestra:
   - pocos cards accionables.
   - JSONL/CSV completo para bruto masivo.
8. Al menos un lote controlado deja metricas auditables:
   - total capturado.
   - duplicados removidos.
   - emails encontrados.
   - contactos ready.
   - score alto.
9. Ningun email a prospect/lead salio con gate en `false`.
10. Admin digest llega con resumen y top signals.

## Tests a crear en esta fase

### Search Intelligence

- SearXNG fixture normaliza `results`.
- Serper fixture normaliza `organic`.
- Canonicalizacion remueve tracking params.
- Router:
  - broad discovery usa SearXNG.
  - critical verification usa Serper.
  - SearXNG error + fallback llama Serper una sola vez.
  - SearXNG suficiente no llama Serper.

### Prospecting

- `ingestSearchHits` deduplica por URL.
- `harvestContact` encuentra email en:
  - snippet.
  - pagina original.
  - `/contact`.
  - `mailto:`.
- `processPipelineBatch`:
  - descarta basura.
  - pasa señales relevantes a enrich.
  - marca `contact` solo con score suficiente.
  - no manda email.

### Admin Surface

- `GET /api/admin/prospects` devuelve board acotado.
- `format=jsonl&scope=all` devuelve snapshot grande.
- `format=csv&scope=all` devuelve bruto.
- `format=csv` devuelve solo mailing candidates con email.

### Omni Lead Funnel

- mensaje con email persiste lead.
- `lead_capture` card persiste email/company/need.
- no re-pide email si ya existe.
- recovery puede unir email con session.

### Outbound Gate

- `prospect_outreach` bloquea con `OUTBOUND_LEAD_EMAILS_ENABLED=false`.
- `lead_followup` bloquea con `OUTBOUND_LEAD_EMAILS_ENABLED=false`.
- admin templates no se bloquean por esta compuerta.
- con `OUTBOUND_LEAD_EMAILS_ENABLED=true`, el bloqueo deja de aplicar.

## Criterio de “maquina afilada”

No alcanza con que haya resultados. Un lote de prueba debe producir:

- Discovery por SearXNG funcionando sin Serper en la primera pasada.
- Reduccion por canonicalizacion/dedupe visible.
- Enrichment premium selectivo, no masivo.
- Prospect cards solo para oportunidades accionables.
- Emails encontrados con evidencia de origen.
- Ningun envio outbound accidental.
- Digest al admin con top oportunidades y exports.

## Pendiente arquitectonico

- Persistencia longitudinal `opportunity_signals`.
- Cache compartida backend/worker.
- Providers directos: GitHub, RSS, ATS.
- Tests de volumen con 500/1000 resultados fixture.
- Panel de metricas de efectividad: emails encontrados / total, Serper calls avoided, ready/contact ratio.
