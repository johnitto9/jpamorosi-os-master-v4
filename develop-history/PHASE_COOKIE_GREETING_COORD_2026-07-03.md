# PHASE: Cookie + greeting coord in real time — 2026-07-03

## 1. Objetivo

Resolver el overlap cookie consent ↔ popup greeting de forma **cohesiva y
reactiva** (no "uno se va arriba, otro se queda abajo" — eso se ve
desconectado). El popup greeting ahora **mide la posición real del cookie
banner en tiempo real** y se ancla 12px arriba con transición CSS suave.

## 2. Cambios

### 2.1 `components/CookieConsent.tsx` — anchor identificable

`<motion.div>` raíz ahora lleva `data-cookie-banner`. El AssistantWidget lo
query-selecciona y mide su `getBoundingClientRect()`.

### 2.2 `components/assistant/AssistantWidget.tsx` — medición reactiva

```ts
const [cookieBannerOffset, setCookieBannerOffset] = useState(0);
useEffect(() => {
  const measure = () => {
    const el = document.querySelector<HTMLElement>("[data-cookie-banner]");
    if (!el) { setCookieBannerOffset(0); return; }
    const rect = el.getBoundingClientRect();
    const dist = Math.max(0, window.innerHeight - rect.top + 12);
    setCookieBannerOffset(dist);
  };
  // triggers: mount, al_consent_change, resize, scroll, ResizeObserver
  //   (catches text reflow inside the banner — lang switch etc.)
  measure();
  window.addEventListener("al_consent_change", measure);
  window.addEventListener("resize", measure);
  window.addEventListener("scroll", measure, true);
  const ro = new ResizeObserver(measure);
  ro.observe(banner);
  return () => { … cleanup … };
}, []);
```

El popup greeting cambia su `bottom` en tiempo real:

```tsx
style={{
  bottom: needsConsentTopUp && cookieBannerOffset > 0
    ? `${cookieBannerOffset}px`
    : "6rem", // bottom-24
}}
```

Con `transition-[bottom] duration-300 ease-out` el movimiento es animado.
Si el cookie banner cambia de tamaño (reflow al cambiar idioma), el popup
se reposiciona suavemente sin saltos.

### 2.3 Estilo unificado — familia visual

Antes el popup greeting tenía `rounded-3xl bg-white/10` (look "tarjeta
diferente"). Ahora comparte con el cookie:

- `rounded-2xl` (en lugar de `rounded-3xl`)
- `bg-white/[0.08]` (en lugar de `bg-white/10`)
- `border border-white/20` (igual)
- `shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_80px-...]` (igual)
- `backdrop-blur-2xl` (igual)
- `max-w-xl` (en lugar de `420px`) — mismo ancho que el cookie

Resultado: ambos se leen como **misma familia de banner** en el bottom.

## 3. Implicancias técnicas

- **Live tracking**: ResizeObserver detecta reflow interno del banner
  (cuando cambia el idioma, el texto se hace más largo o más corto, y el
  popup greeting se reposiciona al toque).
- **Cero layout shift perceptible**: la transición `duration-300 ease-out`
  en `bottom` suaviza cualquier movimiento.
- **Sin DOM coupling frágil**: solo `[data-cookie-banner]` como contrato.
- **No regressions**: typecheck OK, 50/50 tests verdes.

## 4. Validación visual (playwright)

Tres screenshots de prueba:

1. **Estado limpio** (cookie aceptado, popup greeting cerrado): sin overlap, todo normal.
2. **Popup greeting solo**: aparece bottom-24 al lado del avatar.
3. **Ambos visibles**: popup greeting anclado 12px arriba del cookie,
   misma estética glass, transición suave entre estados.

## 5. Referencias

- `components/CookieConsent.tsx` (`data-cookie-banner`)
- `components/assistant/AssistantWidget.tsx` (medición + estilo)
- `develop-history/PHASE_I18N_OVERLAP_2026-07-03.md` (fase anterior)