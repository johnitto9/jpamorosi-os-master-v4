# 05 — Guided tour: cero tokens, guionado, con escape inteligente

## Problema

Hoy, tocar el guided tour que sugiere el popup del bot dispara una llamada al LLM (gasta tokens en algo 100% predecible). Anclas en `AssistantWidget.tsx`: L34 ("Dame el tour guiado"), L95 ("Give me the guided tour"), L142-144 (prompt del Hall of Fame), L552 (`sendAndOpen("Give me the guided tour")` — este es el trigger que hoy va al orchestrator).

## Diseño requerido

- **Respuestas preseteadas ("flama")**: un script determinístico de pasos, sin LLM. Cada paso: mensaje escrito a mano con la voz del bot + cards + acciones + los siguientes botones preseteados. Como un paso-a-paso real: "por acá, por allá" — primero contar un poco de Juan, tirar cards, ir cargando material grueso inicial, con excelente hilvanación entre pasos.
- Implementarlo como estructura de datos (p.ej. `lib/assistant/guided-tour.ts`: árbol/lista de pasos con `message`, `cards`, `actions`, `next[]`), interceptado en el widget o en el route handler ANTES del orchestrator — el request del tour nunca llega al LLM. Reusar el shape `AssistantResponse` para que el render sea idéntico.
- **Inferencia mínima permitida**: dentro del modo guiado puede haber algún punto puntual que sí llame al LLM/web (p.ej. "buscar en la web un poquito cosas de hoy") — explícito, aislado, opcional dentro del guion. Todo lo demás preseteado.
- **Escape limpio**: si en cualquier paso el usuario escribe algo libre (pregunta por un proyecto, un brief, etc.), se sale del guion y se enruta al modo complejo correspondiente (omni/project mode) sin fricción, conservando el contexto de sesión.

## Aceptación
- Iniciar y recorrer el tour completo genera **cero** llamadas al LLM (verificable en `logAiCall` / logs del orchestrator).
- Contenido del tour en ambos idiomas (existen strings ES L34 y EN L95 — respetar i18n existente, `lib/i18n/dictionaries.ts`).
- Escribir texto libre a mitad del tour deriva correctamente al modo inteligente.
