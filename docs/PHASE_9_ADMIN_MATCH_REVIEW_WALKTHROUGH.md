# Phase 9 Admin Match Review

## Review Flow

Phase 8 creates server-scored `Match` records with `POTENTIAL` status. Admins review them through:

- `GET /api/admin/matches`
- `GET /api/admin/matches/:id`
- `POST /api/admin/matches/:id/approve`
- `POST /api/admin/matches/:id/reject`

The same routes are available under `/api/v1/admin/matches`. Every route requires the existing authenticated session and `ADMIN` role.

## Privacy and Images

The queue contains only safe lost/found metadata and similarity scores. The detail endpoint selects private image identifiers server-side and converts them to five-minute signed access URLs through the existing authenticated Cloudinary image service. Raw Cloudinary identifiers and permanent URLs are never returned. Students are rejected by route and service authorization before match data or image URLs are selected.

Verification questions, answer hashes, claimant answers, and unrelated private user information are not included in match responses.

## Decisions and Audit

Admins can approve a `POTENTIAL` match, changing it to `CONFIRMED`, or reject it with a reason, changing it to `DISMISSED`. Each decision creates an `AdminAction` record and notifications for both report owners. Decisions do not create claims, approve ownership, change item status, or complete handover.

## Frontend

The admin UI uses the existing `AuthContext`, `api` client, `Navbar`, loading/error/empty states, and confirmation dialog:

- `/admin` redirects admins to the review queue.
- `/admin/matches` lists potential matches and similarity scores.
- `/admin/matches/[id]` displays safe metadata, temporary private image previews, score analysis, and approve/reject actions.

Non-admin users are redirected away from the admin pages, while the backend remains the authoritative authorization boundary.

## Validation

`test-admin-matches.ts` covers unauthenticated and student denial, admin list/detail access, private image isolation, decision authorization, invalid repeat decisions, audit records, notifications, and preservation of item state. Existing Phase 7A, Phase 7B, and Phase 8 suites remain part of the regression run.

## Limitations

This phase does not implement handover, automatic ownership decisions, production AI providers, or a separate admin image proxy. Signed image URLs are short-lived and generated only for authenticated admin detail requests.