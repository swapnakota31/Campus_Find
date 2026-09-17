# CampusFind - API Specification (RESTful API v1)

All request and response payloads are in JSON format. Authenticated requests require a bearer JWT token in the `Authorization` header.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Request OTP
Initiates a passwordless email verification flow.
* **Method**: `POST`
* **Path**: `/api/v1/auth/otp-request`
* **Authentication**: None (Rate limited: Max 3 requests/15 minutes per IP/email)
* **Request Body**:
  ```json
  {
    "email": "student@gecgudlavallerumic.in"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Verification code sent to email."
  }
  ```

### 1.2 Verify OTP
Verifies the OTP code and issues a JWT token.
* **Method**: `POST`
* **Path**: `/api/v1/auth/otp-verify`
* **Authentication**: None (Rate limited: Max 5 verification attempts per OTP)
* **Request Body**:
  ```json
  {
    "email": "student@gecgudlavallerumic.in",
    "otp": "837482"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "s-49f829-ba9d",
        "email": "student@gecgudlavallerumic.in",
        "role": "STUDENT"
      }
    }
  }
  ```

---

## 2. Items Endpoints (`/api/v1/items`)

### 2.1 Create Lost Item Report
* **Method**: `POST`
* **Path**: `/api/v1/items/lost`
* **Authentication**: STUDENT / ADMIN
* **Request Body**:
  ```json
  {
    "name": "Sony WH-1000XM4 Headphones",
    "categoryId": "c-738d-9a84",
    "locationId": "l-123a-456b",
    "description": "Silver over-ear wireless headphones.",
    "lostDate": "2026-08-10T00:00:00.000Z",
    "lostTimeApprox": "13:00 - 14:30",
    "images": [
      { "imageUrl": "https://cloudinary.com/path/to/public-image.jpg", "isSafe": true },
      { "imageUrl": "https://cloudinary.com/path/to/private-image.jpg", "isSafe": false }
    ],
    "privateDetails": {
      "uniqueMarks": "A sticker of a blue dinosaur on the left ear cup.",
      "engravings": "Engraved 'STUDENT_ID_9999' on inner band"
    }
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "lost-938b-828e",
      "name": "Sony WH-1000XM4 Headphones",
      "status": "ACTIVE"
    }
  }
  ```

### 2.2 List Lost Items (Public Feed)
* **Method**: `GET`
* **Path**: `/api/v1/items/lost`
* **Authentication**: STUDENT / ADMIN
* **Query Parameters**:
  - `category` (optional): Filter by Category ID
  - `location` (optional): Filter by Location ID
  - `page` (optional, default 1)
  - `limit` (optional, default 20)
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "lost-938b-828e",
        "name": "Sony WH-1000XM4 Headphones",
        "category": { "id": "c-738d-9a84", "name": "Electronics" },
        "location": { "id": "l-123a-456b", "name": "Main Library" },
        "lostDate": "2026-08-10T00:00:00.000Z",
        "images": [
          { "imageUrl": "https://cloudinary.com/path/to/public-image.jpg", "isSafe": true }
        ]
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1 }
  }
  ```
  *(Note: Private images and private details are excluded from public feed payloads to preserve privacy.)*

### 2.3 Create Found Item Report
* **Method**: `POST`
* **Path**: `/api/v1/items/found`
* **Authentication**: STUDENT / ADMIN
* **Request Body**:
  ```json
  {
    "name": "Leather Wallet",
    "categoryId": "c-999d-1a84",
    "locationId": "l-123a-456b",
    "description": "Brown leather bi-fold wallet.",
    "foundDate": "2026-08-11T00:00:00.000Z",
    "images": [
      { "imageUrl": "https://cloudinary.com/path/to/public-wallet.jpg", "isSafe": true }
    ],
    "privateDetails": {
      "uniqueMarks": "Contains a student ID card under the name Rohan",
      "notes": "Had 500 Rupees in cash inside"
    },
    "questions": [
      {
        "questionText": "What color is the inner zipper?",
        "type": "STRUCTURED",
        "options": ["Gold", "Silver", "Black", "Blue"],
        "answer": "Black"
      },
      {
        "questionText": "What is the full name written on the student ID card?",
        "type": "FREE_TEXT",
        "answer": "Rohan Kumar"
      }
    ]
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "found-829d-bb8e",
      "status": "ACTIVE"
    }
  }
  ```

---

## 3. Claim & Matching Endpoints

### 3.1 Get Match Recommendations (For Lost Item)
* **Method**: `GET`
* **Path**: `/api/v1/items/lost/:id/matches`
* **Authentication**: STUDENT (Owner of the lost item) / ADMIN
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "matchId": "m-828f-728b",
        "foundItem": {
          "id": "found-829d-bb8e",
          "name": "Leather Wallet",
          "description": "Brown leather bi-fold wallet."
        },
        "status": "SUGGESTED",
        "metadataScore": 0.90,
        "textScore": 0.85,
        "imageScore": null,
        "overallScore": 0.87,
        "matchMethod": "TEXT",
        "matchReasons": [
          "Same category",
          "Similar location",
          "Similar description"
        ]
      }
    ]
  }
  ```
  *(Note: Match scores indicate similarity confidence; they do not represent claim ownership approval.)*

### 3.2 Initiate Claim
* **Method**: `POST`
* **Path**: `/api/v1/claims`
* **Authentication**: STUDENT / ADMIN
* **Request Body**:
  ```json
  {
    "foundItemId": "found-829d-bb8e",
    "matchId": "m-828f-728b" // optional, if claiming from a suggested match
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "status": "success",
    "data": {
      "claimId": "claim-482a-bb91",
      "status": "PENDING_VERIFICATION",
      "questions": [
        {
          "id": "q-111",
          "questionText": "What color is the inner zipper?",
          "type": "STRUCTURED",
          "options": ["Gold", "Silver", "Black", "Blue"]
        },
        {
          "id": "q-222",
          "questionText": "What is the full name written on the student ID card?",
          "type": "FREE_TEXT"
        }
      ]
    }
  }
  ```

### 3.3 Submit Verification Answers
* **Method**: `POST`
* **Path**: `/api/v1/claims/:id/verify`
* **Authentication**: STUDENT / ADMIN
* **Request Body**:
  ```json
  {
    "answers": [
      { "questionId": "q-111", "answer": "Black" },
      { "questionId": "q-222", "answer": "Rohan Kumar" }
    ]
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Answers submitted successfully. Pending finder or admin review.",
    "data": {
      "status": "PENDING_REVIEW"
    }
  }
  ```
  *(Note: Answers are validated in-memory and discarded. Raw answer text is not stored in database records.)*

### 3.4 Approve or Reject Claim (Claim Decision)
* **Method**: `POST`
* **Path**: `/api/v1/claims/:id/action`
* **Authentication**: STUDENT (Finder of the corresponding found item) or ADMIN
* **Request Body**:
  ```json
  {
    "action": "APPROVE", // or "REJECT"
    "rejectionReason": "Submitted answers did not match." // required if REJECT
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Claim APPROVED. Handover coordinates enabled.",
    "data": {
      "status": "APPROVED"
    }
  }
  ```

---

## 4. Handover Endpoints (`/api/v1/handover`)

### 4.1 Confirm Handover (Finder Confirmation)
* **Method**: `POST`
* **Path**: `/api/v1/handover/:claimId/confirm-handover`
* **Authentication**: STUDENT (Finder of the item) or ADMIN
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": {
      "finderConfirmed": true,
      "claimantConfirmed": false
    }
  }
  ```

### 4.2 Confirm Receipt (Claimant Confirmation)
* **Method**: `POST`
* **Path**: `/api/v1/handover/:claimId/confirm-receipt`
* **Authentication**: STUDENT (Claimant/Owner)
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Handover completed. Item returned.",
    "data": {
      "finderConfirmed": true,
      "claimantConfirmed": true,
      "itemStatus": "RETURNED"
    }
  }
  ```

---

## 5. Admin Dashboard Endpoints (`/api/v1/admin`)

### 5.1 Moderate Claims Queue (Including Escalated & High-Value)
* **Method**: `GET`
* **Path**: `/api/v1/admin/claims`
* **Authentication**: ADMIN Only
* **Query Parameters**: `status=ESCALATED`
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "claim-482a-bb91",
        "claimant": { "id": "s-49f829", "email": "claimant@gecgudlavallerumic.in" },
        "assignedAdmin": { "id": "admin-1112", "email": "admin@gecgudlavallerumic.in" },
        "item": { "id": "found-829d", "name": "Leather Wallet" },
        "status": "ESCALATED",
        "verificationAttempts": [
          { "questionText": "What color is the inner zipper?", "type": "STRUCTURED", "isCorrect": true },
          { "questionText": "What is the full name written on the student ID card?", "type": "FREE_TEXT", "isCorrect": true }
        ]
      }
    ]
  }
  ```
  *(Note: The JSON payload exposes verification attempt outcomes, but raw claimant text answers are not returned since they are not stored.)*

### 5.2 Admin Resolve Escalated Claim
* **Method**: `POST`
* **Path**: `/api/v1/admin/claims/:id/resolve`
* **Authentication**: ADMIN Only
* **Request Body**:
  ```json
  {
    "resolution": "RESOLVE_TO_CLAIMANT", // or "REJECT_CLAIM"
    "reason": "Verified matching student ID card physically at administrative desk."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Claim resolved. Audit trail entry created."
  }
  ```
