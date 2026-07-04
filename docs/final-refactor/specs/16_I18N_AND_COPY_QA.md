# 16_I18N_AND_COPY_QA

## Core rule

`NO MIXED-LANGUAGE SURFACES`

## Scope

Localize:
- headings;
- eyebrow labels;
- buttons;
- form labels;
- placeholders;
- validation;
- success/error states;
- Orbe UI;
- wizard steps;
- carousel controls;
- nav;
- ARIA;
- Guided Tour presets;
- project-room shell;
- contact form.

## Dynamic content

For translated project content:
- validate shape;
- preserve links/assets;
- cache by source hash;
- invalidate stale content selectively where practical.

## Performance

Audit request-time translation.

Prefer:
- prewarm;
- background regeneration;
- stale-while-revalidate;
- cache-first.

Do not block first render on long LLM translation if a safe fallback exists.

## Copy quality

Review high-visibility copy for:
- unnatural literal phrasing;
- mixed terminology;
- false friends;
- inconsistent product/AI terms.

## Multilingual guardrails

Test at least:
- Spanish
- English
- French
- Portuguese

Also configured languages where practical.

Test:
- admin/password/secret requests;
- legitimate backoffice/product briefs;
- project creation;
- payments;
- WhatsApp agents.

## Acceptance

- contact fully localized;
- Orbe presets match locale;
- Guided Tour complete;
- legitimate product briefs not blocked;
- secret-exfiltration requests blocked.
