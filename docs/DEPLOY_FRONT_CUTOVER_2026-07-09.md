# DEPLOY FRONT — Consideraciones finales (2026-07-09)

Responde: **"¿si pusheamos a origin, el front de Vercel cambia solo?"**

## Respuesta corta: NO automáticamente — por la rama

- Vercel (jpamorosi.dev) despliega la **Production Branch del proyecto**, que
  es **`v4final`** (la default del repo: `origin/HEAD -> v4final`).
- Todo el trabajo nuevo vive en **`main`**, que está **65 commits adelante**
  de `origin/v4final`. Pushear `main` a origin NO toca prod: Vercel ni se
  entera.

Para que el front nuevo llegue a jpamorosi.dev, UNA de dos:

```bash
# Opción A (recomendada): promover main a la rama de producción
git push origin main:v4final

# Opción B: en Vercel → Settings → Git → Production Branch: main
# (y pushear main normalmente)
```

Con cualquiera de las dos, Vercel buildea y **reemplaza el front viejo**
(el simple con 3D) por el nuevo Hall of Fame. `/os` sobrevive intacto —
sigue siendo una ruta del mismo app.

## ⚠️ La trampa de contenido: seed vs JSON vivo

Vercel corre con `PROJECT_PUBLIC_CONTENT_MODE=static` → la home lee el
**seed compilado** (`content/projects.ts`), NO el `projects.json` del volumen
Docker donde hicimos todo el enriquecimiento por admin. Consecuencias si se
pushea tal cual:

- **`dataset-creator` NO existe en el seed** → no aparece en Vercel.
- Los datos enriquecidos (RecApp fidedigno, Leviathan, Delify como
  e-commerce, highlights curados, stacks cortos) **no se reflejan** — Vercel
  mostraría las versiones viejas del seed.

**Antes del push a prod**: portar el JSON vivo al seed. Export rápido:

```bash
C=$(docker.exe compose ps -q amorosi-backend)
docker.exe exec $C cat /app/data/projects.json > /tmp/projects-live.json
# → actualizar content/projects.ts con esos datos (a mano o pedírselo a Claude)
```

Alternativa de largo plazo: mover el front público a Dokploy con
`PROJECT_PUBLIC_CONTENT_MODE=live` (ver HYBRID_DEPLOYMENT_STRATEGY.md) y
dejar Vercel como espejo o retirarlo.

## Envs a verificar en Vercel antes del cutover

Además del mínimo ya documentado (VERCEL_DEPLOY_CHECKLIST.md):

| Var | Por qué |
|---|---|
| `NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.jpamorosi.dev` | El seed/settings referencian media en R2; sin esto los resolvers no arman las URLs del CDN |
| (sin `DATABASE_URL` / `OPENROUTER_API_KEY`) | OK esperado: el chrome i18n (11 idiomas) va compilado y funciona igual; el CONTENIDO de proyectos queda en inglés para idiomas no-en (la traducción LLM+cache necesita DB — vive en Docker/Dokploy) |
| `ADMIN_ENABLED=false` | Sigue igual: drag&drop, redes y edición son del backend Dokploy |

## Qué cambia visualmente al cutover

Home nueva completa (Hall of Fame + 3 escenas GSAP + Orbe con presets, todo
en 11 idiomas), rooms de proyectos, `/projects`, `/cv`. El scout, heartbeat,
emails y todo lo autónomo NO corren en Vercel (son del stack Docker/Dokploy)
— Vercel es solo la cara pública estática.

## Checklist del día del push

1. Portar `projects.json` vivo → `content/projects.ts` (la trampa de arriba).
2. `pnpm build` local verde.
3. Verificar envs Vercel (tabla).
4. `git push origin main:v4final`.
5. Smoke en el preview URL de Vercel: home (idiomas, swipe Hall), una room,
   `/#contact` (ancla), `/os`.
6. Dominio ya apunta — al promoverse el build, jpamorosi.dev cambia solo.
