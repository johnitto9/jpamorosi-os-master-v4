# PHASE: i18n cleanup — popup/panel/composer + cookie overlap — 2026-07-03

## 1. Objetivo

Cerrar los huecos i18n que quedaron visibles después de la fase anterior:

1. **Popup greeting hardcoded EN** — el popup que aparece abajo del avatar antes
   de abrir el chat mostraba "¡Hola! I'm Juan's lab guide..." en inglés aunque
   el visitante estuviera en PT (screenshot 1).
2. **Panel header + aria-labels hardcoded** — "Lab guide", "online · answers...",
   "Send", "Guide is typing", "Attach an image", etc. todos hardcoded EN/ES.
3. **Overlap cookie consent + popup greeting** — los dos banners podían
   superponerse en pantallas chicas. Solución: el popup greeting salta a
   `top-24` cuando el cookie banner está pendiente.
4. **CookieConsent no notificaba a otros widgets** — al decidir cookies, otros
   componentes (AssistantWidget) no se enteraban.

## 2. Cambios aplicados (con paths)

### 2.1 `lib/i18n/dictionaries.ts` — `AssistantDict` extendido

Tipos nuevos:

```ts
popup: {
  hello, body, ctaPrimary, ctaSecondary,
  dismissPreset, dismissAria, dialogAria,
};
panel: {
  title, tagline, closeAria, openAria,
  launcherOpen, launcherClose, dockAria, messageAria,
  newConversation, typing, removeAttachment, attachImage,
  lockedBody, lockedAction,
};
composer: {
  placeholder, locked, send,
};
```

7 idiomas × 22 keys = 154 strings agregados.

### 2.2 `components/assistant/AssistantWidget.tsx` — wired

Reemplazos puntuales:

| Antes (hardcoded) | Después |
|---|---|
| `¡Hola!` | `ASSISTANT[lang].popup.hello` |
| "I'm Juan's lab guide..." | `popup.body` |
| "Show me around →" | `popup.ctaPrimary` |
| "I'll ask my own" | `popup.ctaSecondary` |
| "Not now" | `popup.dismissPreset` |
| `aria-label="Assistant greeting"` | `popup.dialogAria` |
| `aria-label="Dismiss greeting"` | `popup.dismissAria` |
| `aria-label="Open/Close lab guide"` | `panel.launcherOpen/Close` |
| `<p>Lab guide</p>` | `panel.title` |
| "online · answers from Juan's real work" | `panel.tagline` |
| `aria-label="Close chat"` | `panel.closeAria` |
| `aria-label="Amorosi Labs guide"` | `panel.dockAria` |
| `aria-label="Message the lab guide"` | `panel.messageAria` |
| `aria-label="New conversation"` | `panel.newConversation` |
| `aria-label="Guide is typing"` | `panel.typing` |
| `aria-label="Attach an image"` | `panel.attachImage` |
| `aria-label="Remove attachment"` | `panel.removeAttachment` |
| "Ask anything about Juan's work…" | `composer.placeholder` |
| "Foundations first…" | `composer.locked` |
| `Send` (button) | `composer.send` |
| "Pin a project above…" / "Elegí un proyecto…" | `panel.lockedBody` (7 idiomas) |

### 2.3 Overlap cookie consent ↔ popup greeting

Nuevo state `needsConsentTopUp` en `AssistantWidget`:

```ts
const [needsConsentTopUp, setNeedsConsentTopUp] = useState(true);
useEffect(() => {
  const check = () => {
    try {
      setNeedsConsentTopUp(localStorage.getItem("al_consent") === null);
    } catch { setNeedsConsentTopUp(false); }
  };
  check();
  const onChange = () => check();
  window.addEventListener("al_consent_change", onChange);
  return () => window.removeEventListener("al_consent_change", onChange);
}, []);
```

El popup greeting cambia de posición según el state:

```tsx
className={`fixed inset-x-3 z-[120] … ${
  needsConsentTopUp ? "top-24" : "bottom-24"
}`}
```

Cuando cookie pendiente → popup arriba. Cuando cookie decidido → popup abajo.

### 2.4 `components/CookieConsent.tsx` — emite event

`decide(personalization)` ahora dispara `window.dispatchEvent(new CustomEvent("al_consent_change"))` además de `saveConsent` + `setVisible(false)`. El AssistantWidget escucha y baja el popup.

## 3. Implicancias técnicas

- **End-to-end**:
  1. Cookie consent visible → popup greeting arriba (top-24).
  2. Visitor decide cookies → event `al_consent_change` → popup baja a bottom-24.
  3. Visitor cambia idioma → event `al_lang_change` → popup greeting traduce.
- **No regressions**: typecheck OK, 50/50 tests verdes.
- **Cero LLM**: todo determinístico.
- **Nota sobre el bug del "project room creado en Ruso"**: los nombres de proyecto
  en `session_projects.name` son dato, no UI. Si el visitante escribió "Проект"
  en Ruso, queda como "Проект" en la DB. Eso es correcto (la identidad del
  proyecto es del visitante, no del sitio).

## 4. Testing

```powershell
& node_modules\.bin\tsc --noEmit      # OK
& node_modules\.bin\vitest.cmd run    # 50/50 passed
```

Manual flow:
1. Primera visita (cookie pendiente) → popup greeting en `top-24`, no se solapa.
2. Decidir cookies → popup baja a `bottom-24`.
3. Cambiar idioma → popup greeting se traduce instantáneamente.

## 5. Referencias

- `handoff-assistant-v5/`
- `lib/i18n/dictionaries.ts` (ASSISTANT con popup/panel/composer)
- `components/assistant/AssistantWidget.tsx` (wire-up + overlap)
- `components/CookieConsent.tsx` (event emitter)

## 6. Persistencia

`flags.i18n.dicts += "ASSISTANT.popup+panel+composer (22 keys × 7 langs)"`