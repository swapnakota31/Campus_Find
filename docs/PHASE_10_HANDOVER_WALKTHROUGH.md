# Phase 10 Handover and Return Workflow

## Workflow

The controlled path is:

`Claim submitted -> verification -> UNDER_REVIEW -> admin approval -> APPROVED -> handover confirmation -> item returned`

Admin approval does not complete a handover. A separate confirmation is required after the physical exchange.

## Authorization and API

The protected endpoint is:

`POST /api/admin/claims/:id/handover`

It is also available at `/api/v1/admin/claims/:id/handover`. Existing authentication and `requireRole(Role.ADMIN)` middleware protect the route. The service repeats the role check and accepts no client-controlled status or ownership fields.

Only an `APPROVED` claim can be completed. Pending, under-review, rejected, cancelled, missing, and already completed claims are rejected safely. The unique Handover relation prevents duplicate completion.

## State Transitions

- `Handover.PENDING` or no handover row -> `Handover.COMPLETED`
- `FoundItem.ACTIVE` -> `FoundItem.RETURNED`
- `LostItem.ACTIVE` -> `LostItem.FOUND`
- `Claim.APPROVED` remains `APPROVED` because the existing enum has no completed claim state

The existing `LostItemStatus` enum has no `RETURNED` value, so `FOUND` is retained as its supported completed state. No schema migration was created.

All database changes occur in one Prisma transaction. Reports, claims, handover records, and audit history remain persisted.

## Notifications and Audit

The transaction creates `HANDOVER` notifications for the claimant and finder and an `AdminAction` with `CONFIRM_HANDOVER`. No separate notification or audit system was introduced.

## Frontend

The existing admin match detail page now displays the latest claim and handover state. For an approved claim without a completed handover, it shows a separate `Confirm Handover` action using the existing `ConfirmDialog`. Successful confirmation refreshes the detail and replaces the action with the returned/completed state.

## Privacy and Limitations

No verification answers, hashes, credentials, or private image URLs are added to handover responses. Handover remains admin-controlled in this phase; student/finder self-confirmation and physical coordination are not implemented. Ownership is not reassigned automatically, and no production AI provider is added.

## Validation

`test-handover.ts` covers unauthenticated and student denial, all ineligible claim states, approved completion, duplicate protection, item transitions, history retention, audit records, notifications, and missing claims. The complete Phase 5-9 regression suites remain required.