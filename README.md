# IEEE ITB Events

A full-stack event-management web application for the **IEEE ITB Student Branch**: a
public catalog where visitors browse events, and an authenticated admin console where
branch officers create, edit, and publish them.

Built with Next.js (App Router), Prisma, and SQLite. TypeScript end to end, with
server-side validation on every write.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Tech stack and rationales](#4-tech-stack-and-rationales)
5. [Local setup](#5-local-setup)
6. [Environment variables](#6-environment-variables)
7. [Database setup](#7-database-setup)
8. [Demo account](#8-demo-account)
9. [Known issues and limitations](#9-known-issues-and-limitations)
10. [AI tools used](#10-ai-tools-used)

---

## 1. Project overview

IEEE ITB needed a lightweight way to publish its event calendar and manage it without
touching a database by hand. This application is that tool, in two halves:

- **Public site** (`/`) — a searchable, filterable catalog of published events, each
  with a detail page. No login required. Drafts, cancelled, and archived events are
  invisible and return a `404` rather than a "you cannot see this" page, so the
  existence of an unpublished event is never leaked.
- **Admin console** (`/admin`) — a password-protected dashboard for creating, editing,
  publishing, and deleting events. Every mutation is re-authorised on the server;
  hiding a button in the UI is never treated as access control.

Both halves read and write through the **same service layer** and the **same Zod
schemas**, so the web UI and the REST API cannot drift apart in their validation rules
or their database queries. This is the central design decision in the codebase.

### Quick demo path

```bash
npm run setup     # generate client, apply migrations, seed demo data
npm run dev       # http://localhost:3000
```

Then sign in at <http://localhost:3000/admin/login> with the demo credentials in
[section 8](#8-demo-account).

---

## 2. Features

### Must-have

| # | Requirement | Where |
| - | ----------- | ----- |
| 1 | Event list page | `src/app/page.tsx` — search, filters, sort, pagination |
| 2 | Event detail page | `src/app/events/[slug]/page.tsx` |
| 3 | Admin login page | `src/app/admin/login/page.tsx` |
| 4 | Admin dashboard | `src/app/admin/(console)/page.tsx` — metrics, "needs attention", next events |
| 5 | Create / edit event forms | `src/components/admin/event-form.tsx` (one component, both pages) |
| 6 | Delete with confirmation | `src/components/admin/delete-event-button.tsx` + `ui/confirm-dialog.tsx` |
| 7 | Responsive UI | Tailwind breakpoints; table → cards under `md`, collapsible admin nav |
| 8 | Form validation + feedback | Zod on the server, per-field messages, focus moved to first invalid field |
| 9 | Loading states | `loading.tsx` on every data route, mirroring the real layout |
| 10 | Empty states | `ui/states.tsx` → `EmptyState`, on catalog, admin list, and dashboard |
| 11 | Error states | `error.tsx` boundaries on public, admin, and login routes |
| 12 | Authentication | Opaque server-side sessions, `scrypt` password hashing |
| 13 | API endpoints | `/api/events`, `/api/events/:id`, `/api/auth`, `/api/health` |
| 14 | Database persistence | Prisma + SQLite; no mock or hardcoded data anywhere |

### Should-have — all implemented

| Feature | Notes |
| ------- | ----- |
| Event search | Matches title, summary, location, city, organiser |
| Upcoming / past filtering | Plus `today`, `week`, `month` |
| Pagination | 6 / 9 / 12 per page, page state lives in the URL |
| Image upload | Form + `POST /api/events/:id/image`, signature-verified |
| Improved auth handling | Revocable sessions, constant-time login, open-redirect guard |
| Reusable service layer | `lib/services/*` shared by Server Actions and route handlers |
| More filters | Category, format, price band, featured; facet counts in the sidebar |
| Dashboard statistics | Live counts per status, occupancy %, revenue proxy |

---

## 3. Architecture

### The core idea

Two transports, one implementation:

```
                     ┌──────────────────────────────┐
  Browser UI ──────► │  Server Actions               │
  (forms)            │  src/app/actions/*            │
                     └───────────────┬──────────────┘
                                     │
  HTTP client ──────► ┌──────────────▼──────────────┐
  (curl/Postman)     │  Route Handlers              │
                     │  src/app/api/*               │
                     └───────────────┬──────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │  lib/services/*              │  ← the only place
                     │  event-service, auth-service │    business logic
                     └───────────────┬──────────────┘    lives
                                     │
                     ┌───────────────▼──────────────┐
                     │  lib/validation/*  (Zod)     │  ← one schema
                     │  lib/auth/guard, session     │  for both
                     └───────────────┬──────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │  Prisma → SQLite              │
                     └──────────────────────────────┘
```

If a rule needs changing — say, capacity may never be below the attendee count — it is
changed in **one** Zod schema and **one** service function. The admin form and the
public API both pick it up automatically. The duplication that a "form calls the API"
design would force is avoided entirely, and there is no HTTP hop between the UI and the
database.

### Request lifecycle (admin edit, for example)

1. `admin/(console)/layout.tsx` calls `requireAdminPage()`. No valid session → redirect
   to `/admin/login?next=…`. The guard lives in the **layout**, so every route added
   under `/admin` later is protected by default rather than by remembering to add a
   check.
2. The page reads the event through `event-service.getEventById(id, "admin")`.
   `scope: "admin"` means drafts and archived events are reachable — an admin must be
   able to edit what the public cannot see.
3. `toEditableEvent()` re-validates the stored row through the form schema. A record
   that predates a rule change is reported, not silently coerced.
4. Submit → `updateEventAction` → `requireAdminApi()` again (a forged POST is still
   rejected) → schema validation → upload resolution → `updateEvent` → `revalidatePath`.

### Error handling

| Layer | Mechanism |
| ----- | --------- |
| Service | Throws `AppError` (`code`, `message`, optional per-field `details`) |
| Server Action | Catches, maps to a typed `FormState` the form renders inline |
| Route Handler | `route()` wrapper maps any throw to the JSON error envelope |
| Prisma errors | `P2002` → `409 CONFLICT`, `P2025` → `404 NOT_FOUND` |
| Unknown errors | Logged server-side, reported as a generic `500` — no stack traces to the browser |

Every `/api` response uses one envelope, so a client branches on a single boolean:

```jsonc
{ "ok": true,  "data": …, "meta": { "total": 16, "page": 1 } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "title": ["…"] } } }
```

The HTTP status is **derived from the error code** via one table (`lib/errors.ts`),
never chosen at the call site. That is what stops a `403` from being returned as a `500`
and having clients retry an action that will never succeed.

### Authentication

Opaque, server-side sessions — chosen over stateless JWTs deliberately:

1. Login verifies the password with **`scrypt`** (memory-hard, from `node:crypto`, so no
   native dependency to compile) using `timingSafeEqual` for the comparison.
2. 32 bytes of CSPRNG entropy become the **raw token**.
3. Only `HMAC-SHA256(SESSION_SECRET, rawToken)` is written to the database. A stolen
   database dump cannot be replayed as a login, because the key is in the environment.
4. The raw token goes into an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie,
   so XSS cannot read it.
5. Sign-out **deletes the row**, so the session is genuinely revoked — unlike a JWT,
   which stays valid until it expires.

The key is present in the DB as a `UNIQUE` column and looked up on every request, which
means the lookup *is* the check. An unknown or expired token simply finds nothing.

The login path also runs a **decoy `scrypt`** when the email is unknown, so response
timing does not reveal which addresses have accounts.

### Database schema

```
User ──< Session          (cascades on delete; tokenHash is UNIQUE)
  │
  └──< Event             (createdById → User; slug is UNIQUE)
```

`Event` carries the brief's required `id`, `title`, `description`, `date`, `location`,
`status` plus `slug`, `summary`, `category`, `format`, `startDate`/`endDate`, `address`,
`city`, `organizer`, `price`, `capacity`, `attendees`, `imageUrl`, `isFeatured`.

`Session` is the one addition beyond the brief, and it exists so authentication is
revocable (see above).

**The slug is immutable.** It is part of the public URL, so renaming a title must not
break links that were already shared.

### Timezone handling

`datetime-local` inputs post a wall-clock string with no timezone. Parsing that with
`new Date()` would silently use the *server's* timezone, so an event created on a laptop
in Bandung could shift by a day once deployed elsewhere. The app presents all times in
**WIB (UTC+7, no DST)**: `lib/validation/event.ts` applies the offset explicitly, and
`lib/format.ts` formats with `timeZone: "Asia/Jakarta"`. Because WIB has no DST, the
offset is plain arithmetic rather than a zone lookup, and `startOfWibDay` / `endOfWibDay`
/ `wibDayKey` are exported for the "is this today?" comparisons in `?when=today`,
`formatRelativeDay`, and `formatEventRange`.

Day boundaries are the part that is easy to get wrong. `setHours(0, 0, 0, 0)` uses the
*host's* zone, so a deployment on UTC would have filed a 02:00 WIB event under the
previous day — and since WIB midnight is 17:00 UTC, "today" would be wrong for seven
hours of every day. Those helpers pin the boundary to WIB, so the result is now genuinely
identical on every machine.

### Public vs. admin scope

`getEventBySlug` / `getEventById` take a `scope: "public" | "admin"`. Public reads filter
to `PUBLISHED` and `SOLD_OUT` **in the query**, not in the UI, so a draft is simply
absent. An unpublished event returns `404` from the API and page — never `403` — because
`403` would confirm the slug exists.

---

## 4. Tech stack and rationales

| Layer | Choice | Why |
| ----- | ------ | --- |
| Framework | **Next.js 16** (App Router, React 19) | Server Components let the catalog and detail pages query the database directly — no fetch-to-self, no separate API server. One process, one deploy. Streaming + `loading.tsx` give real loading states rather than spinners bolted on afterwards. |
| Language | **TypeScript 5.9**, `strict` | The brief's cross-field rules (end ≥ start, attendees ≤ capacity) are enforced by types and one schema. `next.config.ts` enables `typedRoutes`, so a typo'd `<Link href>` is a compile error. |
| Database | **SQLite** via **Prisma 7** | Zero setup for an evaluator: no server to install, the DB is a file. Prisma gives real migrations and a typed client. Swapping to Postgres means changing the datasource block and the driver adapter. |
| Driver adapter | `@prisma/adapter-better-sqlite3` | Prisma 7 talks to SQLite through an explicit adapter rather than a bundled engine. Synchronous `better-sqlite3` is a good match for a read-mostly workload this size. |
| Validation | **Zod 4** | One schema parses form input, JSON API input, and the query string. It is the *only* validation layer — client-side checks are convenience, never the gate. |
| Auth | `node:crypto` `scrypt` + HMAC sessions | No auth dependency, no native build step, and the design is explainable end to end in an interview. See [above](#authentication). |
| Styling | **Tailwind CSS 4** | Design tokens are CSS variables in `globals.css`; utilities keep components consistent without a component library, and the brief said UI design is not being evaluated. |
| Fonts | `next/font` (Inter, JetBrains Mono) | Self-hosted and preloaded, so no layout shift and no request to a third party at runtime. |

**Deliberately not used:** a UI component library (the brief exempts UI design and a
design system would obscure the full-stack work), a state-management library (Server
Components carry the data; client state is only filter inputs and dialog visibility),
and an ORM alternative or raw SQL (Prisma's typed client is enough and is far easier to
review).

---

## 5. Local setup

### Prerequisites

- **Node.js 20 or newer** (developed on 24)
- **npm** (ships with Node)

No database server, no Docker, no global installs.

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    Then set SESSION_SECRET — see step 6 below.

# 3. Generate the Prisma client, apply migrations, and load demo data
npm run setup

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>. The catalog is at `/`, the console at `/admin`.

`npm run setup` is just the three steps below chained; run them individually if you
prefer to see what each does:

```bash
npm run db:generate      # generate the Prisma client
npm run db:migrate       # apply migrations (creates prisma/dev.db)
npm run db:seed          # demo admin + 16 events
```

### Verifying the install

```bash
npm run verify           # typecheck + lint + production build + smoke test
npm run smoke            # boots the server and exercises the API end to end
```

`npm run smoke` starts the app on a scratch database, then runs 87 checks: the public
catalog returns seeded events, filters and pagination behave, a draft is **not** publicly
visible, unauthenticated writes are rejected with `401`, an authenticated admin can
create → read → update → delete, and cover uploads are stored, served back, and refused
when oversized or when the bytes do not match the declared type. It cleans up after
itself and prints a pass/fail summary.

Two things worth knowing:

- It runs `next dev`, not `next start`. A production server snapshots `public/` at boot,
  so a file uploaded *during* the test is never served — which would make the upload
  round-trip untestable. Its build output goes to `.next-smoke/`, so testing never
  invalidates a production build.
- It needs the port free. If something is already listening, it says so and stops
  instead of testing someone else's server; override with `SMOKE_PORT=3200`.
- The uploaded cover is written to `public/uploads` (required for it to be servable) and
  the single generated file is deleted afterwards. Your own files there are untouched.

### All scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `build:webpack` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck, lint, build, and the smoke test, in that order |
| `npm run smoke` | End-to-end API smoke test against a scratch database |
| `npm run setup` | generate + migrate + seed |
| `npm run db:migrate` / `db:migrate:dev` | Apply / create migrations |
| `npm run db:seed` | Load demo data (**destructive** — clears events and sessions) |
| `npm run db:studio` | Prisma Studio, to browse the data |
| `npm run db:reset` | Drop, re-migrate, and re-seed |

---

## 6. Environment variables

Copy `.env.example` to `.env`. **No secret is committed**; `.env` is git-ignored and only
`.env.example` is tracked.

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `DATABASE_URL` | yes | `file:./prisma/dev.db` | SQLite connection string. Resolved from the project root. |
| `SESSION_SECRET` | **in production** | dev fallback | HMAC key for session-token hashing. **≥ 16 characters.** |
| `UPLOAD_DIR` | no | `./public/uploads` | Where cover images are written. |
| `NEXT_PUBLIC_SITE_URL` | no | — | Reserved for the deployed base URL. **Currently unused** — `layout.tsx` sets no `metadataBase`, so OG URLs stay relative. |
| `API_ALLOWED_ORIGINS` | no | *(empty)* | Comma-separated CORS allow-list. Empty means `*` on the public read endpoints. |
| `SEED_ADMIN_EMAIL` | no | `admin@ieee-itb.ac.id` | Email created by `npm run db:seed`. |
| `SEED_ADMIN_PASSWORD` | no | `Admin#2026!` | Password created by `npm run db:seed`. |
| `SEED_ADMIN_NAME` | no | `Bagas Prakoso` | Display name for the seeded admin. |

Generate a real secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Development convenience:** if `SESSION_SECRET` is unset, the app falls back to a
> fixed development key and logs a warning. That keeps a fresh clone runnable without
> configuration — but it **throws in production** rather than silently signing sessions
> with a public constant.

---

## 7. Database setup

### Schema

Defined in `prisma/schema.prisma`. Three models: `User`, `Session`, `Event` (see
[Architecture](#database-schema)).

> **Note on enums:** SQLite has no native `enum` type, so `status`, `category`, and
> `format` are stored as `String`. The values are constrained by TypeScript unions and
> Zod schemas in `src/lib/constants.ts` and `src/lib/validation/`, so an invalid value
> still cannot reach the database through the app.

### Migrations

```bash
npm run db:migrate        # apply all pending migrations
npm run db:migrate:dev    # create a new migration after editing the schema
```

Migrations live in `prisma/migrations/` and are committed, so a fresh clone gets the
exact same schema — no manual SQL.

### Seed

```bash
npm run db:seed
```

Creates one admin and 16 events spanning every status (draft, published, sold out,
cancelled, archived), every category, every format, and a mix of past and future dates
— chosen so that every filter combination and empty state is reachable in a demo.

> **The seed clears the `events` and `sessions` tables first.** Never point it at
> anything you care about.

Override the demo account without editing the file:

```bash
SEED_ADMIN_EMAIL=me@example.com SEED_ADMIN_PASSWORD='Something#Strong1' npm run db:seed
```

### Inspecting the data

```bash
npm run db:studio
```

### Starting completely fresh

```bash
npm run db:reset         # drop + re-migrate + re-seed
```

---

## 8. Demo account

Seeded by `npm run db:seed`:

| Field | Value |
| ----- | ----- |
| URL | <http://localhost:3000/admin/login> |
| Email | `admin@ieee-itb.ac.id` |
| Password | `Admin#2026!` |

> **These are throwaway demo credentials, committed on purpose** so an evaluator can
> sign in without any setup. They are not a real account and must be changed before any
> real deployment.

If you set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding, those values win.

### Trying it without the UI

```bash
# 1. Log in and capture the session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ieee-itb.ac.id","password":"Admin#2026!"}'

# 2. Read the public catalog
curl http://localhost:3000/api/events

# 3. Create an event
# Dates are naive local time (WIB), "YYYY-MM-DDTHH:MM" — no Z, no milliseconds.
# endDate is optional and defaults to startDate.
curl -b cookies.txt -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Event","summary":"Created via the REST API.",
       "description":"A description that is comfortably longer than the thirty character minimum.",
       "category":"WORKSHOP","format":"IN_PERSON","status":"DRAFT",
       "startDate":"2026-12-01T09:00","endDate":"2026-12-01T12:00",
       "location":"Lab Elektronika",
       "city":"Bandung","organizer":"IEEE ITB Student Branch",
       "price":0,"capacity":50,"attendees":0,"isFeatured":false}'

# 4. Delete it again
curl -b cookies.txt -X DELETE http://localhost:3000/api/events/<id>
```

### API reference

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| `GET` | `/api/events` | public | List, filter, sort, paginate. Only `PUBLISHED` / `SOLD_OUT`. |
| `POST` | `/api/events` | admin | Create an event. `201` on success. |
| `GET` | `/api/events/:id` | public | Read one. `404` for a non-public event. |
| `PATCH` | `/api/events/:id` | admin | Partial update; validates the **merged** result. |
| `DELETE` | `/api/events/:id` | admin | Delete. |
| `POST` | `/api/events/:id/image` | admin | Upload a cover image (`multipart/form-data`, field `image`). |
| `DELETE` | `/api/events/:id/image` | admin | Clear the cover image. |
| `POST` | `/api/auth` | public | Authenticate; sets the session cookie. |
| `GET` | `/api/auth` | — | Current session, or `401`. |
| `DELETE` | `/api/auth` | — | Revoke the session. |
| `GET` | `/api/health` | public | Liveness + database connectivity. |

> The three auth operations are **methods on one resource**, not separate
> sub-paths. `POST /api/auth/login` and `GET /api/auth/me` do not exist.

**Query parameters** for `GET /api/events`: `q`, `category`, `format`, `status`, `when`
(`all`/`upcoming`/`past`/`today`/`week`/`month`), `price`, `sort`, `featured`, `page`,
`perPage`. All validated by Zod, and the two behave differently on purpose: `page` and
`perPage` fall back to their defaults so a hand-typed `?page=abc` still renders, while an
unrecognised enum value (`?sort=sideways`) is a `400` rather than a silent reinterpretation.
`status` only narrows the public set — `?status=DRAFT` returns an empty list, never drafts.

The public read endpoints send permissive CORS headers and never allow credentials;
the mutating verbs are excluded from `Access-Control-Allow-Methods` and require an
`httpOnly` cookie, so a third-party origin cannot drive the admin API with a visitor's
ambient session.

When `API_ALLOWED_ORIGINS` is set, a request whose `Origin` is not on the list gets **no**
`Access-Control-Allow-Origin` header at all. It previously received the first allowed
origin instead: the browser blocked it either way, so it was not a data leak, but the
response advertised an origin the caller did not hold, which makes a denial look like a
success when you inspect it with curl. A request with no `Origin` header is not
cross-origin and is still allowed through.

---

## 9. Known issues and limitations

Listed honestly, roughly in the order I would fix them.

1. **Uploads need a writable filesystem.** Cover images are written to `public/uploads`
   and served as static files. That is ideal for the Node server this targets, but on a
   read-only serverless host (Vercel, most container platforms) the write fails. The fix
   is object storage (S3/R2) behind a storage adapter — `lib/uploads.ts` is already the
   single seam where that would go. Uploads are not resized or re-encoded; a 5 MB PNG is
   stored and served as-is, served through `next/image` for optimisation.
2. **Sessions are not rotated on use.** A token stays valid for its full 8-hour lifetime
   rather than being refreshed on each request. Fixing session fixation properly means
   re-issuing on privilege change at minimum; it was left out as a small, defensible
   simplification for a single-admin app.
3. **No rate limiting on login.** The constant-time work makes enumeration hard, but
   there is no throttle on repeated attempts. `express-rate-limit` or an equivalent at
   the edge would be the first thing to add for a public deployment.
4. **SQLite is single-writer.** Fine for a student branch; it would not survive the
   concurrency of a real ticketing system. The Prisma layer is the only thing that
   would need to change.
5. **Revenue on the dashboard is an estimate** — `attendees × price`, summed in
   application code rather than SQL, because SQLite cannot multiply two columns in an
   aggregate. It is labelled a proxy in the UI and should not be read as accounting.
6. **Image type checking is a signature check, not a full decode.** Each format is matched
   on the bytes that actually identify it - WebP needs `RIFF` *and* `WEBP`, AVIF needs a
   `ftyp` box declaring an AVIF brand - so a WAV file cannot pass as an image and an
   arbitrary ISO-BMFF file cannot pass as AVIF. It is still not a full decode: a
   deliberately crafted polyglot file would pass. Practical risk is low because uploads
   are served as static assets and never executed, and object storage with content-type
   enforcement would remove it entirely.
7. **Timezone is fixed to WIB.** Deliberate — every event is organised in Bandung — but
   a genuinely multi-timezone event would need a per-event zone column.
8. **No automated test suite.** `npm run smoke` covers the API end to end, and
   `npm run verify` covers types, lint, and build, but there are no unit tests for the
   service or validation layer. The first thing I would add with more time.
9. **`npm run smoke` runs `next dev`, so `next start` is untested for runtime uploads.**
   A production server builds its static manifest from `public/` at boot, which is why the
   test uses the dev server: otherwise a file uploaded *during* the run exists on disk but
   is never served, and the upload round-trip cannot be checked at all. The trade-off is
   that how a real production server serves a cover image uploaded after boot is **not
   verified by anything here** — worth confirming on a real deploy, because it is the one
   behaviour the test deliberately cannot reach.
10. **The admin list loads all filter counts up front.** `getAdminStats()` runs ~11
   aggregate queries per request. It is instant at this data size; at a few thousand
   events the status tabs would want caching or a denormalised counter.
11. **No CSRF token on the REST API.** Session cookies are `SameSite=Lax`, which covers
    the common cross-site form-POST case, and the read endpoints refuse credentials via
    CORS. A double-submit token would close the remaining gap for a browser-based
    client on another origin.

---

## 10. AI tools used

**Yes — AI coding assistants were used throughout, and the candidate remains fully
responsible for all submitted code, decisions, and explanations.**

### Tools

- **opencode** — the primary assistant: architecture decisions, writing and refactoring
  components, route handlers, and the service layer; debugging build and type errors;
  writing documentation.
- **GitHub Copilot** — inline completions and chat during development.
- **Google Stitch** — UI reference material for the visual design.

### How it was used, concretely

- **Architecture and scaffolding.** Proposals for the service-layer split, the error
  envelope, the session design, and the public/admin scope model were drafted with AI
  and then critically rewritten — several first drafts were rejected in favour of
  simpler options (for example, the immutability of `slug`, and writing the image
  *before* the row rather than after, so a failure cannot leave a dangling reference).
- **Implementation.** The majority of the component and route code was AI-assisted,
  then reviewed and edited by hand. The comments explaining *why* a non-obvious decision
  was made were written deliberately, because they are the part worth reading.
- **Documentation.** This README was drafted with AI assistance from the actual source,
  then checked against the code — every command, flag, and path in it was verified by
  running it, and the claims were corrected where they did not hold.

### What was verified rather than trusted

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke` (87 checks) all
pass, and the setup path below was followed from a clean state.

The smoke test earned its keep — it found four real bugs, each of which is now covered
by a check that fails if the bug returns:

- **Every catalog filter was dead.** `optionalParam` put `.optional()` *after* the
  transform, so the schema demanded a value for every filter key and any `?when=past`
  request was rejected. The catalog silently fell back to defaults instead of filtering.
- **`POST` / `PATCH /api/events` always returned 422.** `normaliseDates` converted date
  strings to `Date` before validation, but the schema only accepted strings. Removing the
  conversion also fixed a timezone bug: `new Date("2026-12-01T09:00")` resolves in the
  *server's* zone, while the form and `naiveToDate` both mean Jakarta, so the same payload
  would have been stored at a different instant depending on where it was deployed.
- **`PATCH` still 422'd on most events.** A partial update merges fields straight from the
  database, where an unset `address` or `imageUrl` is `null` — and the schema accepted
  only `string`. Both are now `nullish`.
- **A malformed date crashed instead of validating.** Zod runs `superRefine` even after a
  field check has failed, so the transform that was supposed to yield a `Date` had not
  run, and `end.getTime()` threw a `TypeError` — turning a 422 into a 500.
- **The MIME allow-list could be bypassed with `Content-Type: constructor`.** The
  allow-list is a plain object, so an inherited `Object.prototype` member resolved to a
  truthy value and skipped both the type check and the signature check. Lookups now use
  `Object.hasOwn`.
- **Impossible dates were silently accepted.** `Date.UTC` rolls `2026-13-01` forward to
  January 2027 instead of failing, so a mistyped date was stored as a different day with
  no error. The calendar parts are range-checked now, leap years included.
- **`?status=` was ignored on the public catalog.** It is applied as an intersection with
  the publicly visible statuses, so it can narrow the result but never widen it —
  `?status=DRAFT` returns an empty list rather than drafts.
- **`endDate` was required despite every caller treating it as optional**, and the
  documented `curl` example returned 422. Dates are naive WIB (`YYYY-MM-DDTHH:MM`, no `Z`
  or milliseconds), and `endDate` may now be omitted entirely.
- **Image formats were matched on a prefix too weak to identify them.** WebP now needs
  `WEBP` after `RIFF`, so a WAV file no longer passes as an image, and AVIF needs a `ftyp`
  box declaring an AVIF brand, so an arbitrary   ISO-BMFF file no longer passes as AVIF.
- **"Today" was computed in the server's timezone.** `setHours(0, 0, 0, 0)` and
  `new Date(y, m, d)` both use the host's zone, and WIB midnight is 17:00 UTC, so a
  deployment on UTC filed 00:00–07:00 WIB under the previous day. That made `?when=today`
  miss early-morning events and mislabel a same-day event as "Tomorrow". Day boundaries
  are now pinned to WIB; `formatEventRange` had the same flaw in its same-month
  shortcut, which compared `getMonth()` locally against WIB-rendered output.

### What a reviewer should check first

The parts most worth a human's attention, since they encode the reasoning rather than
the syntax:

- `src/lib/services/event-service.ts` — the scope model and the `generateUniqueSlug`
  loop.
- `src/lib/errors.ts` and `src/lib/api.ts` — why status is derived from the code.
- `src/lib/auth/session.ts` and `src/lib/auth/password.ts` — the token/HMAC design and
  the constant-time comparison.
- `src/lib/uploads.ts` — the write-then-update ordering and the signature check.
- `src/lib/validation/event.ts` — the `superRefine` cross-field rules.

---

## Project structure

```
src/
├── app/
│   ├── events/[slug]              # public event detail  — /events/[slug]
│   ├── admin/
│   │   ├── login/               # sign-in (outside the authed group)
│   │   └── (console)/           # layout + guard protects everything inside
│   │       ├── page.tsx         # dashboard
│   │       └── events/          # list, new, [id]/edit
│   ├── actions/                 # Server Actions (auth, events)
│   └── api/                     # REST route handlers
│       ├── auth/  events/  events/[id]/  events/[id]/image/  health/
├── components/
│   ├── public/  admin/  ui/  icons.tsx
├── lib/
│   ├── services/                # business logic — the only place it lives
│   ├── validation/              # Zod schemas (forms + query strings)
│   ├── auth/                    # session, password, guards, redirect safety
│   ├── api.ts  errors.ts  uploads.ts  image-types.ts  constants.ts
│   └── format.ts  routes.ts  utils.ts  cors.ts
├── generated/prisma/            # generated client (git-ignored)
└── ...
prisma/
├── schema.prisma  migrations/  seed.ts
```

Convention files (`error.tsx`, `loading.tsx`) sit next to the route they cover, which is
how Next.js discovers them.

---

## Licence

Submitted as a take-home assignment for the IEEE ITB Student Branch Fullstack Developer
probation programme.
