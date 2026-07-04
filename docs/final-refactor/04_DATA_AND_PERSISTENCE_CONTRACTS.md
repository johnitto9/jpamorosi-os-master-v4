# 04_DATA_AND_PERSISTENCE_CONTRACTS

## Goal

Unify Project Room, Branding, Omni promotion, project cards, assets, admin dossier and continuation around one persistent model.

## Core entities

### Session
- anonymous/loginless identity
- locale
- created/updated timestamps
- active project context
- consent state where applicable

### Conversation
A session may have multiple conversations.

Suggested:
- id
- sessionId
- mode: `omni | project | branding | guided`
- title
- createdAt
- updatedAt

### Project
Central persistent object.

Suggested:
- id
- sessionId
- title
- summary
- problem
- audience
- productType
- status
- brandVision
- architecturePriorities
- createdAt
- updatedAt

### ProjectCard
Derives from project + brand DNA.

Suggested:
- projectId
- title
- subtitle
- status
- primaryAssetId?
- logoAssetId?
- fallbackIcon?
- publicVisibility?
- updatedAt

### BrandDNA
One per project.

Suggested:
- projectId
- personality
- tone
- keywords[]
- do[]
- dont[]
- palette[]
- visualDirection
- updatedAt

### Palette
Minimum:
- 3 initial colors;
- source: `ai | uploaded_asset | user`;
- confirmedAt;
- version.

### Asset
All generated/uploaded visuals use one contract.

Suggested:
- id
- projectId
- type: `logo | reference | storyboard | screen | campaign | other`
- source: `upload | generated`
- storageUrl/key
- mimeType
- width
- height
- promptSummary?
- parentAssetIds[]
- status
- createdAt

### VisualPlan
Declared plan before multi-image generation.

Suggested:
- id
- projectId
- productSurface
- items[]
- maxItems
- rationale
- approvedAt?
- createdAt

Each item:
- role
- deviceContext?
- screenPurpose
- description
- inheritsFromAssetIds[]

### StackDecision
Suggested:
- id
- projectId
- category
- option
- reason
- source: `user | ai | inferred`
- confidence?
- confirmedAt?

### ActivityEvent
Human-readable operational timeline.

Suggested:
- id
- sessionId
- projectId?
- conversationId?
- type
- label
- payloadSummary
- createdAt

## Hard persistence rules

When the system learns a durable project fact:
- persist it.

When the user confirms a decision:
- persist confirmation state.

When an asset is generated:
- store it as an asset, not only as a chat message.

When an asset becomes a reference:
- persist that role.

When project mode and branding mode touch the same project:
- update the same project/BrandDNA.

## Compatibility

Do not rename existing persisted IDs casually.

Prefer:
- adapters;
- migrations;
- additive columns/tables;
- compatibility readers.

Every schema migration must include:
- up path;
- rollback note;
- data backfill note;
- verification query.
