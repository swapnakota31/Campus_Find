# Phase 8 Matching Foundation

## Architecture

Authenticated backend workflows call `MatchingService` with a lost-item ID and a found-item ID. The service validates ownership or admin access, requires both reports to be active, reads only private image identifiers from PostgreSQL, and retrieves image bytes through `ImageService.getSecureBufferForAI`.

The authenticated trigger endpoint is `POST /api/matching` (also available at `/api/v1/matching`) with `{ "lostItemId": "...", "foundItemId": "..." }`. Students may trigger matching only when they own either report; admins may trigger it for any active pair.

## Provider Abstraction

`ImageMatchingProvider` owns image comparison. The current `development-mock` provider compares byte histograms and is not a vision model or an ownership classifier. A production provider can replace it without changing route or matching business logic. The selected provider is controlled by `AI_IMAGE_PROVIDER`.

## Scoring Flow

- Metadata: category, location overlap, and exponential date decay.
- Text: deterministic Jaccard similarity over title, category, and description.
- Images: all available private-image pairs are compared up to `AI_MAX_IMAGE_COMPARISONS`; the mean of the best three pair scores is used.
- Overall: `0.3 metadata + 0.4 text + 0.3 image` when images exist, otherwise `0.4 metadata + 0.6 text`.

Scores are similarity indicators, not calibrated probabilities or ownership decisions. The threshold is controlled by `MATCHING_THRESHOLD`.

## Match Creation

Scores are generated only on the server. A qualifying pair is upserted through the existing unique lost/found relation with `MatchStatus.POTENTIAL`. Repeated runs update the same pair; no claim, approval, handover, or return is created.

## Privacy Boundaries

The matching service never returns image URLs or image bytes. Cloudinary access remains authenticated and server-side. Public item and claim APIs are unchanged. No verification questions, expected answers, or claim data are sent to the provider.

## Limitations

The current provider is explicitly a development stub, not real computer vision. A production rollout needs a vetted vision or embedding provider, provider-specific credentials/configuration, calibration, monitoring, and an asynchronous queue. Admin match-review UI and handover remain later phases.

## Validation

Phase 8 validation uses `npm run test:matching`, followed by the existing database, authentication, item, image, verification, and claim suites, `npm run build`, `prisma validate`, and the frontend build.