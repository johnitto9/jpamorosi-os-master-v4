# Migración de datos → Dokploy (F6)

Complementa `docs/finalizacion-prod-2026-07-05/05-runbook-dokploy-cutover.md`
(que cubre servicios y secrets). Esto cubre LOS DATOS: lo que ya existe en la
DB local, los proyectos y la media de Cloudflare.

## Qué vive dónde (inventario)

| Dato | Dónde vive | Cómo migra |
|---|---|---|
| Leads, sesiones, mensajes, memoria | Postgres (`amorosi_pg_data`) | `pg_dump` → `pg_restore` |
| Prospects (dragnet completo) | Postgres | idem |
| Traducciones cacheadas (`content_translations`) | Postgres | idem (¡ahorra re-pagar el LLM!) |
| Eventos, email_logs, ai_logs, tracked_links | Postgres | idem |
| Brand DNA / assets / decisiones de proyectos de visitantes | Postgres | idem |
| `projects.json` (contenido del Hall editado por admin) | Volumen `amorosi_backend_data` (`/app/data`) | tar del volumen |
| Media subida local (uploads no offloadeados) | Volumen `/app/data/media` | tar del volumen |
| Media en Cloudflare R2 (videos, imágenes CDN) | Bucket R2 detrás de `media.jpamorosi.dev` | **no migra** — mismas envs, mismo bucket |
| Imágenes de interludes / settings del sitio | Postgres (site settings) con URLs → R2 | pg_dump + envs |

Clave: las URLs guardadas apuntan al CDN (`NEXT_PUBLIC_MEDIA_CDN_BASE`), no a
un host de app. Mientras Dokploy configure la MISMA base de CDN y las mismas
credenciales R2, toda la media "migra sola".

## Procedimiento

1. **En la máquina local (WSL):**
   ```bash
   DOCKER=docker.exe ./scripts/dump-for-dokploy.sh
   ```
   Deja en `./dokploy-migration/`: dump de Postgres (formato custom),
   tarball del volumen backend y un `RESTORE.md` con los comandos exactos.

2. **En el VPS (después de `docker compose up` del runbook):**
   - `pg_restore -U amorosi -d amorosi --clean --if-exists <dump>` dentro del
     contenedor de Postgres.
   - Descomprimir el tarball dentro de `/app` del backend (repone
     `data/projects.json` + `data/media/…`).
   - Reiniciar `amorosi-backend` y `worker`.

3. **Envs de media (identicas a local docker):**
   ```env
   NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.jpamorosi.dev
   R2_ACCESS_KEY_ID=…  R2_SECRET_ACCESS_KEY=…  R2_BUCKET_NAME=…  R2_ENDPOINT=…
   ```

4. **Gates de autonomía (orden de encendido):**
   ```env
   OUTBOUND_LEAD_EMAILS_ENABLED=false     # arrancar SIEMPRE así
   AGENT_FOLLOWUP_ENABLED=false
   AGENT_PROSPECT_OUTREACH_ENABLED=false  # nuevo (REFAC F7): outreach frío autónomo
   ```
   Encender en ese orden, uno por vez, tras verificar `/admin/prospects`,
   `email_logs` y el dashboard de Resend. El outreach autónomo está
   doble-gateado: necesita `OUTBOUND_LEAD_EMAILS_ENABLED=true` **y**
   `AGENT_PROSPECT_OUTREACH_ENABLED=true`.

5. **Verificación:**
   - `curl /api/health` y `/api/status` (db + storage driver + capacidades).
   - Home carga media desde el CDN, board de prospects poblado, traducciones
     servidas desde cache (probar `al_lang=ja` — idioma nuevo: la 1ª visita
     paga la traducción LLM del contenido de proyectos, después cache).

## Precalentar idiomas nuevos (opcional, recomendado)

Tras el deploy, visitar la home con cada cookie de idioma nuevo para poblar
`content_translations` una vez:
```bash
for l in he ja ko hi; do curl -s -H "Cookie: al_lang=$l" https://<host>/ >/dev/null; done
```
