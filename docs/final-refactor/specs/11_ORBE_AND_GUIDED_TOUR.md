# 11_ORBE_AND_GUIDED_TOUR

## Objective

Turn the assistant into a branded intelligence layer and rebuild Guided Tour as a deterministic narrative engine.

## Naming

Public name: `Orbe`

## Two-layer model

### Layer A — Deterministic Tour Engine
- zero LLM calls on standard path;
- preset rich messages;
- preset cards;
- preset actions;
- scroll orchestration;
- visual attention cues;
- state machine;
- locale-aware.

### Layer B — Adaptive Orbe Agent
Use when:
- free-form question;
- specific project question;
- project intent;
- complex comparison/reasoning;
- web/tool use is justified.

## Tour state machine

Suggested:
1. `welcome`
2. `builder_story`
3. `proof_rooms`
4. `portfolio_system`
5. `living_layer`
6. `route_choice`
7. `exit_to_orbe`

Each state defines:
- message;
- cards;
- actions;
- target section;
- optional page effect;
- next states.

## Example core path

### Welcome
"Antes de mostrarte proyectos, hay una forma rápida de entender a Juan..."

Actions:
- `Conocé al constructor`
- `Saltá directo a las pruebas`

### Builder story
- scroll to human interlude;
- show one symbolic card/visual;
- invite continuation.

### Proof
- show Proof Rooms cards;
- actions:
  - `Ver la más viva`
  - `Qué tienen en común`
  - `Seguir el tour`

### Portfolio system
Explain:
"Hay una trampa linda: el portfolio que estás usando también es uno de los sistemas."

### Living layer
Explain that Orbe remembers, connects and can help shape a real project.

### Route choice
- `Estoy contratando`
- `Tengo una idea`
- `Quiero explorar`
- `Preguntar algo libre`

## Token rule

Standard tour path:
- zero LLM calls.

Optional low-cost inference:
- narrow enhancement only;
- must not block tour;
- degrade to preset content.

## Visual behavior

- chat may minimize/expand intentionally;
- launcher can pulse;
- target section can receive subtle highlight;
- page can scroll;
- user keeps control;
- reduced-motion fallback.

## Tests

Required:
- standard tour triggers zero LLM calls;
- state transitions work;
- locale complete;
- exit to adaptive chat works;
- current scroll/deep link does not break flow;
- repeated start resets/resumes predictably.
