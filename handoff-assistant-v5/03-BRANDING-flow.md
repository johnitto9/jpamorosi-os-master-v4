# 03 — Flujo de branding progresivo (logo → imagen → storyboard)

Base existente: `AssistantProjectOrbit.tsx` → `BrandingBoard` (L11: paleta, logo slot, "generate visual concept" vía Seedream). Hay vínculo de colores entre project room y branding. **Hay base; falta funcionalidad y pulido.**

## Lógica central

A medida que la conversación avanza (desde omni, project room o branding — los tres deben converger), el agente propone en el momento natural, siempre opcional, siempre "subí o generemos":

1. **Logo** ("aunque sea de referencia") → va a un **apartado especial de logo** en el board, no como mensaje suelto del chat.
2. **Imagen representativa** de la marca/producto → su apartado.
3. **Storyboard de la marca** → se genera alimentado por: logo + imagen anteriores + indicaciones del step 1 + suposiciones/estimaciones que surjan de lo hablado en el chat.

## Extracción de paleta

De cada asset subido o generado se extrae la paleta dominante (client-side con canvas o server-side; elegir una vía y documentar) y se actualiza el ADN del proyecto — la paleta deja de ser el placeholder cian/violeta y pasa a ser la real. La paleta alimenta: card, BrandingBoard, y los prompts de generación posteriores.

## UX del chat

- Los assets NO se pierden en el scroll del chat: viven en el board/pestaña de branding del proyecto (el "apartado especial de la UX del chat" que pide el usuario).
- El chat referencia y linkea al board ("listo, lo sumé a tu branding →").
- Restricción técnica vigente: `enforceResponse` (guardrails.ts:94) solo permite cards de imagen bajo `/api/media/` — los assets generados/subidos deben servirse desde ahí.

## Aceptación
- Progresión logo→imagen→storyboard funciona desde los tres puntos de entrada.
- Storyboard demostrablemente usa los assets previos + contexto conversado.
- Paleta real extraída y propagada a card + board + prompts.
- Nada bloqueante: saltear cualquier asset no rompe el flujo.
