# 02_ENFOQUE_ONTOLOGICO.md — Ontological Focus

## Purpose
Define what the portfolio *is*, so the code does not drift into random UI decoration.

## Core Ontology

Amorosi Labs is a **proof museum**.

Each project is not just a card. It is an artifact proving a capability.

```txt
Project → Proof → Capability → Hiring Signal
```

## Top-Level Entities

### Lab
The umbrella identity. It contains all systems, artifacts, experiments, and public proof.

### Hall of Fame
The highest tier. Only projects that prove a major hiring thesis belong here.

Current Hall of Fame:

1. **LumenScript** — proves advanced AI orchestration.
2. **BBN** — proves lightweight AI agents in production.
3. **BuenPick** — proves live product/startup execution.

### Featured System
Important project, but not full museum room unless promoted.

Examples:

- Delify.
- Delibot.
- Trading Ecosystem.
- RecApp Azure.
- Legal Agentic System.
- Local AI Lab.

### Archive Artifact
Smaller build, script, audiovisual experiment, prototype, or research fragment.

## Project Tier Logic

### `hall_of_fame`
Use when the project proves at least one of these:

- Live product with real users, merchants, or production constraints.
- Advanced AI architecture beyond prompting.
- Production automation with real cost/reliability constraints.
- Strong strategic signal for AI Product Engineer / Systems Architect roles.

### `featured`
Use when the project is substantial but not the main story.

### `archive`
Use when the project is useful as evidence but should not compete visually with flagship work.

## Hiring Narrative

The site must support this thesis:

```txt
Juan builds AI systems with product instincts.
```

Expanded:

```txt
He can design AI architecture, ship full-stack products, work under real constraints, and translate messy founder problems into usable systems.
```

## Capability Mapping

Replace skill bars with proof-backed capabilities:

```txt
Multi-model orchestration → LumenScript
Agent workflows → BBN, LumenScript
Cost-efficient AI architecture → BBN
Marketplace/product execution → BuenPick
Full-stack engineering → BuenPick, BBN
Founder execution → BuenPick, Delify
RAG / memory / reranking → LumenScript, Delibot
Infrastructure/deployment → BBN, BuenPick, Delibot
```

## Visual Ontology

Each Hall of Fame project has:

```txt
Scene background
Light / glow
Logo
Hero image
Proof cards
Architecture preview
Evidence wall
Founder note
CTA
```

Featured systems have compact trophy cards.
Archive items have dense lab-shelf cards.

## Forbidden Modes

- Do not make this a generic SaaS landing.
- Do not make it a pure cyberpunk toy.
- Do not let the OS metaphor dominate the hiring story.
- Do not present unfinished experiments as equal to live systems.
- Do not use fake metrics.

## Tone

High-signal. Premium. Slightly weird. Technically grounded.

No corporate soup.
No fake guru energy.
No “AI ninja” nonsense.
