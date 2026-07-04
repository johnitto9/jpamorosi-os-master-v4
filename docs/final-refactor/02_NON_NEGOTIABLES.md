# 02_NON_NEGOTIABLES — Hard Boundaries

## Product

- Do not redesign the whole site from scratch.
- Do not convert the visual language into generic SaaS UI.
- Preserve the cosmic/noir/cyan-violet identity.
- Preserve `/os`.
- Preserve project-room identity and project-specific color signatures.
- Do not add homepage sections outside the approved narrative.
- Do not reorder the canonical homepage without explicit approval.
- Do not merge Proof Rooms, Systems in Orbit and Lab Fragments into one grid.

## Architecture

- Do not create a second independent branding pipeline.
- Do not create a second independent project-asset model.
- Do not create a second assistant brain for Guided Tour.
- Do not duplicate persisted project identity between client-only state and database truth.
- Prefer shared contracts and reusable flows.

## Project / Branding

- Project and Branding share one Brand Foundation Flow.
- A project card represents both product identity and brand foundation.
- Important project state must persist.
- Nothing important may exist only in chat.
- Palette, logo, reference, storyboard, screens and stack decisions must be structured state.

## Guided Tour

- Standard Guided Tour path must not call an LLM.
- Guided Tour must be deterministic, rich, visual and stateful.
- It must allow seamless exit to adaptive Orbe behavior.
- It must not be reduced to showing project cards.

## Visual generation

- Never generate before declaring purpose.
- Build a Visual Coverage Plan first.
- Maximum default visual set: 9 images/screens unless explicitly justified.
- Outputs must inherit prior project/brand context.
- One-off generic concept images are not the default success state.

## i18n

- No mixed-language surfaces.
- Labels, placeholders, errors, buttons, helper text and ARIA must respect locale.
- Dynamic content must fail gracefully if translation is missing.

## Security

- No public Postgres port in production.
- No unnecessary raw backend ports exposed publicly.
- Admin must have defense in depth.
- Public LLM context must never contain secrets.
- Uploads must be validated server-side.
- Internal/cron APIs must be authenticated.
- Health endpoints must not leak unnecessary dependency detail.

## Framework/dependency safety

- No Tailwind major migration unless explicitly approved.
- No large component rewrite merely because a component is long.
- No dependency churn without demonstrated need.
- Reuse current Embla/carousel patterns where practical.
