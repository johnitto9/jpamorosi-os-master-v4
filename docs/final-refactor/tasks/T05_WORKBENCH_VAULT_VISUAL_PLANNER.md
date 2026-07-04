# T05_WORKBENCH_VAULT_VISUAL_PLANNER

## Objective
Add Project DNA side panel, persistent asset vault and purpose-driven visual generation.

## Read first
- `specs/13_VISUAL_PLANNER_AND_ASSET_VAULT.md`

## Do
1. Add collapsible right panel.
2. Sections:
   - Overview
   - Palette
   - Stack
   - Logo
   - Reference
   - Storyboard
   - Screens
   - Activity
3. Auto-open on first meaningful artifact.
4. Build compact chat thumbnails.
5. Add lightbox.
6. Reuse Embla/current carousels.
7. Implement VisualCoveragePlan.
8. Require plan before multi-image generation.
9. Cap default at 9.
10. Persist asset roles/inheritance.

## Tests
- upload logo;
- generate reference;
- generate storyboard;
- create 5-item plan;
- reopen session;
- verify persistence.

## Stop
Report UX screenshots and persistence evidence.
