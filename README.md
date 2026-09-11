# SIH 2026 Infrastructure Monitoring — Backend API

Production-ready, standalone TypeScript backend powered by Express, Prisma (PostgreSQL), and Better Auth for authentication with fine-grained Role-Based Access Control (RBAC: `ADMIN`, `SUPERVISOR`, `VIEWER`).

---

## 1. Overview & Base URLs

- **Local Base URL**: `http://localhost:4000`
- **Render Production Base URL**: `https://sih2026-backend.onrender.com` (or your assigned Render service domain)
- **Auth Endpoint Prefix**: `/api/auth/*`
- **Health Check Endpoint**: `GET /health`

---

## 2. Environment Variables

| Variable | Required | Description | Example (Local Dev) |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/sih2026` |
| `BETTER_AUTH_SECRET` | Yes | 32+ character random secret for signing tokens/cookies | Random 64-char hex string |
| `BETTER_AUTH_URL` | Yes | Publicly accessible URL of this backend server | `http://localhost:4000` |
| `FRONTEND_URL` | Yes | Allowed frontend origin for CORS and OAuth redirects | `http://localhost:3000` |
| `PORT` | No (default 4000) | Port for the Express server | `4000` |
| `NODE_ENV` | No (default dev) | `development` \| `production` \| `test` | `development` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret | `GOCSPX-...` |
| `MICROSOFT_CLIENT_ID` | Optional | Microsoft Entra ID / Azure App (Client) ID | `00000000-0000-0000-0000-000000000000` |
| `MICROSOFT_CLIENT_SECRET` | Optional | Microsoft Entra ID Client Secret Value | `abc~...` |
| `MICROSOFT_TENANT_ID` | Optional | Microsoft Entra ID Tenant ID (default: `common`) | `common` |

---

## 3. Seeded Accounts & Credentials for Testing / Audit

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@infra.gov.in` | `Password123!` | `ADMIN` | Global portfolio access, project creation (`POST /api/projects`), field updates, role simulation |
| `supervisor@infra.gov.in` | `Password123!` | `SUPERVISOR` | Assigned project access, field updates (`POST /api/projects/:id/updates` via Excel, Text, Voice) |
| `viewer@infra.gov.in` | `Password123!` | `VIEWER` | Read-only access to all dashboards, S-Curves, and telemetry feeds. (Mutations blocked with `403 Forbidden`) |

---

## 4. Complete API Endpoint Matrix

### 4.1 System & Health

#### `GET /health`
- **Auth Requirement**: Public (no auth required)
- **Description**: Render uptime and container health probe.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-10T06:30:00.000Z",
    "uptime": 124.5
  }
  ```

---

### 4.2 Authentication (`/api/auth/*`)

Handled natively by Better Auth with session cookies (`credentials: "include"`).

#### `POST /api/auth/sign-up/email`
- **Auth Requirement**: Public
- **Request Body**:
  ```json
  {
    "email": "engineer@infra.gov.in",
    "password": "Password123!",
    "name": "Er. Arvind Kumar"
  }
  ```
- **Response `200 OK`**: User profile with `Set-Cookie` session header. New accounts default to `SUPERVISOR` role.

#### `POST /api/auth/sign-in/email`
- **Auth Requirement**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@infra.gov.in",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**: User profile with active session cookie.

#### `POST /api/auth/sign-out`
- **Auth Requirement**: Logged-in session
- **Response `200 OK`**: Invalidates session in PostgreSQL and clears cookies.

#### `GET /api/auth/get-session`
- **Auth Requirement**: Public / Session Check
- **Response `200 OK`**: `{ "session": { ... }, "user": { ... } }` or `null` if unauthenticated.

#### `POST /api/auth/sign-in/social`
- **Auth Requirement**: Public
- **Request Body**:
  ```json
  {
    "provider": "github" | "google",
    "callbackURL": "http://localhost:3000/admin"
  }
  ```
- **Response `200 OK`**: `{ "url": "https://github.com/login/oauth/authorize?..." }`

---

### 4.3 Officer Profile & Role Switching

#### `GET /api/me`
- **Auth Requirement**: Logged-in (`ADMIN`, `SUPERVISOR`, or `VIEWER`)
- **Description**: Returns authenticated officer session details combined with real-time PostgreSQL `role`.
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "usr_998124",
      "name": "National System Administrator",
      "email": "admin@infra.gov.in",
      "role": "ADMIN",
      "createdAt": "2026-09-10T00:41:39.000Z"
    }
  }
  ```
- **Response `401 Unauthorized`**: If session is absent or expired.

#### `PATCH /api/me/role`
- **Auth Requirement**: Logged-in
- **Description**: Updates the active user's role in PostgreSQL. Enables instant switching between `ADMIN`, `SUPERVISOR`, and `VIEWER` to test and demonstrate RBAC-scoped interfaces.
- **Request Body**:
  ```json
  {
    "role": "SUPERVISOR"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "message": "Role updated to SUPERVISOR",
    "user": {
      "id": "usr_998124",
      "email": "admin@infra.gov.in",
      "role": "SUPERVISOR"
    }
  }
  ```

---

### 4.4 Dashboard Telemetry & Aggregations

#### `GET /api/dashboard/stats`
- **Auth Requirement**: Logged-in (`ADMIN`, `SUPERVISOR`, or `VIEWER`)
- **Description**: Aggregates real-time portfolio statistics directly from PostgreSQL `Project` and `ActivityUpdate` tables.
- **Response `200 OK`**:
  ```json
  {
    "stats": {
      "totalProjects": 4,
      "onTrackCount": 3,
      "delayedCount": 1,
      "completedCount": 0,
      "totalBudgetCr": 51200,
      "avgProgress": 48.75,
      "recentUpdates": [
        {
          "id": "upd_1001",
          "channel": "EXCEL",
          "notes": "Imported WBS spreadsheet. Section 2 earthworks finished.",
          "progressDelta": 1.5,
          "author": "Er. Arvind Kumar",
          "role": "SUPERVISOR",
          "createdAt": "2026-09-10T00:42:00.000Z"
        }
      ]
    }
  }
  ```
- **Response `401 Unauthorized`**: If session is missing.

---

### 4.5 Projects & Multi-Modal Field Updates

#### `GET /api/projects`
- **Auth Requirement**: Logged-in (`ADMIN`, `SUPERVISOR`, or `VIEWER`)
- **Query Parameters**:
  - `scope` (optional): `assigned` (filters to projects supervised by the current user when role is `SUPERVISOR`)
- **Description**: Retrieves list of infrastructure projects with nested `timelinePoints` and `recentUpdates`.
- **Response `200 OK`**:
  ```json
  {
    "projects": [
      {
        "id": "PRJ-NH48-EXP",
        "name": "Delhi-Mumbai Expressway Package 14",
        "code": "NH-48-EXP",
        "wbsCode": "WBS-1.1.4-HWY",
        "department": "Ministry of Road Transport & Highways",
        "category": "Transportation",
        "location": "Vadodara-Kim Expressway Corridor",
        "description": "8-lane access-controlled greenfield expressway stretch.",
        "baselineStartDate": "2024-03-01T00:00:00.000Z",
        "baselineEndDate": "2026-12-31T00:00:00.000Z",
        "currentProgress": 68.5,
        "plannedProgress": 65,
        "status": "ON_TRACK",
        "budget": "₹4,250 Cr",
        "spent": "₹2,890 Cr",
        "supervisor": "Er. Arvind Kumar",
        "contractor": "Larsen & Toubro ECC",
        "timelinePoints": [
          { "period": "Q1-24", "planned": 15, "actual": 16 },
          { "period": "Q2-24", "planned": 30, "actual": 32 }
        ],
        "recentUpdates": [
          {
            "id": "upd_nh48_1",
            "channel": "EXCEL",
            "notes": "Main carriageway asphalt paving completed.",
            "progressDelta": 1.5,
            "author": "Er. Arvind Kumar",
            "role": "SUPERVISOR",
            "createdAt": "2026-09-08T10:00:00.000Z",
            "tags": ["#Paving", "#QualityPassed"]
          }
        ]
      }
    ]
  }
  ```

#### `POST /api/projects`
- **Auth Requirement**: `ADMIN` role only (Enforced via `requireRole(["ADMIN"])` middleware)
- **Description**: Creates a new project baseline in PostgreSQL.
- **Request Body**:
  ```json
  {
    "name": "Coastal Ring Road Expressway Phase II",
    "code": "WBS-2.3.14-HWY",
    "wbsCode": "WBS-2.3.14-HWY",
    "department": "Ministry of Road Transport & Highways",
    "category": "Transportation",
    "location": "Pune-Nashik Corridor, MH",
    "budget": "₹3,450 Cr",
    "spent": "₹0 Cr",
    "baselineStartDate": "2026-04-01T00:00:00.000Z",
    "baselineEndDate": "2028-12-31T00:00:00.000Z",
    "currentProgress": 0,
    "plannedProgress": 5,
    "status": "ON_TRACK",
    "supervisor": "Er. Arvind Kumar",
    "contractor": "National EPC Contractors Ltd",
    "description": "Access-controlled expressway bypassing congested arterial corridors."
  }
  ```
- **Response `201 Created`**: Returns `{ "message": "Project created successfully", "project": { ... } }`
- **Response `403 Forbidden`**:
  ```json
  {
    "error": "Forbidden: Requires one of the following roles: ADMIN. Your role: SUPERVISOR"
  }
  ```

#### `GET /api/projects/:id`
- **Auth Requirement**: Logged-in (`ADMIN`, `SUPERVISOR`, or `VIEWER`)
- **Description**: Fetches single project details with all timeline coordinates and field activity logs.
- **Response `200 OK`**: `{ "project": { ... } }`
- **Response `404 Not Found`**: `{ "error": "Project not found" }`

#### `POST /api/projects/:id/updates`
- **Auth Requirement**: `ADMIN` or `SUPERVISOR` (Enforced via `requireRole(["ADMIN", "SUPERVISOR"])` middleware; `VIEWER` is rejected)
- **Description**: Commits daily multi-modal progress updates (Excel, Text log, or Voice memo) to PostgreSQL. Automatically increments `project.currentProgress` by `progressDelta`, creates an `ActivityUpdate` row, and appends a new `TimelinePoint` coordinate for S-Curve visualization.
- **Request Body**:
  ```json
  {
    "channel": "VOICE",
    "notes": "Pier segment 14 casting finished at 16:30. Curing compounds applied. Steel reinforcement inspections approved.",
    "progressDelta": 1.2,
    "author": "Site Supervisor",
    "tags": ["#VoiceTranscription", "#SiteAudioMemo"]
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Progress update recorded successfully",
    "update": {
      "id": "upd_clp12345",
      "channel": "VOICE",
      "notes": "...",
      "progressDelta": 1.2,
      "author": "Site Supervisor",
      "role": "SUPERVISOR",
      "createdAt": "2026-09-10T06:35:00.000Z"
    },
    "project": {
      "id": "PRJ-NH48-EXP",
      "currentProgress": 69.7,
      "status": "ON_TRACK"
    }
  }
  ```
- **Response `403 Forbidden`**: Returned if called by a `VIEWER`:
  ```json
  {
    "error": "Forbidden: Requires one of the following roles: ADMIN, SUPERVISOR. Your role: VIEWER"
  }
  ```

---

## 5. Deployment Guide (Render)

1. Push code to your Git repository.
2. In Render, select **Blueprints** and point to `backend/render.yaml`.
3. Provide environment variables (`BETTER_AUTH_SECRET`, `FRONTEND_URL`, OAuth keys if required).
4. Render builds the service using `npm run build`, runs database migrations via `npm run prisma:migrate`, and executes `npm start`.
