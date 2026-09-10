# SIH 2026 Infrastructure Monitoring — Backend API

Production-ready, standalone TypeScript backend powered by Express, Prisma (PostgreSQL), and Better Auth for authentication (Email/Password + GitHub/Google OAuth).

---

## 1. Overview & Base URLs

- **Local Base URL**: `http://localhost:4000`
- **Render Production Base URL**: `https://sih2026-backend.onrender.com` (or your assigned Render service domain)
- **Auth Endpoint Prefix**: `/api/auth/*`
- **Render Health Check Endpoint**: `GET /health`

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
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth Application Client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth Application Client Secret | `4f82a...` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret | `GOCSPX-...` |

> **Render Deployment Setup**:
> In Render dashboard, set:
> 1. `BETTER_AUTH_URL`: Your Render Web Service URL (e.g. `https://sih2026-backend.onrender.com`)
> 2. `FRONTEND_URL`: Your deployed frontend URL (e.g. `https://sih2026.vercel.app`)
> 3. `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: From GitHub Developer Settings (Callback URL: `https://<backend-domain>/api/auth/callback/github`)
> 4. `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console (Redirect URI: `https://<backend-domain>/api/auth/callback/google`)
> Note: `DATABASE_URL` is automatically wired via `render.yaml`.

---

## 3. Local Development Quickstart

1. **Prerequisites**: Node.js v20+, PostgreSQL running locally (e.g. via Docker: `docker run --name sih_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sih2026 -p 5432:5432 -d postgres:16-alpine`).
2. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```
3. **Configure environment**:
   Copy `.env.example` to `.env` and verify credentials:
   ```bash
   cp .env.example .env
   ```
4. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```
5. **Start development server**:
   ```bash
   npm run dev
   ```
6. **Compile & start in production mode**:
   ```bash
   npm run build
   npm start
   ```

---

## 4. Frontend Integration Guide (Next.js)

### Important: CORS & Cookies
Every request made from the frontend to protected backend routes must include credentials:
```typescript
fetch("http://localhost:4000/api/me", {
  credentials: "include", // CRITICAL for session cookies
});
```

### Setting up the Better Auth Client SDK

1. Install `better-auth` in the frontend (`sih2026`):
   ```bash
   npm install better-auth
   ```
2. Create `src/lib/auth-client.ts`:
   ```typescript
   import { createAuthClient } from "better-auth/react";

   export const authClient = createAuthClient({
     baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
     fetchOptions: {
       credentials: "include",
     },
   });

   export const { signIn, signUp, signOut, useSession } = authClient;
   ```

### 1. Email & Password Sign Up
```typescript
import { authClient } from "@/lib/auth-client";

await authClient.signUp.email({
  email: "engineer@infra.gov.in",
  password: "SecurePassword123!",
  name: "Rajesh Sharma",
}, {
  onSuccess: () => {
    // Redirect or update UI
    window.location.href = "/admin";
  },
  onError: (ctx) => {
    alert(ctx.error.message);
  }
});
```

### 2. Email & Password Sign In
```typescript
import { authClient } from "@/lib/auth-client";

await authClient.signIn.email({
  email: "engineer@infra.gov.in",
  password: "SecurePassword123!",
}, {
  onSuccess: () => {
    window.location.href = "/admin";
  },
  onError: (ctx) => {
    alert(ctx.error.message);
  }
});
```

### 3. Social OAuth (GitHub & Google)
Trigger social login with automatic redirect back to your frontend:
```typescript
import { authClient } from "@/lib/auth-client";

// GitHub OAuth
await authClient.signIn.social({
  provider: "github",
  callbackURL: "http://localhost:3000/admin",
});

// Google OAuth
await authClient.signIn.social({
  provider: "google",
  callbackURL: "http://localhost:3000/admin",
});
```

### 4. Reading the Current User & Session State
Use the React hook:
```typescript
import { authClient } from "@/lib/auth-client";

export function UserBadge() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <div>Checking auth...</div>;
  if (!session) return <a href="/login">Sign In</a>;

  return (
    <div>
      <span>{session.user.name} ({session.user.email})</span>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  );
}
```

Or query the protected `/api/me` route directly:
```typescript
const res = await fetch("http://localhost:4000/api/me", {
  credentials: "include",
});
const { user, session } = await res.json();
```

---

## 5. API Reference

### Health & Monitoring
- **`GET /health`**
  - **Auth**: None
  - **Description**: Render liveness & database health check probe.
  - **Response (200)**:
    ```json
    {
      "status": "ok",
      "database": "connected",
      "uptime": 12.34,
      "timestamp": "2026-09-10T00:00:00.000Z"
    }
    ```

### Authentication Endpoints (Mounted at `/api/auth/*`)
- `POST /api/auth/sign-up/email` — Body: `{ email, password, name }`
- `POST /api/auth/sign-in/email` — Body: `{ email, password }`
- `POST /api/auth/sign-out` — Body: `{}` (with session cookie)
- `GET /api/auth/get-session` — Returns active session object
- `GET /api/auth/sign-in/social?provider=github|google` — Redirects to OAuth provider

### User Profile
- **`GET /api/me`**
  - **Auth**: Required (`sih_auth.session_token` cookie)
  - **Description**: Returns authenticated user profile and session metadata.
  - **Response (200)**:
    ```json
    {
      "user": {
        "id": "cly12345",
        "name": "Rajesh Sharma",
        "email": "engineer@infra.gov.in",
        "emailVerified": false,
        "image": null,
        "createdAt": "2026-09-10T00:00:00.000Z",
        "updatedAt": "2026-09-10T00:00:00.000Z"
      },
      "session": {
        "id": "sess_12345",
        "userId": "cly12345",
        "token": "...",
        "expiresAt": "2026-09-17T00:00:00.000Z"
      }
    }
    ```
  - **Response (401)**:
    ```json
    {
      "error": "Unauthorized",
      "message": "You must be authenticated to access this resource"
    }
    ```

### Infrastructure Projects (SIH Domain)
- **`GET /api/projects`**
  - **Auth**: Optional
  - **Query Params**: `status`, `department`, `search`
  - **Response (200)**: `{ "projects": [ ... ] }`

- **`POST /api/projects`**
  - **Auth**: Required
  - **Request Body**:
    ```json
    {
      "name": "NH-44 Expressway Expansion",
      "code": "NH44-PKG-02",
      "wbsCode": "WBS-1.2.4",
      "department": "National Highways Authority of India (NHAI)",
      "category": "Roads & Highways",
      "location": "Bengaluru - Hyderabad Corridor",
      "description": "Widening 6-lane elevated highway corridor",
      "baselineStartDate": "2026-01-15T00:00:00.000Z",
      "baselineEndDate": "2027-12-31T00:00:00.000Z",
      "currentProgress": 34.5,
      "plannedProgress": 40.0,
      "status": "AT_RISK",
      "budget": "₹850 Cr",
      "spent": "₹312 Cr",
      "supervisor": "Er. Arvind Rao",
      "contractor": "Larsen & Toubro Ltd."
    }
    ```
  - **Response (201)**: `{ "project": { ... } }`

- **`GET /api/projects/:id`**
  - **Auth**: Optional
  - **Response (200)**: `{ "project": { ... } }`
