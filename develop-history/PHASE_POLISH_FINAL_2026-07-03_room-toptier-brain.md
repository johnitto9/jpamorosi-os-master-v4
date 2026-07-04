# Change Log: 2026-07-03 — Pulida final: room top-tier + cerebro constitucional

## Front (rooms)
- ProjectHero: foto de portada y hero-card flotante ELIMINADAS (abría muy
  cargada); una columna limpia, glow del proyecto + partículas + watermark.
- Aurora de la room: SOLO tonos del proyecto (antes mezclaba cyan/violeta de
  la home). Home intacta.
- Logos: SmartImage con fit="contain" — el logo siempre completa su área
  (hero 64px con padding, HallOfFameCard 28px, banda store).
- Botones premium: components/ui/store-badges.tsx — GooglePlayBadge y
  AppStoreBadge con look oficial (triángulo Play multicolor y manzana en SVG
  inline), LinkPill (Globe/Play/GitHub mark de lucide) para website/demo/
  source. Aplicados en hero Y en ProjectLinksBlock.
- ProjectLinksBlock 2.0: banda de distribución estilo store ("BuenPick — in
  your pocket": ícono + one-liner + badges) cuando hay Play/App Store.
- Stack visual: components/ui/tech-badge.tsx — chips con marcas REALES
  (simple-icons server-side, mapa label→ícono con fallback limpio).
- Architecture 2.0: nodos = tiles con ícono lucide por keyword sobre grid
  blueprint tenue; flow = pipeline numerado con conectores degradé.
- FlipCards (ui/flip-card.tsx): highlights de "Why this matters" y "From the
  builder" se dan vuelta al click/tap → punchline + CTA verificable (Try it
  live / Get the app / Read the code, según links reales) + CONFETTI dentro
  de la card. Accesible (button semantics).
- EvidenceWall: con >3 screenshots monta CardCarousel infinito (misma
  disposición/estética, 1/2/3 por vista); admin ya soporta N imágenes.
- HolographicCard: tilt también en MOBILE — touchstart/move aplican la misma
  matemática del mouse mientras se mantiene tocada (passive, no rompe scroll).
- Chat: data-lenis-prevent en el transcript — la rueda sobre el chat abierto
  scrollea el chat, no el fondo.

## Datos reales
- Stacks corregidos (seed + dev live store): LumenScript (Next/React/TS/
  OpenRouter/Drizzle/PG/Redis/BullMQ/MinIO/Docker), BuenPick (Fastify/Prisma/
  MercadoPago/Resend/R2/Capacitor…), BBN (Strapi/FastAPI/OpenRouter/R2…),
  Delibot (FastAPI/Baileys/ChromaDB/Redis…). El backend Docker conserva su
  volumen — re-guardar desde admin o reseed si se quiere ahí.

## Cerebro (playbooks.ts personaBlock reescrito)
- Constitución + identidad "interfaz curatorial, NO Juan" + prioridades 1-7
  + anti-humo duro (regla nuclear: mejor menos impresionante que poco
  confiable) + auto-crítica (fortaleza→riesgo) + INTENT ROUTER (recruiter
  <120 palabras / founder-investor tesis / dev seco / cliente / explorador /
  escéptico) + fichas de evidencia core (BuenPick/BBN/Delibot/LumenScript
  con limitaciones reconocidas) + tono con filo + límites de seguridad.
- Widget: pasos de "pensamiento" bajo los puntitos (Leyendo → Revisando →
  Cruzando evidencia → Armando) — la respuesta se siente proceso.
- Scout: cada 3 días (dayOfYear % 3) en el worker; hora configurable.

## Testing
- tsc limpio; vitest 42/42 (test de persona actualizado a la constitución).
- /projects/buenpick SSR: badges Play (hero+banda), stacks reales, 5 flips.

## Pendiente (próxima fase, acordado)
- i18n switch multi-idioma; tabs/conversaciones del chat (4-5, templates
  omni/proyecto/branding); identidad loginless 3 patas + recovery por magic
  link; kanban admin + email-marketing matching por link; embeddings CPU +
  reranker (evaluar @xenova/transformers) sobre memory_items.
