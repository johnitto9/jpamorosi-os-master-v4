# 12_PROJECT_BRAND_WORKBENCH

## Objective

Unify Project Room and Branding around one persistent project workspace.

## Project Room Wizard

### Step 1 — Idea
Ask:
- name;
- what are you building;
- short description;
- how should it feel / imagined branding direction.

Avoid technical interrogation.

### Step 2 — Reality / Constraints
Use easy language.

Examples:
- high traffic?
- global/edge speed?
- fluid visual experience?
- data sovereignty?
- mobile first?
- real-time?
- payments?
- automation?
- multiple roles/admin?

### Step 3 — Tech Optional
Prompt:
"Si querés imponer tecnologías, proveedores o restricciones específicas, ponelas acá."

One optional textbox.

### Step 4 — Inferred Identity
Before heavy generation/spinners show:
- 3 inferred colors;
- one short identity summary;
- `Confirmar`
- `Cambiar colores`

Use lightweight inference:
- small model or heuristic + small model;
- strict JSON;
- minimal context;
- cache.

## Shared Brand Foundation Flow

One reusable flow:

1. Palette
2. Logo
3. Reference Image
4. Storyboard

Each step:
- Upload
- Generate
- Skip for now

### Heritage

Logo inherits:
- brief;
- brand vision;
- confirmed palette.

Reference inherits:
- project;
- brand DNA;
- palette;
- logo if available.

Storyboard inherits:
- conversation;
- project;
- palette;
- logo;
- reference;
- confirmed decisions.

## Entry points

Same flow from:
- Project Room after setup;
- Branding with no card/project;
- Branding with existing project;
- Omni after project promotion;
- Admin continuation where allowed.

No duplicate implementations.

## Personalized Project Room reception

After setup, do not show generic suggestions.

Desired:
- project-specific opening;
- project-specific next actions;
- lightweight single inference allowed.

Example:
"Ya capté la vibra: colección argentina, energía popular y un ecommerce que no debería sentirse como merch genérico..."

Actions:
- `Definamos qué hace única la colección`
- `Armemos el recorrido de compra`
- `Diseñemos las pantallas clave`
- `Revisemos el stack propuesto`

## Stack decisions in chat

Orbe may ask focused questions with buttons.

Example:
"¿Qué priorizamos primero?"
- `Soberanía de datos`
- `Latencia global`
- `Costo mínimo`

Selection:
- updates UI;
- persists StackDecision;
- affects future recommendations.

## Card contract

Priority:
1. uploaded logo
2. generated logo
3. derived icon
4. fallback icon/emoji

Card inherits project palette/brand state.

## Acceptance

- Project and Branding update same identity;
- project continues across conversations;
- palette confirmation exists before heavy generation;
- generic Project Room welcome removed;
- no duplicated logo/reference/storyboard logic;
- card reflects persisted brand state.
