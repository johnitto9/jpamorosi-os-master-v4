# Change Log: 2026-07-02 — Fix chat colgado + magic link real por Resend

## 1. Bug: chat con 3 puntitos eternos, send bloqueado
- Causa raíz (AssistantWidget): el efecto del saludo seteaba `greeted=true`
  DENTRO del efecto → cambiaban sus propias deps → React corría el cleanup
  ANTES de que el setTimeout de 900ms disparara → `loading` quedaba true
  para siempre y `send()` retornaba temprano (composer muerto).
- Fix: efecto sin gate de estado interno (solo `open` + transcript vacío),
  set de turns con guard `prev.length>0` y cleanup que SIEMPRE resetea
  loading. Estado `greeted` eliminado. Requiere refresh de la página.
- El "avión de papel" en el botón Send: no existe en nuestro código —
  traductor del navegador o extensión.

## 2. Magic link: nunca salió el email
- Causa 1: RESEND_API_KEY no estaba en .env.local (solo se había cargado
  OpenRouter) → email_logs: skipped_no_api_key. Cargada desde secrets/.
- Causa 2 (descubierta al probar): Resend en MODO TEST solo entrega a la
  dirección de la cuenta Resend = amorosijp@gmail.com (no jpamorosi14).
- Fix: ADMIN_EMAIL ahora acepta lista separada por comas
  (jpamorosi14@gmail.com,amorosijp@gmail.com) y RESEND_ADMIN_TO_EMAIL local
  apunta a amorosijp@gmail.com hasta verificar dominio.
- VERIFICADO: magic_link enviado ok=true con provider_id de Resend.

## 3. Contraseña admin
- ADMIN_PASSWORD_HASH (scrypt) existe en .env.local/.env.docker.local — no
  recuperable por diseño. Reset: node scripts/generate-admin-hash.mjs "pass".
- Camino principal: magic link (ya funcional a amorosijp@gmail.com).

## 4. Para usar jpamorosi14@gmail.com como receptor
1. Verificar dominio en resend.com/domains (ej. jpamorosi.dev — la zona ya
   está en Cloudflare; son 2-3 registros DNS).
2. RESEND_FROM_EMAIL=login@jpamorosi.dev (o similar).
3. Revertir RESEND_ADMIN_TO_EMAIL a jpamorosi14@gmail.com.

## 5. UPDATE (mismo día): dominio verificado + templates brandeados
- jpamorosi.dev verificado en Resend (región sa-east-1) por el usuario.
- RESEND_FROM_EMAIL="Amorosi Labs <labs@jpamorosi.dev>" y
  RESEND_ADMIN_TO_EMAIL de vuelta a jpamorosi14@gmail.com.
- Templates rediseñados (shell noir-cyber): wordmark mono cyan, barra de
  energía gradiente cyan→violeta, glass card, botón gradiente, footer con
  tagline; filas de datos con border-left cyan. Accents por template:
  lead_received violeta, admin_alert ámbar. Inline styles email-safe.
- VERIFICADO: magic_link y lead_received enviados ok=true (provider_id) a
  jpamorosi14@gmail.com desde el dominio propio.
