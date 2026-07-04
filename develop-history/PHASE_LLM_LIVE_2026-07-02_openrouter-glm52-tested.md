# Change Log: 2026-07-02 — Vía LLM real probada (GLM 5.2 + mockups)

## 1. Configuración
- OPENROUTER_API_KEY tomada de secrets/openrouter-apikey.txt → SOLO a
  frontend-app/.env.local (ignorado por git; valor jamás impreso en logs).
- /api/status confirmó: llm:true (z-ai/glm-5.2), mockups:true, pgvector:true.

## 2. Test E2E de conversación (3 turnos, gasto mínimo)
- T1 (startup logística pregunta por agente WhatsApp): respuesta en español
  con impronta ("cosas que sobreviven a la realidad"), pitch de Delibot
  Tool-First, card de proyecto, UNA pregunta de discovery. 7.1s.
- T2 (Marco de LogiAr, 3000 USD, marco@logiar.com): lead capturado COMPLETO
  (name/company/budget/email/need) → stage=close, score=95 (máquina de
  etapas correcta: need+email→close). Intent contact + CTAs. 3.4s.
- ai_logs: 2 llamadas ok (6070ms / 3291ms). notifyAdmin intentado
  (skipped_no_api_key — falta Resend, esperado).

## 3. generate_mockup: bug de slug encontrado y resuelto
- Primera llamada: modelo pidió la tool, executor corrió, OpenRouter devolvió
  404 → ai.tool.failed registrado y la respuesta SIGUIÓ sin romper
  (degradación limpia verificada de yapa).
- Causa: bytedance-seed/seedream-4.5 NO existe en el catálogo de OpenRouter
  (verificado vía /api/v1/models: ningún "dream"; los bytedance-seed son
  text-only). El seam OPENROUTER_IMAGE_MODEL salvó la arquitectura:
  default y envs cambiados a google/gemini-3.1-flash-lite-image (el image
  model más barato del catálogo). Comentario en env.ts para volver a
  Seedream el día que aparezca.
- Retry: mockup generado (16s), JPEG 1408x768 servido por
  /api/media/sessions/<sid>/ — y PERSONALIZADO: "LogiAr AI Agent Dashboard"
  con cotizaciones y WhatsApp, estética cyan/violeta del sitio. El agente usó
  la memoria del lead para el prompt de imagen.

## 4. Estado
- Chat LLM: PROBADO ✔ · Lead pipeline: PROBADO ✔ · Mockups: PROBADO ✔
- Pendiente: RESEND_API_KEY (los avisos de lead quedan en email_logs),
  R2 creds, WEB_SEARCH_API_KEY (tool oculta hasta entonces).
