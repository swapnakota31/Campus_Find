# CampusFind - Project Specification

## 1. Project Overview
CampusFind is a dedicated, secure, and verification-driven college Lost & Found platform designed exclusively for verified college students. The portal allows students to report lost and found items, matches reports using a modular recommendation engine, handles secure ownership verification, and coordinates the physical recovery of items.

The platform is designed with a **Privacy-by-Design** philosophy to prevent theft, spam, and privacy violations.

---

## 2. User Roles
The system supports two user roles:

1. **STUDENT**
   - Authenticates via passwordless OTP (restricted to verified college domains).
   - Reports lost items (contains safe public and private protected fields).
   - Reports found items (contains safe public and private protected fields, along with verification questions).
   - Views their own reports and notifications.
   - Claims found items and submits answers to verification questions.
   - Tracks claim status, coordinates handover, and confirms item receipt.

2. **ADMIN**
   - Accesses the Admin Dashboard.
   - Moderates users (can suspend/ban students).
   - Reviews, edits, or archives lost/found reports.
   - Reviews claims flagged for admin review or escalated disputes.
   - Monitors platform activity, views audit logs, and monitors analytics.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization
- **Passwordless OTP Flow**:
  1. Student enters their college email address.
  2. System checks if the domain matches the allowed domain list.
  3. System generates a secure, random OTP and hashes it before storing it.
  4. System sends the OTP to the student's email via the email provider.
  5. Student inputs the OTP.
  6. System verifies the OTP (hashes input, compares with stored hash, checks expiration).
  7. On success, a secure session/JWT is issued. Stored OTP is immediately invalidated.
- **Security Constraints**:
  - **Email Domain Constraint**: The allowed domains must be configurable via environment variables (e.g., `ALLOWED_EMAIL_DOMAINS=gecgudlavallerumic.in`).
  - **No Password Field**: There is no password registration, storage, or verification.
  - **OTP Expiration**: OTPs must expire after a configurable duration (e.g., 5-10 minutes).
  - **Single Use**: Once verified, the OTP is invalidated and cannot be reused.
  - **Rate Limiting**:
    - Limits on OTP requests per email (e.g., max 3 requests per 15 minutes).
    - Limits on verification attempts per OTP (e.g., max 5 attempts before invalidating the OTP).
  - **Backend Enforcement**: All API endpoints (except OTP request and verification) require valid authorization.

### 3.2 Item Reporting
Students can create two types of reports:
1. **Lost Item Report**: Created by a student who has lost an item.
2. **Found Item Report**: Created by a student who has found an item.

#### Item Image Ownership Invariant:
- An image upload must belong to exactly one report: either a `lostItem` OR a `foundItem`. It can never belong to both, and it can never be left orphaned without belonging to either. This invariant is enforced by database relations and API validation.

#### Report Fields:
- **Item Name** (e.g., "iPhone 13") - *PUBLIC / SAFE*
- **Category** (e.g., "Electronics") - *PUBLIC / SAFE*
- **General Description** (e.g., "Black phone, found near the cafeteria") - *PUBLIC / SAFE*
- **Date** (date of loss/finding) - *PUBLIC / SAFE*
- **Approximate Time** - *PUBLIC / SAFE*
- **Location** (from a predefined list of campus locations) - *PUBLIC / SAFE*
- **Images**:
  - **Safe Image**: An image showing the item generally, with sensitive parts cropped or blurred. - *PUBLIC / SAFE*
  - **Private Image**: An image showing unique markings, serial numbers, or engravings. - *PRIVATE / PROTECTED*
- **Protected Identifying Information**:
  - Distinctive marks, engravings, unique cases, scratches, lock screen wallpaper details, serial numbers, or hidden identifiers. - *PRIVATE / PROTECTED*
  - **Verification Questions**: The finder can configure verification questions. - *PRIVATE / PROTECTED* (only the questions are exposed to claimants; correct answers are always hidden).

### 3.3 Privacy & Data Access Controls
To prevent opportunistic claiming, the system strictly partitions public and private data:

| Field / Attribute | Public View (Unclaimed Item) | Claimant View (Before Approval) | Finder & Admin View |
| :--- | :--- | :--- | :--- |
| **General Details (Name, Category, Date, Location)** | Yes | Yes | Yes |
| **Safe Images** | Yes | Yes | Yes |
| **Private Images** | No | No | Yes |
| **Protected Details (Engravings, Marks, etc.)** | No | No | Yes |
| **Verification Questions** | No | Yes (to answer) | Yes |
| **Verification Answers / Correct Answers** | No | No | Yes |
| **Claimant Personal Info** | No | No | Yes |

*Private/protected information is never returned by normal public item-feed APIs.*

### 3.4 Multimodal Matching Engine
Whenever a new Lost or Found report is created, a background matching process calculates similarity between reports.
- **Recommendation Only**: The engine generates possible match *suggestions* but **never** performs automatic claiming, ownership assignment, or approval.
- **Signal Matching**: Integrates Metadata, Text/Semantic, and Image metrics.
- **Explainability**: The system preserves enough information in the Match record to explain why a possible match was generated. This includes:
  - `metadataScore`, `textScore`, `imageScore`, and `overallScore` (as similarity/confidence indicators, **not** proof of ownership).
  - `matchMethod` (e.g., `METADATA`, `TEXT`, `IMAGE`, `MULTIMODAL`).
  - `matchReasons`: Description of non-sensitive evidence (e.g., "Same category", "Similar location", "Similar description", "Similar date range"). Private details must never be exposed.
- **Match Status**:
  - `SUGGESTED`: Newly identified possible match.
  - `DISMISSED`: Dismissed by the student as a mismatch.
  - `EXPIRED`: Suggestion has expired or the underlying report was resolved.

---

### 3.5 Claim & Ownership Verification Flow
When a student identifies a found item as theirs, they initiate a Claim.
1. **Verification Stage**:
   - The claimant is presented with the verification questions set by the finder.
   - We support different question types:
     1. **STRUCTURED**: Questions with predefined options (e.g., "What color is the item?" - Options: Gold / Silver / Black / Blue). The system normalizes the submitted answer, compares it, and stores only the minimum audit/result (e.g., `isCorrect` boolean, question ID). It does not retain the raw input.
     2. **FREE_TEXT**: Questions requiring typed input (e.g., "What engraving or distinctive mark is present?"). The input is normalized where appropriate, exact or normalized comparison is used where appropriate, and manual review is supported. The raw claimant answers must not be permanently retained or exposed.
   - System rate-limits answer attempts per claim to prevent brute-forcing.
2. **Configurable Escalation & Review**:
   - **Normal Items**: Handled by the finder. The finder reviews the verification status/answers and makes a Claim Decision (Approve or Reject).
   - **Sensitive/High-Value Items**: Items in categories like jewelry, phones, laptops, cash, and identity documents can be configured for admin review. When configured by policy, the claim is routed to the Admin Queue for review before a Claim Decision is finalized.
3. **Escalation**: If a claimant disputes a rejection or multiple students submit claims for the same item, it is escalated to Admin Review.

---

### 3.6 Handover & Recovery Flow
Once a claim is approved:
1. **Status Update**: The claim status changes to `APPROVED`. The item status updates to `MATCHED`.
2. **Coordination**: Students coordinate the physical handover.
3. **Confirmation**:
   - **Finder Confirms**: Finder logs into the app and marks that they have handed over the item.
   - **Claimant Confirms**: Claimant marks that they have received the item.
   - **Final Status**: Once both confirm, the item's status updates to `RETURNED`.

---

### 3.7 Data Retention & Archiving
To maintain historical and operational integrity while respecting user privacy:
- **Hard Deletion Avoided**: Records necessary for audit logs and platform metrics are archived instead of deleted.
- **Archived Records**:
  - **Claim History**: Preserved for audit logs, fraud detection, and analytics.
  - **Handover/Return History**: Preserved to verify item returns and track disputes.
  - **Matching History**: Past matches (suggested, dismissed) preserved for tuning matching thresholds.
  - **Admin Actions**: Permanently archived as immutable audit logs.
- **Deleted Records**:
  - Inactive/expired OTP verifications are periodically purged.
  - Cancelled reports without associated claims may be deleted based on retention policies.
- **Sensitive Data Protections**:
  - Claimant submitted answers (raw text) are deleted/purged immediately post-evaluation or claim resolution.
  - User records of banned students are kept as disabled profiles to prevent re-registration, but sensitive metadata is restricted.

---

## 4. Decisions Required (DECISION REQUIRED)

> [!WARNING]
> ### 1. Real-Time Chat Coordination
> **Context**: How will finders and claimants communicate to arrange the physical handover?
> - **Option A**: Implement an in-app real-time chat service using WebSockets.
> - **Option B**: Display meeting coordinates or exchange verified college email addresses directly.
> - **Recommendation**: Option B (structured coordinates or direct email exchange) for Phase 1 to reduce complexity, with Option A deferred.

> [!WARNING]
> ### 2. Final Verification Answer Secure Storage
> **Context**: How should verification answers and submitted answers be stored?
> - **Open Decision**: Final secure storage/comparison mechanism for verification answers will be selected during implementation after the exact verification logic is finalized. Raw claimant answers must not be unnecessarily exposed or retained.

> [!WARNING]
> ### 3. Data Retention Periods
> **Context**: What are the retention durations before archiving or deleting records?
> - **Open Decision**: Retention periods are a DECISION REQUIRED item to finalize before production deployment.
