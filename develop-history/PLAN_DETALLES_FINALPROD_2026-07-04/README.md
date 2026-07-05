# PLAN DETALLES FINALPROD — 2026-07-04

> Carpeta de planificación aislada. Cualquier agente (humano o AI) que agarre
> este trabajo debe leer **este README + `00-context-setup.md` COMPLETOS** antes
> de tocar nada. Cada archivo numerado es una unidad de trabajo independiente,
> con root cause verificado, archivos/líneas exactas y pasos quirúrgicos.

## Origen

El usuario (Juan) volvió tras un corte de luz. El branding wizard ya genera
logo + imagen representativa + storyboard y funciona, pero pidió pulir ~13
detalles concretos de UX/visual/infra. Este es el backlog ordenado por su
prioridad explícita.

## Reglas del proyecto (de `CLAUDE.md`, OBLIGATORIAS)

- **Una fase por vez.** Al terminar cada bloque, parar y pedir autorización.
- No borrar nada sensible: renombrar con sufijo `._backup`.
- Persistencia: registrar cada cambio en `develop-history/` + actualizar
  `develop-history/claude_state.json`.
- El backend real corre containerizado en **`:3001`** (`:3000` es un espejo
  estático sin IA — NO probar ahí). Rebuild real tras cambios de server:
  `docker.exe compose --profile backend build amorosi-backend && docker.exe compose --profile backend up -d amorosi-backend`
  (ver `00-context-setup.md`). Cambios frontend-only NO necesitan rebuild de
  imagen si hay dev server, pero en este setup el `:3001` está horneado — sí
  necesita rebuild.
- Referencia de "cómo ya lo hicimos bien": repo `lumenscriot14-slim/` en la raíz.

## Orden de prioridad (palabras del usuario)

| # | Item | Archivo | Tamaño | Riesgo |
|---|------|---------|--------|--------|
| 0 | Sacar cartel debug S10 | `04-images-r2-admin-and-debug.md` §D | XS | nulo |
| 1 | **Desconexión logo step1→step2→step3** (branding) | `01-PRIORITY-branding-logo-chain.md` | M | medio (API) |
| 2 | Vault no se ve / integrarlo al chat | `02-chat-assistant-ux.md` §A | M-L | medio |
| 3 | Post-branding vuelve a proyecto muy vacío | `02-chat-assistant-ux.md` §B | M | bajo |
| 4 | Multistep de a uno + autoscroll | `02-chat-assistant-ux.md` §C | S-M | bajo |
| 5 | Scrollbar del chat desentona | `02-chat-assistant-ux.md` §D | XS | nulo |
| 6 | Card de proyecto: crece al active + insertar logo | `02-chat-assistant-ux.md` §E | S | bajo |
| 7 | 3 botones generate (map/home/screen) no andan + separarlos/guiar | `02-chat-assistant-ux.md` §F | M-L | medio |
| 8 | Cierre de ciclo top-tier (form contacto + nº sesión) | `02-chat-assistant-ux.md` §G | M | bajo |
| 9 | Carrusel Hall of Fame se rompe/encimado/glitchea | `03-home-visuals.md` §A | M-L | medio |
| 10 | Cards no-centrales desaparecen feo | `03-home-visuals.md` §B | S | bajo |
| 11 | Systems in Orbit + Lab Fragments: corte feo al carrusel | `03-home-visuals.md` §C | S | bajo |
| 12 | Auditoría imágenes / R2 en todas las cards | `04-images-r2-admin-and-debug.md` §A-B | L | bajo |
| 13 | Admin: subir imágenes de los 3 interludios nuevos vía R2 | `04-images-r2-admin-and-debug.md` §C | M | bajo |

## Sugerencia de secuencia de ejecución

1. **Bloque quick-win** (baja fricción, resultado visible ya): #0 debug, #5
   scrollbar, #6 card proyecto, #10 fade cards. Un commit.
2. **Bloque branding** (#1) — el más importante para el usuario. Un commit,
   requiere verificar shape de la API de imágenes de OpenRouter (ver doc 01).
3. **Bloque chat/vault** (#2, #3, #4, #7, #8) — es el más grande; subdividir.
4. **Bloque home visual** (#9, #11) — carrusel, requiere prueba en `:3001`.
5. **Bloque imágenes/R2/admin** (#12, #13).

## Archivos de esta carpeta

- `00-context-setup.md` — estado del repo, cómo correr/verificar, mapa de
  arquitectura, índice de archivos clave.
- `01-PRIORITY-branding-logo-chain.md` — item #1 (prioridad máxima).
- `02-chat-assistant-ux.md` — items #2 a #8.
- `03-home-visuals.md` — items #9 a #11.
- `04-images-r2-admin-and-debug.md` — items #0, #12, #13 + auditoría de imágenes.
