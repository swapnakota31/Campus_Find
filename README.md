# CampusFind

CampusFind is a secure, verification-driven college Lost & Found platform designed exclusively for verified college students. The portal allows students to report lost and found items, matches reports using a modular recommendation engine, handles secure ownership verification, and coordinates the physical recovery of items.

> **Status:** CampusFind is currently under active development.

## Current Development Phase: Phase 1 — Project Foundation

In Phase 1, we establish a clean, maintainable full-stack foundation:
- **Backend:** Node.js, Express, TypeScript, and Prisma Client.
- **Frontend:** Next.js (App Router), TypeScript, and Tailwind CSS.
- **Database Configuration:** PostgreSQL with Prisma integration.

---

## Workspace Structure

```
/CampusFind
├── docs/                      # Approved documentation and system specifications
├── backend/                   # Node.js + Express API Backend & Prisma setup
│   ├── prisma/                # Prisma database schema and client configuration
│   └── src/                   # Backend application source code
└── frontend/                  # Next.js Frontend Client application
```

---

## Local Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- A running PostgreSQL database instance (local or remote)

### Step 1: Environment Variables
Create `.env` files in both the `backend/` and `frontend/` folders based on the provided `.env.example` templates.

#### Backend Env (`backend/.env`)
Create a file named `backend/.env` containing:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database_name>?schema=public"
ALLOWED_EMAIL_DOMAINS="gecgudlavallerumic.in"
CORS_ORIGIN="http://localhost:3000"
```

#### Frontend Env (`frontend/.env`)
Create a file named `frontend/.env` containing:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### Step 2: Backend Dependencies & Database Client
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### Step 3: Frontend Dependencies
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## Running the Applications

### Starting the Backend
From the `backend/` directory:
```bash
npm run dev
```
The server will start on port `5000`.

#### Health-Check Endpoint
To verify the backend is running, request:
```
GET http://localhost:5000/api/health
```
Response format:
```json
{
  "status": "success",
  "message": "CampusFind API Backend is running",
  "timestamp": "2026-08-13T07:27:54.000Z",
  "environment": "development"
}
```

#### Database Connection Verification
To check that Prisma can successfully connect to your PostgreSQL database, run:
```bash
npm run test-db
```

---

### Starting the Frontend
From the `frontend/` directory:
```bash
npm run dev
```
The client will start on `http://localhost:3000`. Open this address in your browser to view the landing page.
