# 13_VISUAL_PLANNER_AND_ASSET_VAULT

## Objective

Replace generic one-off image generation with purpose-driven visual planning and a persistent asset vault.

## Core rule

`PLAN FIRST → GENERATE SECOND`

Before generating a visual collection, create a `VisualCoveragePlan`.

## Visual Coverage Plan

Determine:
- product type;
- surfaces;
- user journey;
- devices;
- screens needed to explain the product.

Example:

Project: La Scaloneta  
Type: responsive ecommerce

Plan:
1. Flat UX reference — Home
2. Mobile browsing
3. Desktop home in laptop
4. Product detail
5. Collector profile

Reason:
Shows discovery → evaluation → purchase → identity.

Default max:
- 9 items.

User actions:
- Generate all
- Edit plan
- Generate selected item only

## Coherence

Generated visuals inherit:
- project brief;
- confirmed palette;
- logo;
- reference;
- storyboard;
- previous approved screens.

Avoid:
- unrelated visual universes;
- random concept art;
- mobile/desktop conflict.

## Asset Vault

In project/branding contexts add an optional right-side panel.

Suggested sections:
- Overview
- Palette
- Stack
- Logo
- Reference
- Storyboard
- Screens
- Activity

Panel:
- auto-opens when meaningful artifacts appear;
- hides with one click;
- may persist open/closed preference.

## Asset presentation

Do not let images dominate chat height.

In chat:
- compact thumbnail;
- title/role;
- `Abrir`;
- `Guardar como referencia`;
- `Variantes`.

On click:
- lightbox;
- zoom;
- metadata;
- asset role;
- regenerate/variant where allowed.

## Multiple assets

Reuse Embla/current carousel patterns.

Use for:
- logo variants;
- references;
- storyboard;
- screens;
- generated collections.

## Asset roles

Every asset has declared role:
- `logo`
- `reference`
- `storyboard`
- `screen:home`
- `screen:product-detail`
- `screen:mobile`
- `screen:desktop`
- `campaign`

## Acceptance

- no generic full-width image dump in chat;
- assets persist outside transcript;
- collections have a plan;
- previous assets influence later generation;
- admin sees same assets;
- max 9 default respected.
