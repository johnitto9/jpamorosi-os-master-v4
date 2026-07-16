# People-data providers — relevamiento para outreach (2026-07-16)

> Decisión pendiente del usuario. Este doc releva opciones/costos ANTES de
> integrar nada. Frente 3 de la ronda outreach — ver
> `develop-history` / memoria `outreach-starvation-root-cause-2026-07-16`.

## 1. El problema que resolvería

Hoy el scout soberano (searxng + scrape + mx-guess) en el mejor caso llega a un
**buzón de rol** (`info@`, `hello@`) — nunca a un humano con nombre. Eso baja la
tasa de respuesta y quema reputación en inboxes genéricos. Un proveedor de
people-data toma **dominio (+ nombre si lo tenemos del listing)** y devuelve un
**email verificado de una persona concreta**.

### Dónde enchufa (clave para el costo)

No reemplaza al scout: se agrega como **Método D en `deepHarvestContact`**
(`lib/agent/prospects.ts`), DESPUÉS de search-snippet/page-scan y ANTES (o en
lugar) del mx-guess de `info@`. O sea, **sólo se dispara en los dead-ends
residuales** — las cards que hoy quedan sin email (p.ej. Carmatec) o que sólo
consiguen `info@`. Eso es un volumen chico (decenas/mes, no miles), así que:

- **El modelo de facturación importa más que el precio del plan**: pay-per-found
  (no se cobra si no encuentra) es ideal para un uso esporádico y de cola.
- Un plan de entrada de 1.000 créditos/mes sobra con margen enorme.

## 2. Comparativa

| Proveedor | Entrada (API) | Créditos | Facturación | API / DX | Notas para nuestro caso |
|---|---|---|---|---|---|
| **Prospeo** | **US$39/mo** (Basic) | 1.000/mo | Pay-per-found (0 si no hay email); verify 0.5 sólo si VALID; **créditos rollover** | REST limpia, API-first, free 75/mo para probar | Más barato por crédito; rollover perdona meses flojos. Domain search 1 créd → hasta 50 emails |
| **Findymail** | US$49/mo (Basic) | 1.000/mo | **Pay-per-verified** (no cobra dead-ends); verify integrado al query | REST + OpenAPI; ~80% de sus clientes usan API (infra, no dashboard) | Top en cobertura/calidad y "verified-only billing". Muy alineado a integración headless |
| **Hunter.io** | €49 Starter (**API recién en Growth €129/mo**) | 500 / 5.000 | 1 créd por email encontrado; verify 0.5 | API v2 madura, la más conocida | API gateada a plan caro (€129). Overkill de features (campañas/mailboxes) que no usamos |
| **Apollo.io** | US$49/user/mo | Email "ilimitado" (fair-use); **exports/mobile metered** | Suscripción; créditos de export cambian seguido | All-in-one (275M contactos + CRM + outreach) | Plataforma, no infra. Quejas de rate/credit policy. Integración más pesada; duplicaría cosas que ya tenemos |

## 3. Estimación de costo real para ESTE sistema

Con outreach a ~2-4/ciclo y sólo los residuales necesitando enriquecimiento,
el consumo esperado es **decenas de lookups/mes**. Cualquier plan de entrada
(US$39-49) cubre 20-40× ese volumen. Con Prospeo/Findymail (pay-per-found) los
dead-ends **no cuestan crédito**, así que el gasto efectivo tiende al piso del
plan. **Costo realista: US$39-49/mo**, con techo altísimo antes de necesitar upgrade.

## 4. Recomendación

**Prospeo** (o Findymail como alternativa premium por calidad) — pay-per-found,
API-first, REST limpia, plan de entrada barato con rollover. Descartar Hunter
(API gateada a €129) y Apollo (plataforma pesada, metered, duplica infra).

### Sketch de integración (si se aprueba)

1. Método D en `deepHarvestContact`: `POST` al finder con `{domain, firstName?,
   lastName?}` (nombre desde `contactName`/title si existe); devolver
   `{email, method:"people-data"}` sólo si viene **verificado**.
2. Gate por env `PEOPLE_DATA_API_KEY` (degradación: sin key → se salta el método,
   nada se rompe — mismo patrón que `RESEND_API_KEY`).
3. Guardar el secreto en Dokploy env (nunca en Vercel ni en logs — invariante
   de seguridad del harness).
4. `isActionableEmail` sigue siendo el gate final; los emails de persona pasan
   igual y suben calidad sin tocar el resto del pipeline.
5. Riesgo: costo por abuso → cap de lookups/ciclo + sólo para score alto.

## Fuentes

- [Hunter.io pricing](https://hunter.io/pricing) · [Hunter API](https://hunter.io/api-documentation)
- [Findymail — best email finder API](https://www.findymail.com/blog/best-email-finder-api/) · [Findymail pricing](https://prospeo.io/s/findymail-pricing)
- [Prospeo pricing](https://prospeo.io/pricing) · [Prospeo email finder API](https://prospeo.io/s/email-finder-api)
- [Apollo vs Findymail (LeadMagic)](https://leadmagic.io/comparisons/apollo-vs-findymail) · [Apollo vs Findymail (ColdEmailKit)](https://coldemailkit.com/compare/apollo-vs-findymail)
