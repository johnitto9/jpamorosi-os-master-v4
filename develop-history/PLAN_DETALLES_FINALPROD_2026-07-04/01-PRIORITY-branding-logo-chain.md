# 01 — PRIORIDAD #1: Desconexión del logo en la cadena branding

## Síntoma (usuario)

> "El logo generado en step1 debería darse como elemento de la generación de la
> imagen representativa (step2) junto con colores/cosas guardadas. Hay
> desconexión entre el logo de step1 y el que aplica a la imagen representativa.
> En step3 (storyboard) parece tomar el logo del step2 (que nada tenía que ver
> con el del step1 real)."

Traducción técnica: cada paso del branding wizard genera su imagen **sólo con
un prompt de texto**. El logo real (PNG generado en step1) **nunca se pasa como
imagen de referencia** a step2 (reference) ni step3 (storyboard). Por eso la
imagen representativa "inventa" un logo distinto, y el storyboard replica el
inventado, no el real.

## Root cause (VERIFICADO en código)

Cadena de llamadas:

1. `BrandingWizard` (`components/assistant/AssistantFlow.tsx:114-314`) — 3 pasos
   `["logo","reference","storyboard"]`. Cada paso hace `POST /api/assistant/branding`
   con `{ projectId, role, brief }`. **No manda ninguna referencia visual.**
2. `app/api/assistant/branding/route.ts` — construye el prompt con
   `brandingPrompt(role, project, brief)` (línea 48-66). Ese prompt SOLO usa
   `name/kind/concept/palette + brief`. Nunca incluye la URL del logo.
   Luego llama:
   ```ts
   const image = await generateImageToSession(sessionId, prompt, {
     aspectRatio: ASPECT[role], resolution: "2K", filePrefix: `asset-${role}-`,
   });
   ```
3. `generateImageToSession` (`lib/agent/tools-server.ts:212-266`) — hace
   `POST https://openrouter.ai/api/v1/images` con body
   `{ model, prompt, aspect_ratio, resolution, n:1 }`. **No hay parámetro de
   imagen de entrada.** Es text-to-image puro.

Conclusión: no existe ningún camino image-to-image / reference conditioning.
El logo se guarda como asset y se setea `project.logoUrl`, pero jamás vuelve a
entrar a una generación posterior.

## Objetivo del fix

En step2 (reference) y step3 (storyboard): pasar el **logo real** (y, para el
storyboard, también la imagen representativa) como **imagen de referencia** a
Seedream, además de mantener palette + concept + brief. Que la marca sea
visualmente coherente de punta a punta.

## Paso 0 — VERIFICAR el shape de la API (obligatorio antes de codear)

Seedream 4.5 soporta edición/generación multi-referencia, pero hay que
confirmar **cómo lo expone OpenRouter en `/api/v1/images`**. No asumir. Opciones
probables del campo de entrada (una de estas):

- `image: ["data:image/png;base64,...."]` (array de data URLs), o
- `image: "<url pública o data url>"`, o
- que haya que usar el endpoint `/chat/completions` con content multimodal
  (image_url) para el modelo de imagen.

**Cómo verificarlo (1 llamada, dentro del contenedor `:3001`):**

```bash
# desde WSL, ejecutar node dentro del contenedor con la API key ya en env
docker.exe compose --profile backend exec amorosi-backend node -e '
const key=process.env.OPENROUTER_API_KEY, model=process.env.OPENROUTER_IMAGE_MODEL;
// 1x1 png transparente base64 como referencia de prueba
const px="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
(async()=>{
  for (const shape of [
    {name:"image-array-datauri", body:{model,prompt:"logo on a poster",aspect_ratio:"1:1",resolution:"2K",n:1,image:["data:image/png;base64,"+px]}},
    {name:"image-string-datauri", body:{model,prompt:"logo on a poster",aspect_ratio:"1:1",resolution:"2K",n:1,image:"data:image/png;base64,"+px}},
  ]) {
    const r=await fetch("https://openrouter.ai/api/v1/images",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(shape.body)});
    console.log(shape.name, r.status, (await r.text()).slice(0,300));
  }
})();'
```

- El shape que devuelva **200** es el correcto. Documentar cuál fue.
- Si NINGUNO funciona en `/api/v1/images`, probar el modelo vía
  `/chat/completions` con `messages:[{role:"user",content:[{type:"text",...},{type:"image_url",image_url:{url:dataUri}}]}]`
  y `modalities:["image","text"]` (algunos modelos de imagen en OpenRouter van
  por ese camino). Documentar el resultado.

> ⚠️ Regla del proyecto: **medir antes de codear.** No apilar intentos. Una
> hipótesis = un experimento = un commit.

## Paso 1 — Extender `generateImageToSession` para aceptar referencias

Archivo: `lib/agent/tools-server.ts`.

1. Ampliar `MockupOpts`:
   ```ts
   export type MockupOpts = {
     aspectRatio?: MockupAspect;
     resolution?: "2K" | "4K";
     references?: string[]; // /api/media session URLs o paths locales
   };
   ```
2. En `generateImageToSession`, antes del fetch, resolver cada referencia a
   base64 (data URI). Las URLs son del tipo `/api/media/sessions/<sid>/<name>.png`
   y el archivo real vive en `sessionMockupDir(sessionId)`. Leer con `fs`:
   ```ts
   async function refToDataUri(sessionId: string, url: string): Promise<string | null> {
     const m = url.match(/\/api\/media\/sessions\/[^/]+\/(.+)$/);
     if (!m) return null;                 // (solo referencias de la propia sesión)
     try {
       const dir = await sessionMockupDir(sessionId);
       const buf = await fs.readFile(path.join(dir, m[1]));
       return `data:image/png;base64,${buf.toString("base64")}`;
     } catch { return null; }
   }
   ```
3. Añadir el campo al body del fetch SÓLO con el shape verificado en Paso 0.
   Ejemplo (si el ganador fue `image` array de data URIs):
   ```ts
   const refs = (opts?.references ?? []);
   const refData = (await Promise.all(refs.map((u) => refToDataUri(sessionId, u))))
     .filter((s): s is string => !!s);
   const body = {
     model: env.OPENROUTER_IMAGE_MODEL,
     prompt: prompt.slice(0, 900),
     ...sizedRequest(opts?.aspectRatio, opts?.resolution),
     n: 1,
     ...(refData.length ? { image: refData } : {}),
   };
   ```
   Mantener todo lo demás igual (timeout, b64_json parse, persistencia).

> Nota: `sessionMockupDir` y `fs`/`path` ya se importan en este archivo (se usan
> en la persistencia del PNG). Reusar.

## Paso 2 — La ruta branding pasa el logo (y reference) como referencia

Archivo: `app/api/assistant/branding/route.ts`.

1. Tras validar el proyecto, antes de generar, buscar los assets ya existentes:
   ```ts
   import { listAssets } from "@/lib/agent/project-workspace";
   ...
   const existing = await listAssets(projectId); // [{role,url,...}]
   const logo = existing.find((a) => a.role === "logo" && a.url)?.url ?? project.logoUrl ?? null;
   const reference = existing.find((a) => a.role === "reference" && a.url)?.url ?? null;
   ```
   (Verificar la firma real de `listAssets` en `project-workspace.ts`; si
   devuelve otra forma, adaptar.)
2. Elegir referencias por rol:
   ```ts
   const references =
     role === "reference"  ? [logo].filter(Boolean) as string[] :
     role === "storyboard" ? [logo, reference].filter(Boolean) as string[] :
     []; // logo no tiene referencia (es el origen)
   ```
3. Pasarlas a la generación + reflejarlo en el prompt:
   ```ts
   const image = await generateImageToSession(sessionId, prompt, {
     aspectRatio: ASPECT[role], resolution: "2K",
     filePrefix: `asset-${role}-`, references,
   });
   ```
4. Ajustar `brandingPrompt` para que INSTRUYA usar la referencia cuando existe.
   Añadir al prompt de `reference`/`storyboard` algo como:
   `"Incorporate the provided brand logo EXACTLY as-is (same mark, same colors) as the identity anchor of this image; do not redraw or reinterpret the logo."`
   Sólo agregar esa frase cuando `references.length > 0`.

## Paso 3 — (Opcional, recomendado) cap: reference/storyboard requieren logo

Para forzar el orden correcto, el wizard ya arranca en el primer paso faltante
(`AssistantFlow.tsx:146`), así que normalmente el logo existe antes. Pero si el
usuario sube manualmente en desorden, `references` quedaría vacío y caería al
comportamiento viejo (text-only) — aceptable como degradación. No bloquear.

## Verificación (en `:3001`, obligatoria)

1. Rebuild backend (imagen horneada). `curl /api/health`.
2. En el chat, crear/pinnear un proyecto, ir a Branding.
3. Step1 logo → generar. Anotar la URL del asset.
4. Step2 reference → generar. El PNG resultante debe **contener el mismo logo**.
   Verificar en el evento `ai.tool.called`/`ai.tool.failed` que no hubo 400.
5. Step3 storyboard → generar. Los mini-paneles deben mantener el logo real.
6. Confirmar visualmente con el usuario (él testea en `:3001`).

## Archivos tocados

- `lib/agent/tools-server.ts` (references en `generateImageToSession`).
- `app/api/assistant/branding/route.ts` (buscar logo/reference + pasar refs +
  frase de prompt).
- (Sin cambios de cliente necesarios — el wizard ya encadena los pasos.)

## Riesgos

- **Shape de API incierto** → mitigado por el Paso 0 (medir primero).
- Data URIs grandes en el body → el prompt se corta a 900 chars pero la imagen
  no; verificar que OpenRouter acepta el payload (4K + refs puede ser pesado).
  Si hay límite, considerar pasar URL pública en vez de data URI (requiere que
  R2/CDN sirva la referencia — ver `resolveMediaUrl`).
- El timeout `IMAGE_TIMEOUT_MS` (85s) — con referencias la generación puede
  tardar más; monitorear `ai.tool.failed` por abort.
