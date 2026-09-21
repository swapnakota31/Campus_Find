# Phase 12 Participant Claim and Handover

## Workflow

`Claim submitted -> verification -> finder review -> APPROVED -> finder confirms handover -> claimant confirms receipt -> COMPLETED`

Finder review is distinct from admin review. A finder can act only on claims attached to their own found item. The claimant and finder each provide one confirmation; a single confirmation leaves the handover pending.

## APIs

Finder claim review:

- `GET /api/claims/found/:foundItemId`
- `POST /api/claims/:id/finder-approve`
- `POST /api/claims/:id/finder-reject`

Participant handover:

- `POST /api/claims/:id/finder-confirm`
- `POST /api/claims/:id/receipt-confirm`

The same routes are available under `/api/v1`. Existing admin routes remain available, including `POST /api/admin/claims/:id/handover` as an override.

## Authorization and State

- Finder identity comes from the authenticated session and is checked against `FoundItem.finderId`.
- Claimant identity comes from the authenticated session and is checked against `Claim.claimantId`.
- Only approved claims can enter handover.
- Duplicate, unrelated, rejected, cancelled, and completed actions are rejected.
- `Handover.finderConfirmed` and `Handover.claimantConfirmed` represent participant progress.
- Completion occurs only when both booleans are true.
- `FoundItem` becomes `RETURNED`; the existing `LostItem` enum uses `FOUND` as its supported completed state.

## Notifications and Privacy

Claim decisions and participant actions create scoped notifications without exposing verification answers, hashes, private images, or unnecessary contact information. Finder claim listings return sanitized claim and handover state only.

## Database

The existing Handover model lacked the two participant confirmation fields, so migration `20260921000001_add_participant_handover_confirmations` adds `finderConfirmed` and `claimantConfirmed` with safe `false` defaults. No data is deleted or reset.

## Frontend

The existing found-item detail route now supports finder claim review, finder handover confirmation, claimant receipt confirmation, confirmation dialogs, disabled invalid actions, and completed recovery status. Existing admin review and handover UI remains intact.

## Validation

`test-participant-handover.ts` covers finder authorization, claim decisions, participant authorization, one-sided confirmation, completion, duplicate actions, notifications, and admin override/audit behavior. Existing Phase 7A-11 regression suites remain required.