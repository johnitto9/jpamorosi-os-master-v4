# PHASE: i18n del asistente (greeting + nudges + thinking) — 2026-07-03

## 1. Objetivo

Que **toda** la UI del lab guide respete el idioma elegido, no solo el chrome
del sitio. Hoy los greetings, nudges preset y "thinking" steps estaban
hardcoded en inglés con fallback parcial en español. Resultado: visitante
hispanohablante recibía el chrome traducido pero el bot le hablaba en inglés.

Doc implícito: el handoff `01-BUGFIX-guardrails.md` ya tenía el contexto del
agente; este cambio cierra el ciclo i18n completo.

## 2. Revisión previa

- `lib/i18n/dictionaries.ts` ya tenía `DICTS` (chrome) y `ROOM` (project rooms) en 7 idiomas.
- `lib/i18n/translate.ts` traduce contenido dinámico (projects + capabilities) con cache en Postgres.
- El orchestrator (`lib/agent/orchestrator.ts`) YA recibía `lang` y lo inyectaba al system prompt ("Respond in {lang}").
- El route `/api/assistant` YA leía `lang` del body.
- **El gap**: `AssistantWidget.tsx` (cliente) tenía `THREAD_PROFILES`, `PRESET_NUDGES`, `THINKING_STEPS` como `const` hardcoded en inglés. Mandaba `lang: uiLang()` al body pero `uiLang()` leía cookie en cada fetch (sin re-render del greeting cuando el idioma cambiaba). El greeting se seteaba 1 sola vez al abrir el panel y nunca se actualizaba.

## 3. Cambios aplicados (con paths)

### 3.1 `lib/i18n/dictionaries.ts` — `ASSISTANT` dict

Nuevo export `ASSISTANT: Record<Lang, AssistantDict>` con shape:

```ts
type AssistantDict = {
  threads: {
    omni:    { title, tagline, greeting, suggestions[] };
    project: { title, tagline, greeting, suggestions[] };
    branding:{ title, tagline, greeting, suggestions[] };
  };
  nudges: Array<{ id, text, cta, prompt }>;
  thinking: string[];
};
```

7 idiomas: `en, es, pt, fr, ru, zh, ar`. ~40 strings por idioma × 7 = ~280 entries
nuevas en el dict. Mantiene la paridad con `DICTS` y `ROOM`.

### 3.2 `components/assistant/AssistantWidget.tsx`

- Import: `ASSISTANT, DEFAULT_LANG, LANGS, type Lang`.
- Removidas las constantes hardcoded `TEMPLATES`, `TEMPLATES_ES`, `PRESET_NUDGES`, `THINKING_STEPS`.
- Nueva función `templateFor(kind, lang)` → `{ icon, ...ASSISTANT[lang].threads[kind] }`.
- Nueva función `nudgeQueue(pathname, lang)` → ordena `ASSISTANT[lang].nudges` por path.
- State nuevo `lang: Lang` + `useEffect` que:
  1. Lee la cookie `al_lang` al montar.
  2. Escucha `window.addEventListener("al_lang_change", ...)` para re-leer cuando cambia.
- Reemplazos puntuales en render: `TEMPLATES[k].icon/title/tagline`, `THINKING_STEPS[stepIdx]`, `templateFor(kind).suggestions`, `uiLang() === "es"` → todos pasan por `lang` reactivo.
- El body del POST a `/api/assistant` ahora manda `lang` (state) en vez de `uiLang()` (lectura de cookie fresca). El orchestrator recibe el idioma actual sin esperar al `router.refresh()` del lado servidor.

### 3.3 `components/ui/language-switch.tsx`

- En `pick(l)`: dispara `window.dispatchEvent(new CustomEvent("al_lang_change"))` antes de `router.refresh()`. Cualquier componente que escuche el event re-lee la cookie instantáneamente — el greeting del widget cambia sin esperar el round-trip del server.

## 4. Implicancias técnicas

- **End-to-end**: cambiar idioma en el switch dispara (a) cookie → (b) event custom → (c) widget re-renderiza con nuevo dict → (d) `router.refresh()` para el chrome SSR → (e) próximo POST al agente incluye `lang` → (f) orchestrator system prompt dirige al LLM a responder en ese idioma.
- **Componentes hijos** (`ProjectStrip`, `ProjectSetup`, `BrandingBoard`): siguen recibiendo `es: boolean` derivado (`lang === "es"`). Para una próxima fase conviene migrarlos a `lang: Lang` también — fuera de alcance acá.
- **Cero LLM**: todo el refactor es determinístico (dict lookup). El LLM solo consume el `lang` ya enviado.
- **No regresiones**: typecheck OK, 50/50 tests verdes.

## 5. Testing

```powershell
cd frontend-app
& node_modules\.bin\tsc --noEmit      # TYPECHECK OK
& node_modules\.bin\vitest.cmd run    # 50/50 passed
```

Manual flow:
1. Abrir home → popup del asistente dice "Hey! I'm Juan's lab guide…" (EN).
2. Click en LanguageSwitch → elegir "Español" → cookie `al_lang=es` + event.
3. Sin refrescar: el greeting del panel (si está abierto) debería virar a "¡Hola! Soy el guía…".
4. Escribir un mensaje → el agente responde en español.
5. Cambiar a "中文" → nudges y thinking steps viran a chino, próximo reply en chino.

## 6. Referencias

- `handoff-assistant-v5/README.md` (contexto general)
- `lib/i18n/dictionaries.ts` (DICTS, ROOM, ASSISTANT)
- `lib/agent/orchestrator.ts:148` (ya pasaba `lang` al system prompt)
- `app/api/assistant/route.ts:53` (ya leía `lang` del body)
- `components/assistant/AssistantWidget.tsx` (refactor principal)

## 7. Persistencia (claude_state.json)

`flags.i18n = { assistant_dict: "ASSISTANT", langs: 7, switch_event: "al_lang_change", scope: "chrome+assistant+agent" }`