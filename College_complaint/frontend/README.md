# CampusCare — React Frontend

A college complaint portal: students submit and track complaints, administrators
review evidence and update statuses.

## Stack

React 18 · React Router 6 · Vite · oidc-client-ts (Cognito) · plain CSS design
system · Lucide icons

## Configuration

All settings come from the shared `.env` at the repository root (Vite is
configured with `envDir` pointing at it). Copy the template once:

```bash
cp ../../.env.example ../../.env    # from this directory
```

Relevant variables:

| Variable | Purpose |
|---|---|
| `VITE_COGNITO_AUTHORITY` | Cognito user-pool OIDC issuer |
| `VITE_COGNITO_CLIENT_ID` | Public SPA app client ID (no client secret) |
| `VITE_API_TARGET` | Backend URL for the dev proxy (default `http://127.0.0.1:5000`) |

## Run locally

```bash
npm install
npm run dev            # http://127.0.0.1:5173
```

The dev server proxies `/api/*` to `VITE_API_TARGET` and strips the `/api`
prefix. All API calls use relative paths (`fetch("/api/complaints")`), so the
same build works behind Nginx without hardcoded hostnames.

## Build & deploy

```bash
npm run build          # outputs dist/
```

Upload `dist/` to the EC2 web root that Nginx serves. Nginx proxies `/api/` to
Flask:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000/;   # note the trailing slash
}
```

## Authentication

Sign-in uses the Amazon Cognito hosted UI through the OIDC authorization-code
flow (`src/auth.js`). The access token is sent as a `Bearer` credential on every
API request. The Flask backend validates the JWT signature against the pool's
JWKS and checks the `Admins` group for administrator routes; the UI role guard
is a convenience, not the security boundary.

## API contract used

| Action | Endpoint | Backend response |
|---|---|---|
| List complaints | `GET /api/complaints` | bare JSON array |
| Create complaint | `POST /api/complaints` `{ studentName, category, description }` | `{ message, complaint: { complaintId, ... } }` |
| Upload evidence | `POST /api/complaints/<id>/evidence` (multipart, field name **`photo`**) | `{ message, complaintId, evidenceKey }` |
| View evidence | `GET /api/complaints/<id>/evidence` | image bytes (authenticated stream) |
| Update status | `PATCH /api/complaints/<id>/status` `{ status }` | `{ message, complaint }` |

Notes on deliberate limitations:

- **Complaint IDs** — the backend returns UUIDs; the UI keeps the UUID as the
  real ID (shown on the detail page) and derives a short display label
  (`CC-XXXXXX`) for tables.
- **Title & Location** — shown on the submit form as *preview only* and **not
  sent**, because the API does not store them yet.
- **Evidence viewing** — the S3 bucket is private; the backend streams objects
  through the authenticated endpoint above. No public S3 URL is ever built.
- **Status timeline** — highlights the current status; per-step timestamps
  would need status-history fields in the backend.

## Structure

```
src/
  api.js                 # relative-path fetch helpers (list/create/upload/view/patch)
  auth.js                # Cognito UserManager configured from env
  helpers.js             # statuses, categories, ID labels, normalization, session
  styles.css             # design system (navy + teal, #F5F7FB, Inter)
  App.jsx                # routes + role-aware layout
  layouts/               # StudentLayout, AdminLayout (sidebar + topbar)
  components/            # table, badges, timeline, evidence, admin modal, states
  pages/                 # Login, StudentDashboard, SubmitComplaint, ComplaintsList,
                         # ComplaintDetail, Notifications, Profile, AdminDashboard, Reports
```
