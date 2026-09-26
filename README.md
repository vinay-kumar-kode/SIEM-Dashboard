# Sentinel SIEM – Security Operations Center (SOC) Monitoring Dashboard

A lightweight, web-based **Security Information and Event Management (SIEM)** dashboard designed to demonstrate the fundamental workflow of a Security Operations Center (SOC).

Sentinel SIEM centralizes security logs, visualizes monitoring statistics, manages alerts, and tracks security incidents through a modular web application.

> **Project Type:** Educational / Academic SIEM Implementation

## Overview

Security Information and Event Management (SIEM) systems collect, normalize, and analyze security events from different sources to help administrators monitor threats and respond to incidents.

**Sentinel SIEM** demonstrates these concepts through a centralized web interface with modules for:

- Security monitoring dashboard
- Security log management
- Alert management
- Incident tracking
- Role-based user management
- Administrator login
- Reports and CSV/PDF export
- REST API-based backend services
- MongoDB data storage

The project provides a simplified SOC environment suitable for learning and demonstrating core SIEM concepts.

## Objectives

- Centralize security log monitoring
- Provide security event visualization
- Manage and prioritize security alerts
- Track incidents throughout their lifecycle
- Store security events using MongoDB
- Provide REST API integration between the frontend and backend
- Demonstrate a modular SOC monitoring workflow

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| API Testing | Postman |
| Development | VS Code, Git |

## System Architecture

The application follows a client-server architecture:

```text
┌──────────────────────────────┐
│        Web Browser           │
│   Dashboard / Logs / Alerts  │
│       / Incidents            │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       Node.js + Express      │
│                              │
│ Routes → Controllers         │
│                              │
│ Dashboard / Logs / Alerts    │
│ Incidents / Reports          │
└──────────────┬───────────────┘
               │
               │ Mongoose
               ▼
┌──────────────────────────────┐
│           MongoDB            │
│                              │
│ Logs / Alerts / Incidents    │
│ Users                        │
└──────────────────────────────┘
```

The browser communicates with REST APIs implemented using Express.js. Controllers process requests and Mongoose provides interaction with MongoDB.

## Key Modules

### 1. Administrator Login

The login module provides an administrator entry point before accessing the SIEM dashboard.

![Login Module]
<img width="1192" height="828" alt="login" src="https://github.com/user-attachments/assets/baa194f2-c774-4bf3-b0f2-0cd572eb97b2" />


### 2. SOC Dashboard

The dashboard provides an overview of the security environment, including:

- Total logs
- Active alerts
- Critical alerts
- Online hosts
- Threat score
- Event timeline
- Severity distribution
- Recent alerts
- Recent logs

![SOC Dashboard]
<img width="1192" height="838" alt="dashboard" src="https://github.com/user-attachments/assets/b71895b6-be9a-4487-8ed5-9697a0bf3011" />


### 3. Security Logs

The Logs module displays security events with:

- Timestamp
- Source IP
- Severity
- Event type
- Current status

It also provides search and export functionality to assist with log analysis.

![Security Logs]
<img width="1192" height="496" alt="logs" src="https://github.com/user-attachments/assets/23965306-a52e-400d-b329-307352d746ef" />


### 4. Security Alerts

The Alerts module prioritizes security events according to severity and provides actions for handling alerts.

The dashboard tracks:

- Total alerts
- Critical alerts
- Open alerts
- Resolved alerts

Analysts can acknowledge or resolve security alerts.

![Security Alerts]
<img width="1192" height="412" alt="alerts" src="https://github.com/user-attachments/assets/d80b1fa8-bb5a-4e09-9f48-5da7240ac1cd" />


### 5. Incident Management

The Incident Management module tracks detected incidents and their lifecycle.

It includes:

- Incident ID
- Detection time
- Priority
- Incident type
- Assigned analyst
- Current status
- Assignment and closure actions

The incident lifecycle is represented using statuses such as **Open**, **In Progress**, and **Closed**. Incident identifiers are allocated as gapless `INC-1001` style values from an atomic MongoDB counter, so concurrent creation cannot collide.

![Incident Management]
<img width="1192" height="824" alt="incidents" src="https://github.com/user-attachments/assets/881a0d7b-e8e4-4041-ae88-8ff55d0240d3" />

### 6. User Management (admin only)

Administrators can create, edit, disable and delete accounts, and change the role between `analyst` and `admin`.

- Usernames are normalised to lower case and must be unique
- Passwords are stored as scrypt digests, never plaintext
- An admin cannot delete their own account
- The last active administrator cannot be demoted, disabled or deleted, which would otherwise lock the deployment out of user and settings management
- Analysts do not see this page, and the API rejects their attempts with `403`

### 7. SOC Settings (admin only)

A single settings document holds the tuning knobs:

- Organisation name
- Auto-refresh interval (2–300 s), which the dashboard actually polls at
- Log retention in days
- Auto-escalation severity threshold
- Whether to mask source IPs in exported reports

## Security

- Passwords are hashed with scrypt (`salt:hash`) and compared in constant time
- Login is session-token based; the token lives on the user document with an 8 hour expiry, so logging out or disabling an account invalidates it immediately
- Login failures return one message for both an unknown user and a wrong password, so the response does not reveal which accounts exist
- Every route except `/api/health` and `/api/auth/login` requires a bearer token; user and settings writes additionally require the `admin` role
- All interpolated values are HTML-escaped before being placed into a table, so a log message cannot inject markup
- `?sort=` is validated against an allow-list rather than interpolated into the query
- The backend serves the frontend off its own disk on a single origin and refuses any request under `/backend`, so `.env` and the source tree are not downloadable

## Database

Collections:

| Collection | Purpose |
|---|---|
| `logs` | Raw security events |
| `alerts` | Escalated events with an analyst workflow state |
| `incidents` | Investigations, optionally linked to the alerts that raised them |
| `users` | Accounts, roles and session tokens |
| `settings` | Single SOC configuration document, keyed `soc` |
| `counters` | Atomic sequences for incident identifiers |

`logs` stores timestamp, source IP, source, event type, severity, message and status. Severity is a Mongoose enum of `Low`, `Medium`, `High`, `Critical` in **title case** — the API rejects anything else with `400`.

Seed the database with a realistic week of activity:

```bash
cd backend
npm run seed          # wipe and reseed
npm run seed -- --keep   # append without wiping
```

This creates 700 logs, 60 alerts, 18 incidents, 6 users and the settings document. Sign in with **admin / admin123**.

## Backend

The backend exposes the full REST API. Express routes delegate to controllers, which talk to MongoDB through Mongoose models. The three list endpoints are server-paginated.

```text
backend/
├── config/
│   └── database.js          # mongoose connection
├── controllers/
│   ├── alertController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── incidentController.js
│   ├── logController.js
│   ├── settingsController.js
│   └── userController.js
├── middleware/
│   └── auth.js              # requireAuth, requireRole
├── models/
│   ├── Alert.js
│   ├── Counter.js           # atomic id sequences
│   ├── Incident.js
│   ├── Log.js
│   ├── Settings.js
│   └── User.js
├── routes/
│   ├── alertRoutes.js
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── incidentRoutes.js
│   ├── logRoutes.js
│   ├── settingsRoutes.js
│   └── userRoutes.js
├── utils/
│   └── paginate.js          # shared paging / sorting for list routes
├── .env                     # gitignored
├── package.json
├── seed.js
└── server.js
```

### API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | public | Liveness check |
| `POST` | `/api/auth/login` | public | Exchange credentials for a token |
| `GET` | `/api/auth/me` | any | Current user |
| `POST` | `/api/auth/logout` | any | Invalidate the token |
| `GET` | `/api/dashboard` | any | Card totals, severity rollup, 24 h timeline, recent activity |
| `GET` `POST` | `/api/logs` | any | List (paged) / create |
| `GET` `DELETE` | `/api/logs/:id` | any | Fetch / delete |
| `GET` | `/api/logs/stats` | any | Severity rollup |
| `GET` `POST` | `/api/alerts` | any | List (paged) / create |
| `GET` `DELETE` | `/api/alerts/:id` | any | Fetch / delete |
| `PATCH` | `/api/alerts/:id/acknowledge` | any | Triage |
| `PATCH` | `/api/alerts/:id/resolve` | any | Close out |
| `GET` | `/api/alerts/stats` | any | Severity and status rollup |
| `GET` `POST` | `/api/incidents` | any | List (paged) / create |
| `GET` `DELETE` | `/api/incidents/:id` | any | Fetch (with alerts populated) / delete |
| `PATCH` | `/api/incidents/:id/assign` | any | Assign, moves to In Progress |
| `PATCH` | `/api/incidents/:id/close` | any | Close with a resolution |
| `GET` | `/api/incidents/stats` | any | Status rollup |
| `GET` | `/api/users` | any | List accounts |
| `POST` `PUT` `DELETE` | `/api/users`, `/api/users/:id` | **admin** | Manage accounts |
| `GET` | `/api/settings` | any | Read SOC settings |
| `PUT` | `/api/settings` | **admin** | Update SOC settings |

### List query parameters

`GET /api/logs`, `/api/alerts` and `/api/incidents` accept:

| Parameter | Default | Notes |
|---|---|---|
| `page` | `1` | 1-based; values below 1 are clamped |
| `limit` | `25` | Capped at 100 |
| `sort` | `-timestamp` | Allow-listed fields only |
| `search` | – | Regex across the module's text fields, escaped |
| filters | – | `severity`, `source`, `status`, `priority` as applicable |

The response envelope is:

```json
{
  "success": true,
  "count": 700,
  "total": 700,
  "page": 1,
  "limit": 25,
  "pages": 28,
  "data": []
}
```

## Frontend Structure

Static HTML/CSS/JS, no build step and no bundler. The backend serves these files directly, so the whole app runs on a single origin.

```text
SIEM-Dashboard/
├── index.html            # login
├── dashboard.html
├── logs.html
├── alerts.html
├── incidents.html
├── reports.html
├── users.html            # admin only
├── settings.html         # admin only
│
├── api.js                # shared runtime: session, transport, UI helpers
├── login.js
├── dashboard.js
├── logs.js
├── alerts.js
├── incidents.js
├── reports.js
├── users.js
├── settings.js
│
├── style.css             # login screen only
├── layout.css            # shared page shell (sidebar, header, tables)
├── components.css        # shared buttons, badges, pagination, modal, toast
├── dashboard.css
├── logs.css
├── alerts.css
├── incidents.css
├── reports.css
├── users.css
├── settings.css
└── backend/
```

`api.js` is loaded by every page and exposes globals — the pages are classic scripts, not ES modules. It holds the session token helpers, the auth guard, `apiFetch`/`apiGet`/`apiPost`/…, HTML escaping, date formatting, toasts, pagination rendering and the page clock. A page script calls `initPage()` first, which bails out to the login page when there is no token.

`layout.css` and `components.css` are shared because the sidebar, header and table styling had been copy-pasted into all five page stylesheets. Page stylesheets now only describe what is unique to their page.

## Installation

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB
- Git

### 1. Clone the repository

```bash
git clone https://github.com/vinay-kumar-kode/SIEM-Dashboard.git
cd SIEM-Dashboard
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory.

> The variable is **`MONGO_URI`**, not `MONGODB_URI`. `config/database.js` reads `process.env.MONGO_URI`, and the process exits immediately if it is missing or unreachable.

For a local MongoDB:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/sentinel_siem
```

For MongoDB Atlas:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sentinel_siem?retryWrites=true&w=majority
```

Do **not** commit `.env` to GitHub — it is gitignored.

### 4. Seed the database

```bash
npm run seed
```

Creates the demo week of activity plus the `admin` account. Sign in with **admin / admin123**.

### 5. Start the backend

```bash
npm start        # node server.js
npm run dev      # nodemon, restarts on change
```

The server hosts both the API and the frontend on one origin, so there is nothing else to launch and no CORS configuration to do.

### 6. Open the app

```
http://localhost:5000
```

If you are running the backend inside WSL against a Windows-hosted browser, note that WSL's `localhost` and the Windows host are separate: reach the server from the WSL side via the gateway address instead (`ip route | awk '/default/{print $3}'`).

## Testing

There is no test framework in the repo, so verification was done by exercising the running server directly. Coverage:

- **API (74 checks)** — login and generic failure messages, token rejection, every read route, the full log/alert/incident lifecycles, validation failures, role enforcement for analysts, user CRUD, the last-administrator guards, disabled accounts, settings round-trip, `/backend/.env` refusal, malformed JSON handling, and logout invalidation
- **Frontend (127 checks)** — HTML escaping against script/attribute/SQL payloads, CSV quoting, severity class mapping, formatter tolerance of bad input, query-string building, and a field-by-field contract check that every property each page script reads is actually present in the live API response
- **Pages** — every page parses, has no duplicate element ids, loads `api.js` and `components.css`, wires logout, and has no dead navigation links
- **Manual** — the pages were exercised in a browser against the seeded database

The seed must be re-run between destructive test passes, since the user-management checks intentionally demote and delete accounts.

## Results

Sentinel SIEM successfully demonstrates a simplified SOC monitoring workflow by:

- Displaying security events
- Visualizing security statistics
- Categorizing alerts by severity
- Managing alert status
- Tracking incidents
- Providing centralized monitoring through a web interface

## Project Advantages

- Lightweight and educational
- Centralized security monitoring
- Modular architecture
- Responsive web interface
- REST API-based backend
- MongoDB-backed data storage
- Extensible architecture

## Future Enhancements

Already implemented and previously listed here: role-based access control, user management, and server-side pagination.

Potential improvements:

- Real-time updates using Socket.IO instead of polling
- Email or webhook notifications on critical alerts
- IDS integration and log shipper agents
- Security event correlation rules
- Scheduled report generation
- Log retention enforced by a TTL index rather than a stored setting
- Per-analyst audit trail of alert and incident actions

## Disclaimer

This project is intended for **educational and demonstration purposes**. It is a simplified SIEM implementation and is not intended to replace production-grade enterprise SIEM platforms.

## Author

**Vinay Kumar Kode**

GitHub: https://github.com/vinay-kumar-kode

Repository: https://github.com/vinay-kumar-kode/SIEM-Dashboard
