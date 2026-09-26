# AGENTS.md

Educational SIEM ("Sentinel SOC"): static HTML/CSS/JS frontend at the repo root + an Express/Mongoose REST API in `backend/`. No build step, no bundler, no root `package.json`.

## Commands

Everything npm-related must run from `backend/` — it is the only package.

```bash
cd backend
npm install
npm start       # node server.js
npm run dev     # nodemon server.js
npm run seed    # wipe + reseed the demo data (admin / admin123)
npm run seed -- --keep   # append without wiping
```

There is **no lint, no typecheck, no test suite, and no CI** in this repo. Do not invent or run such commands. Verification is manual: hit `GET /api/health`, then the API routes, then open the pages.

## Environment

- `backend/.env` is gitignored. The var is **`MONGO_URI`**, not `MONGODB_URI` (`config/database.js` reads `process.env.MONGO_URI`). The README is explicit about this now.
- `connectDB()` calls `process.exit(1)` on any connection failure, so the server dies at boot if the URI is missing or MongoDB is unreachable. An empty `MONGO_URI` fails the same way as a bad one.
- This box has **no Linux `node` on PATH**. The `npm` on PATH is the Windows shim (`/mnt/d/Node/npm`) that execs `node.exe` v24. To run a script directly: `/mnt/d/Node/node.exe "$(wslpath -w ./server.js)"`.
- **The server runs as a Windows process, so a WSL `pkill` cannot stop it.** Free the port from the Windows side first or the new process silently loses the bind while the stale one keeps serving old code:
  ```bash
  powershell.exe -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort 5000 |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id \$_ -Force }"
  ```
- For the same reason the server is **not reachable at `127.0.0.1:5000` from WSL**. From WSL use the Windows gateway (`ip route | awk '/default/{print $3}'`, currently `192.168.240.1`). From a Windows browser `http://localhost:5000` is correct.
- MongoDB runs in a Docker container with `--bind_ip_all`, so the WSL IP works for `MONGO_URI`.

## Frontend structure

Every page loads three scripts/stylesheets in this order:

```
layout.css  → components.css  → <page>.css
api.js      → <page>.js
```

- **`api.js`** is the shared runtime and the only place cross-page helpers live: session storage, `requireSession`/`initPage`, `logout`, `apiFetch`/`apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete`, `buildQuery`, `escapeHtml`, `csvCell`, `formatDateTime`/`formatRelative`, `severityClass`, `toast`, `renderPagination`, `debounce`, `startClock`, `downloadFile`. Pages are **classic scripts, not ES modules** — everything is a global.
- **`layout.css`** owns the page shell (reset, two-column grid, sidebar, header, table defaults). It used to be copy-pasted into all five page stylesheets; don't reintroduce that duplication. Add page-specific rules to the page's own stylesheet.
- **`components.css`** owns shared widgets: `.btn` variants, `.badge-*`, `.pagination`/`.page-btn`, `.toast-*`, `.modal-*`, `.field`/`.switch-row`, `.empty-state`. It contains **only class selectors on purpose** — `style.css` (login only) styles bare `input`/`button`, and an element selector outranks a class selector, so mixing them breaks the widgets.

Every page starts with `initPage()`, which returns `false` and redirects to the login page when there is no token. Do not render before that check.

## API contract

Controllers return `{ success: boolean, ... }` and set the status explicitly. `apiGet` and friends already throw on a failed envelope, so page scripts should `try/catch` and show a `toast` rather than inspecting `success`.

List endpoints (`/api/logs`, `/api/alerts`, `/api/incidents`) are **server-paginated** via `utils/paginate.js` and answer with:

```json
{ "success": true, "count": 700, "total": 700, "page": 1, "limit": 25, "pages": 28, "data": [] }
```

`page`/`limit` are clamped and `sort` is checked against an allow-list. If you add a list route, use `parsePaging`/`parseSort`/`paginated` rather than re-implementing it, and keep `data` as the array key — the pages read it.

`Log.severity`, `Alert.severity` and `Incident.priority` are Mongoose enums of `"Low" | "Medium" | "High" | "Critical"` (**title case**). Anything else is a `400`. Use `severityClass()` when building a badge.

All interpolated values must go through `escapeHtml()` — every table is built with `innerHTML`.

## Auth and roles

- `requireAuth` and `requireRole(...roles)` live in `middleware/auth.js`. `req.user` is set by `requireAuth`.
- Reads are open to any signed-in user; **user and settings writes are `admin` only**. Hide the nav with `data-admin-only` and guard in JS, but the API is the actual control.
- A user's role is read live off the document, so an admin that demotes itself immediately loses admin rights on its own token. This is correct — it is also why a second admin is needed to step the first one down.
- `userController` refuses to remove the last active administrator, by demotion, deactivation or deletion. Don't relax this.

## Conventions

Backend: 4-space indent, double-quoted strings, CommonJS `require`, and every file opens with a banner comment naming itself:

```js
// ======================================
// Sentinel SIEM - Logs Module
// logController.js
// ======================================
```

Follow that banner in new backend files. New module shape is `model -> controller -> route -> mount in server.js`, with shared logic in `utils/`.

Frontend: one page = one `.html` + one `.js` + one `.css` triple, flat at the repo root, named to match. Navigation is hand-maintained HTML in each page's sidebar — there is no router or shared layout, so **adding a page means updating every other page's sidebar** or they drift apart. The seven real pages are `index.html` (login) then `dashboard`, `logs`, `alerts`, `incidents`, `reports`, `users`, `settings`.

## Gotchas that will bite you

- `models/Counter.js` allocates incident ids with an **aggregation pipeline**, not `$inc` + `$setOnInsert`. MongoDB rejects both operators on the same field in one classic update ("would create a conflict at 'value'"), and that bug made `POST /api/incidents` fail outright.
- The server registers the `/api/health` route at `/api/health`, **not** `/`. A `GET /` would shadow the static handler and make the login page unreachable.
- `app.use("/backend", ...)` returns 404 before the static handler. Without it, `GET /backend/.env` would hand out the database credentials and the whole source tree. Do not remove it, and do not serve `backend/` statically.
- Page scripts must not use bare `onclick="fn()"` with interpolated ids. Action buttons bind through `data-` attributes and `addEventListener` so database ids never end up inside a handler string (see `alerts.js`).
