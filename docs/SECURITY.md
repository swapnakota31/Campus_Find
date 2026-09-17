# CampusFind - Security Design Document

This document describes the threat model, security controls, and design-level protections integrated into the CampusFind architecture to protect student privacy, prevent theft, and secure backend APIs.

---

## 1. Threat Model & Mitigation Strategy

| Threat Category | Potential Impact | Architecture Mitigation |
| :--- | :--- | :--- |
| **Opportunistic Claiming (Theft)** | Students submit fake claims to steal found items of high value (laptops, jewelry, cash). | - Strict partition of safe (public) and private (hidden) item information.<br>- Mandatory verification questions configured by finders.<br>- Configurable policy-based escalation of claims on sensitive categories to Admin Queue.<br>- Direct physical verification of college IDs by admins for high-value handover when policy requires. |
| **OTP Brute-Forcing** | Attackers guess the 6-digit OTP code to hijack a student's session. | - Max 5 attempts per OTP code verification.<br>- Hashed OTP storage in DB.<br>- Immediate OTP deletion upon successful validation or when maximum attempts are exceeded.<br>- Expiry window of exactly 10 minutes. |
| **Email Flooding / OTP Spam** | Attackers repeatedly trigger OTP generation for a target email to spam their inbox or exhaust email quotas. | - Rate limit OTP requests on a per-email and per-IP basis (max 3 requests per 15 minutes).<br>- Cooldown period between resend requests (min 60 seconds). |
| **Tampering & Cross-Tenant Access** | A student modifies, deletes, or reviews claims for another student's item. | - Token-based authorization checks verifying that the requesting student's ID matches the `userId` of the item or `claimantId` of the claim.<br>- Standardized middleware checking resource ownership before write operations. |
| **Admin Privilege Abuse** | A rogue admin performs unauthorized bans, deletes valid reports, or steals high-value items. | - Read-only dashboard queues for unassigned items.<br>- Mandatory audit logs in `AdminAction` detailing the target ID, action type, and written justification for every approval/ban. |

---

## 2. Authentication Security Details

### 2.1 Passwordless Flow Controls
1. **Hashing OTPs**: OTPs must never be stored in plaintext. When an OTP is generated:
   - Generate a 6-digit cryptographically secure random number.
   - Hash it using standard SHA-256 or bcrypt.
   - Save the hashed OTP, creation timestamp, expiry timestamp, and attempt counts.
2. **Immediate Invalidation**: Upon verification (whether successful or failed due to too many attempts), the database record is immediately deleted or marked `isUsed = true`.
3. **Session Tokens**: JWTs issued on verification must:
   - Have a short lifespan (e.g., 1 hour).
   - Contain the claims: `id` (Student UUID), `email`, and `role` (`STUDENT` or `ADMIN`).
   - Be signed with a strong secret key (`JWT_SECRET`) stored strictly in environment variables.

---

## 3. Privacy Preservation: Verification Answers

To prevent the storage and exposure of sensitive credentials, the database does not permanently store the claimant's raw answer:
- **STRUCTURED Answers**: Evaluated in-memory during submission. The system compares the normalized option with the expected option, records only the `isCorrect` boolean outcome, and discards the raw response.
- **FREE_TEXT Answers**: Checked in-memory and deleted immediately after evaluation or claim resolution.
- **Decision Required**: The final secure storage/comparison mechanism for expected answers (e.g., encryption or hashing) will be finalized during implementation once the exact verification algorithm is completed.

---

## 4. API Security & Validation Rules

### 4.1 Rate Limiting Configuration
The application implements cascading rate limiting using middleware:
- **Global Rate Limiter**: 100 requests per 15 minutes per IP address (protects against basic DDOS).
- **Authentication Rate Limiter**: Max 5 requests per 15 minutes on `/api/v1/auth/*` endpoints.
- **Verification Attempt Rate Limiter**: Max 3 incorrect answers per claim. Once exceeded, the claim status is automatically marked as `REJECTED`, and the claimant is blocked from claiming that specific item again.

### 4.2 Strict Domain Validation
- Registration and OTP generation are restricted to specific college domains.
- A regex validator checks input email domains against a list loaded from environment variables:
  ```typescript
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || ['gecgudlavallerumic.in'];
  const emailDomain = email.split('@')[1];
  if (!allowedDomains.includes(emailDomain)) {
    throw new AppError(400, 'Registration restricted to authorized college email domains.');
  }
  ```

### 4.3 Request Payload Validation (Zod Schemas)
Every input parameter is validated at the middleware layer using schemas before execution. For example, for a Lost Item Report:
```typescript
import { z } from 'zod';

export const lostItemSchema = z.object({
  name: z.string().min(3).max(100),
  categoryId: z.string().uuid(),
  locationId: z.string().uuid(),
  description: z.string().min(10).max(1000),
  lostDate: z.string().datetime(),
  lostTimeApprox: z.string().max(100).optional(),
  images: z.array(z.object({
    imageUrl: z.string().url(),
    isSafe: z.boolean()
  })).max(3),
  privateDetails: z.object({
    uniqueMarks: z.string().max(500).optional(),
    engravings: z.string().max(500).optional()
  }).optional()
});
```

---

## 5. Cloudinary Image Upload Constraints
To prevent users from uploading malicious shell scripts or extremely large payloads:
- Images are uploaded from the client directly using secure Cloudinary upload signatures generated by the backend.
- The upload signature restricts uploads to:
  - Allowed file formats: `['jpg', 'jpeg', 'png', 'webp']`.
  - Max file size: `5MB`.
  - Cloudinary configurations enforce transformation policies (e.g., auto-cropping, strip metadata to protect location privacy).
