# PHASE: i18n polish — wizard + cookie + greeting reset + IP coverage — 2026-07-03

## 1. Objetivo

Cerrar los huecos i18n que quedaron tras la fase anterior:

1. **Wizard hardcoded EN/ES** (ProjectStrip, ProjectSetup, BrandingBoard) — visitor en Ruso veía todo en inglés (screenshot confirmado).
2. **Cookie consent hardcoded EN** — el popup tampoco seguía el idioma del switch.
3. **Greeting preset stale** — si el visitante abría el chat, recibía el greeting en el idioma original; al cambiar idioma, el greeting quedaba en el viejo.
4. **IP→lang coverage** ampliada (LatAm completo, Maghreb, post-soviéticos, diásporas).

## 2. Revisión previa

- `AssistantProjectOrbit.tsx`: todos los strings pasaban por `es ? "..." : "..."` — los 5 idiomas no-EN quedaban con fallback inglés.
- `CookieConsent.tsx`: copy 100% hardcoded en inglés.
- `AssistantWidget.tsx`: greeting se seteaba una vez al abrir el panel con `turns` vacío, sin re-render al cambiar idioma.
- `lib/i18n/server.ts:getLang()`: `COUNTRY_TO_LANG` corto (24 países), faltaban diásporas.

## 3. Cambios aplicados (con paths)

### 3.1 `lib/i18n/dictionaries.ts` — `WIZARD` + `COOKIE`

Dos dicts nuevos, 7 idiomas cada uno (~270 entradas).

**`WIZARD: Record<Lang, WizardDict>`** — todos los strings del wizard:
- chrome del strip: `stripActive`, `stripNew`, `stripMulti`
- header del setup: `headerTitle`, `headerSub`, `failed`
- 6 placeholders (`phName`, `phPitch`, `adnPlaceholder`, `devPlaceholder`, `visionPh`)
- hints por step (`pitchHint`, `adnHint`, `devHint`, `needsHint`, `visionHint`)
- controles: `next`, `back`, `skip`, `cancel`, `create`, `generate`
- `foundationSteps: string[]` (4 líneas del theater)
- `stepTitles: string[]` (6 títulos)
- `buildTitle: (name) => string` — incluye el nombre interpolado

**`COOKIE: Record<Lang, CookieDict>`** — strings del popup de consentimiento (title, bodyLead, bodyMid, bodyTail, highlight, reject, accept).

### 3.2 `components/assistant/AssistantProjectOrbit.tsx` — refactor total

- Signature: `es: boolean` → `lang: Lang` en `ProjectStrip`, `ProjectSetup`, `BrandingBoard`.
- `BUSINESS_NEEDS`: shape `{id, icon, es, en}` → `{id, icon, labels: Record<Lang, string>}` — soporta los 7 idiomas.
- `KIND_META`: ahora solo `icon` (sin `label`) — labels van en `KIND_META_LABELS[lang][kind]` (definido en el mismo archivo). Mantiene el `kind` canónico desacoplado del idioma visible.
- `templateFor` reemplazado por acceso directo a `WIZARD[lang].*`.
- `BrandingBoard.onGenerate`: prompt generado con `generatePrompt(name, lang)` para los 7 idiomas.
- `readLang()` helper interno: lee `al_lang` cookie con fallback a `DEFAULT_LANG`. Útil para callers que aún no propagan `lang`.

### 3.3 `components/CookieConsent.tsx` — refactor

- Lee cookie `al_lang` + escucha `al_lang_change` (mismo patrón que el widget).
- Popup renderiza desde `COOKIE[lang]` (title, body, reject, accept).
- El `highlight` se inyecta inline con `<span class="text-cyan-300">` para mantener el énfasis visual.

### 3.4 `components/assistant/AssistantWidget.tsx` — greeting reset

- useEffect nuevo dependiente de `lang`: si `turns[0]` es un greeting preset (matches uno de los 7 greetings del `kind` actual), lo reemplaza por el del nuevo idioma. Heurística: `first.role === "assistant"` AND `first.content` matchea algún `templateFor(kind, l).greeting` (cualquier `l`).
- Esto cubre los 3 kinds × 7 idiomas = 21 greetings. Si no matchea ninguno, no es greeting, no se toca.

### 3.5 `AssistantWidget.tsx` — padres pasan `lang`

- `ProjectStrip`, `ProjectSetup`, `BrandingBoard` ahora reciben `lang={lang}` (state) en vez de `es={lang === "es"}` (boolean derivado).

### 3.6 `lib/i18n/server.ts` — IP coverage ampliada

`COUNTRY_TO_LANG` pasó de 24 → 60+ países:

| Lang   | Agregados |
|--------|-----------|
| `es`   | CR, CU, DO, GT, HN, NI, PA, PR, SV (Centroamérica + Caribe) |
| `pt`   | AO, MZ (PALOP) |
| `fr`   | LU, MC |
| `ru`   | AM, AZ, GE, KG, MD, TJ, TM, UA, UZ (post-soviéticos) |
| `zh`   | MO |
| `ar`   | BH, DZ, IQ, LB, LY, MR, OM, PS, SD, SY, TN, YE (Maghreb + Golfo + Levante) |

Lógica de fallback intacta: cookie gana sobre IP, IP gana sobre Accept-Language, Accept-Language gana sobre EN.

## 4. Implicancias técnicas

- **End-to-end**: cambiar idioma en el switch dispara cookie → event `al_lang_change` → wizard, cookie popup y greeting preset re-renderizan en el nuevo idioma → próximo POST al agente lleva `lang` → orchestrator system prompt dirige al LLM.
- **Cero LLM**: todo el refactor es determinístico (dict lookup + cookie read).
- **Performance**: el bundle del cliente crece ~10KB (WIZARD + COOKIE en 7 idiomas); sin dynamic imports aún, todo va en el bundle principal.
- **No regresiones**: typecheck OK, 50/50 tests verdes.

## 5. Testing

```powershell
cd frontend-app
& node_modules\.bin\tsc --noEmit      # TYPECHECK OK
& node_modules\.bin\vitest.cmd run    # 50/50 passed
```

Manual flow (con browser en ruso):
1. Home → popup de cookies debería estar en ruso.
2. Click en LanguageSwitch → Русский → todos los popups viran al toque.
3. Abrir Lab guide → tab "Проектная комната" (ya estaba traducido).
4. Click `+` → wizard "🚀 Фундамент вашего проекта" + "Как называется?" + "Дальше →" — todo en ruso (screenshot anterior mostraba todo en inglés — bug fixed).
5. Cambiar a 中文 en el switch → wizard vira a chino en vivo.

## 6. Referencias

- `handoff-assistant-v5/` (contexto general)
- `lib/i18n/dictionaries.ts` (DICTS, ROOM, ASSISTANT, WIZARD, COOKIE)
- `lib/i18n/server.ts` (getLang con IP coverage ampliada)
- `lib/agent/orchestrator.ts` (ya usaba `lang`)
- `app/api/assistant/route.ts` (ya leía `lang` del body)
- `components/assistant/AssistantProjectOrbit.tsx` (refactor principal)
- `components/CookieConsent.tsx` (refactor)
- `components/assistant/AssistantWidget.tsx` (greeting reset)

## 7. Persistencia (claude_state.json)

`flags.i18n = { dicts: ["DICTS", "ROOM", "ASSISTANT", "WIZARD", "COOKIE"], langs: 7, switch_event: "al_lang_change", ip_coverage: 60+ }`