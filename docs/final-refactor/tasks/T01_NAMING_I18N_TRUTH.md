# T01_NAMING_I18N_TRUTH

## Objective
Introduce Orbe/public naming without breaking internal IDs. Fix mixed-language high-impact surfaces.

## Read first
- `03_PRODUCT_NARRATIVE_AND_NAMING.md`
- `specs/16_I18N_AND_COPY_QA.md`

## Do
1. Replace visible "Guía de lab" with `Orbe`.
2. Add localized descriptor.
3. Change public labels:
   - Proof Rooms
   - Systems in Orbit
   - Lab Fragments
   - Open Channel
4. Preserve internal IDs.
5. Fix Contact labels/placeholders/buttons.
6. Audit assistant presets.
7. Audit ARIA/form states.

## Do not
- rename DB tier IDs;
- migrate categories without need;
- rewrite all copy globally.

## Acceptance
- Orbe consistent;
- no mixed-language contact surface;
- public labels updated;
- internal IDs stable.

## Stop
Report changed files and missing copy review.
