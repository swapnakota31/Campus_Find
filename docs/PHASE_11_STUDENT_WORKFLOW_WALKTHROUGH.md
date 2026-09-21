# Phase 11 Student Workflow Integration

## Scope

Phase 11 connects the completed backend workflows to the student-facing Next.js application. It does not replace authentication, claims, verification, matching, admin review, or handover logic.

## Student Routes

- `/found`: active found-item directory with search, category/status filters, pagination, and report action.
- `/found/report`: creates a found report and uploads private images through existing authenticated image APIs.
- `/found/[id]`: safe found-item detail with claim initiation and private verification-question answering.
- `/lost/report`: creates a lost report and uploads private images.
- `/lost/[id]`: safe lost-item detail.
- `/my-reports`: lists the authenticated user's lost reports, found reports, and claims.
- `/notifications`: lists and marks the authenticated user's notifications read.

## Security Boundaries

The frontend sends no claimant, status, score, answer-hash, or private-image URL fields. Claimant identity, verification, status transitions, image authorization, and matching decisions remain backend-controlled. Notification APIs filter by the authenticated user ID. Verification questions are displayed without expected answers, and private images continue to use existing authenticated upload/access routes.

## Backend Addition

The existing `Notification` model now has a small authenticated API:

- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

Equivalent `/api/v1/notifications` routes are available. No Prisma migration was required.

## Validation

`test-student-workflow.ts` verifies notification ownership and read-state behavior. Existing auth, item, image, verification, claim, matching, admin-match, and handover suites remain part of the regression run, along with both production builds.

## Limitations

The existing backend item APIs still use free-text category/location fields, and the frontend report form does not yet configure finder verification questions during report creation. Student finder-side claim review and participant self-confirmation remain backend/admin-controlled by the prior phases.