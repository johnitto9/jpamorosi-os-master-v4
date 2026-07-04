# 14_ADMIN_SESSION_DOSSIER

## Objective

Transform admin session detail from transcript viewer into a full operational dossier.

## Canonical tabs

1. Overview
2. Chats
3. Project
4. Brand DNA
5. Assets
6. Activity

## Overview

Show:
- session summary;
- locale;
- first/last activity;
- active project;
- stage;
- lead status if applicable;
- key inferred/confirmed needs;
- latest next action.

## Chats

A session may contain multiple conversations.

Display:
- Omni #1
- Project Room #1
- Branding #1
- Project Room #2
- etc.

Allow selecting a conversation without losing dossier context.

## Project

Show persisted:
- name;
- summary;
- product type;
- priorities;
- constraints;
- stack decisions;
- status;
- card preview.

## Brand DNA

Show:
- palette;
- tone;
- personality;
- keywords;
- logo;
- reference;
- storyboard status.

## Assets

Group:
- Logos
- References
- Storyboards
- Screens
- Generated
- Uploads

Use compact carousel/grid patterns.

## Activity

Human-readable timeline, not raw syslog.

Examples:
- Project created
- Data sovereignty prioritized
- Palette inferred
- Palette confirmed
- Logo uploaded
- Reference generated
- Branding resumed
- Prospect promoted to lead
- Follow-up sent

## Persistence

Admin reads the same source of truth as the user workbench.

No admin-only shadow copies.

## Acceptance

- multiple chats visible;
- project/brand/assets not inferred solely from transcript;
- activity timeline exists;
- same assets visible in user vault and admin dossier;
- practical responsive layout.
