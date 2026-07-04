# T03_ORBE_GUIDED_TOUR

## Objective
Build deterministic Guided Tour and improve Orbe identity.

## Read first
- `specs/11_ORBE_AND_GUIDED_TOUR.md`

## Do
1. Create explicit tour state machine.
2. Move standard responses to locale-aware presets.
3. Reuse cards/actions.
4. Add scroll orchestration.
5. Add subtle attention cues.
6. Allow exit to adaptive Orbe.
7. Route project questions to intelligent mode.

## Hard requirement
Standard path makes zero LLM calls.

## Tests
- mock/instrument LLM client;
- assert zero calls;
- state transitions;
- locale;
- restart/resume;
- exit to adaptive mode.

## Stop
Report call-count evidence and UX recording/screenshots.
