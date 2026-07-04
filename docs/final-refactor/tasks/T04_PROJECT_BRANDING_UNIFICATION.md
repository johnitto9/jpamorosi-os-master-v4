# T04_PROJECT_BRANDING_UNIFICATION

## Objective
Create one persistent Project + Brand Foundation flow shared by Project Room, Branding and Omni promotion.

## Read first
- `04_DATA_AND_PERSISTENCE_CONTRACTS.md`
- `specs/12_PROJECT_BRAND_WORKBENCH.md`

## Do
1. Audit current persistence.
2. Reuse structures.
3. Add missing migrations.
4. Implement easy-guide wizard.
5. Add optional tech field.
6. Add inferred 3-color step.
7. Add confirm/change colors.
8. Build shared Brand Foundation Flow:
   - palette
   - logo
   - reference
   - storyboard
9. Connect Project Room, Branding, Omni.
10. Replace generic welcome with project-specific opening.

## Do not
- build parallel flows;
- store durable state only in transcript;
- create incompatible card identity.

## Tests
- create from Project Room;
- continue in Branding;
- continue from Omni;
- reopen session;
- verify same Project and BrandDNA.

## Stop
Report migrations and test evidence.
