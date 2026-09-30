# IEEE ITB Events

**A full-stack event platform for the IEEE ITB Student Branch.** A public storefront
where anyone can browse and discover events, plus a password-protected admin console
where branch officers create, edit, publish, and retire them — no database hand-editing
required.

Built with **Next.js**, **Prisma**, and **SQLite**, end to end in TypeScript.

The catalog looks like a shop you already trust. That's not an accident — see
[the design story](#-the-design-story).

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [The design story](#the-design-story)
3. [Features](#2-features)
4. [Architecture](#3-architecture)
5. [Tech stack and rationales](#4-tech-stack-and-rationales)
6. [Local setup](#5-local-setup)
7. [Environment variables](#6-environment-variables)
8. [Database setup](#7-database-setup)
9. [Demo account](#8-demo-account)
10. [API reference](#api-reference)
11. [Known issues and limitations](#9-known-issues-and-limitations)
12. [AI tools used](#10-ai-tools-used)
13. [Project structure](#project-structure)

---

## 1. Project overview

IEEE ITB needed a lightweight way to publish its event calendar and manage it without
touching a database by hand. This application is that tool, in two halves:

- **Public site** (`/`) — a searchable, filterable catalog of published events, each
  with its own detail page. No login required. Drafts, cancelled, and archived events
  are invisible and return a `404` rather than a "you cannot see this" page, so the
  existence of an unpublished event is **never leaked**.
- **Admin console** (`/admin`) — a password-protected dashboard for creating, editing,
  publishing, and deleting events. Every mutation is re-authorised on the server;
  hiding a button in the UI is never treated as access control.

Both halves speak to the **same service layer** through the **same Zod schemas**, so the
web UI and the REST API cannot drift apart in validation rules or database queries.
That single decision is the spine of the whole codebase.

**The 60-second tour:**

```bash
npm install && npm run setup   # install, generate client, migrate, seed demo data
npm run dev                    # http://localhost:3000
```

Then sign in at <http://localhost:3000/admin/login> with the demo credentials in
[section 8](#8-demo-account). Done — no database server, no Docker, no global installs.

---

## The design story

*The brief said UI design isn't evaluated — so instead of inventing one, this app
borrowed a look that a billion people already trust.*

Every screen started as a prototype in **Google Stitch**, kept in the repo under
[`design/`](./design/) so you can flip between the source mock and the shipped page.
The colour system practically hand-writes itself from **Amazon's visual language**:

| Token | Hex | Job |
| ----- | --- | --- |
| Amazon orange | `#FF9900` | the one "do it now" colour — Register, Publish, Save |
| Squid-ink navy | `#131921` | headers, footers, the admin rail |
| Slate navy | `#232F3E` | sub-bars and operational surfaces |
| Carton grey | `#F3F3F3` | the page canvas, quiet by default |
| Price-tag navy | `#0F1111` | primary text |
| Warm white | `#FFFFFF` | cards that pop off the grey |

The trick that makes it work: **exactly one accent colour exists.** Orange does the
0.1% of things worth shouting about; everything else is neutral or semantic (green = ok,
red = stop, amber = wait, blue = info). Typography runs Inter for everything humans read
and JetBrains Mono for IDs and codes. Details are in each [`design/*/DESIGN.md`](./design/).

| Stitch screen | Live as |
| ------------- | ------- |
| [`public-catalog`](./design/public-catalog/) | `/` |
| [`event-detail`](./design/event-detail/) | `/events/[slug]` |
| [`admin-login`](./design/admin-login/) | `/admin/login` |
| [`admin-console`](./design/admin-console/) | `/admin` |

---

## 2. Features

### Must-have — all done

| # | Requirement | Where |
| - | ----------- | ----- |
| 1 | Event list page | `src/app/page.tsx` — search, filters, sort, pagination |
| 2 | Event detail page | `src/app/events/[slug]/page.tsx` |
| 3 | Admin login page | `src/app/admin/login/page.tsx` |
| 4 | Admin dashboard | `src/app/admin/(console)/page.tsx` — metrics, "needs attention", upcoming |
| 5 | Create / edit event forms | `src/components/admin/event-form.tsx` (one component, both pages) |
| 6 | Delete with confirmation | `delete-event-button.tsx` + `ui/confirm-dialog.tsx` |
| 7 | Responsive UI | Tailwind breakpoints; table → cards under `md`, collapsible admin nav |
| 8 | Form validation + feedback | Zod on the server, per-field messages, focus to first invalid field |
| 9 | Loading states | `loading.tsx` on every data route, mirroring the real layout |
| 10 | Empty states | `ui/states.tsx` → `EmptyState`, on catalog, admin list, and dashboard |
| 11 | Error states | `error.tsx` boundaries on public, admin, and login routes |
| 12 | Authentication | Opaque server-side sessions, `scrypt` password hashing |
| 13 | API endpoints | `/api/events`, `/api/events/:id`, `/api/auth`, `/api/health` |
| 14 | Database persistence | Prisma + SQLite; no mock or hardcoded data anywhere |

### Should-have — all implemented too

| Feature | Notes |
| ------- | ----- |
| Event search | Matches title, summary, location, city, organiser |
| Upcoming / past filtering | Plus `today`, `week`, `month` |
| Pagination | 6 / 9 / 12 per page; page state lives in the URL |
| Image upload | Form + `POST /api/events/:id/image`, magic-byte verified |
| Improved auth handling | Revocable sessions, constant-time login, open-redirect guard |
| Reusable service layer | Shared by Server Actions and route handlers |
| More filters | Category, format, price band, featured; facet counts in the sidebar |
| Dashboard statistics | Live counts per status, occupancy %, revenue proxy |

---

## 3. Architecture

### The core idea: two transports, one implementation

```
┌──────────────────────────────┐
   Browser UI ──────────────►  │ Server Actions              │
   (forms)                     │ src/app/actions/*           │
                               └───────────────┬──────────────┘
                                               │
   HTTP client ────────────► ┌────────────────▼──────────────┐
   (curl/Postman)            │ Route Handlers                │
                             │ src/app/api/*                 │
                             └───────────────┬──────────────┘
                                               │
                             ┌────────────────▼──────────────┐
                             │ lib/services/*                │ ← the only place
                             │ event-service, auth-service   │ business logic lives
                             └───────────────┬──────────────┘
                                               │
                             ┌────────────────▼──────────────┐
                             │ lib/validation/*  (Zod)       │ ← one schema for both
                             └───────────────┬──────────────┘
                                               │
                             ┌────────────────▼──────────────┐
                             │ Prisma → SQLite                │
                             └──────────────────────────────┘
```

If a rule needs changing — say, capacity may never drop below attendees — it changes in
**one** Zod schema and **one** service function, and both the admin form and the public
API pick it up. No form-calls-API duplication, no HTTP hop between the UI and the
database.

### The edit flow, walked through

1. `admin/(console)/layout.tsx` runs `requireAdminPage()`. No valid session → redirect
   to `/admin/login?next=…`. The guard lives in the **layout**, so any route added under
   `/admin` later is protected by default.
2. The page reads the event through `event-service.getEventById(id, "admin")`, where
   `scope: "admin"` means drafts and archived events are reachable.
3. `toEditableEvent()` re-validates the stored row through the form schema — a record
   that predates a rule change is *reported*, not silently coerced.
4. Submit → `updateEventAction` → `requireAdminApi()` again (a forged POST is still
   rejected) → schema validation → upload resolution → `updateEvent` → `revalidatePath`.

### Error handling

| Layer | Mechanism |
| ----- | --------- |
| Service | Throws `AppError` (`code`, `message`, optional per-field `details`) |
| Server Action | Catches, maps to a typed `FormState` the form renders inline |
| Route Handler | `route()` wrapper maps any throw to the JSON error envelope |
| Prisma errors | `P2002` → `409 CONFLICT`, `P2025` → `404 NOT_FOUND` |
| Unknown errors | Logged server-side, generic `500` — no stack traces to the browser |

Every `/api` response uses one envelope, so a client branches on a single boolean:

```jsonc
{ "ok": true,  "data": …, "meta": { "total": 16, "page": 1 } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "title": ["…"] } } }
```

The HTTP status is **derived from the error code** via one table (`lib/errors.ts`),
never picked at the call site. That's what stops a `403` from being returned as a `500`
and making clients retry an action that will never succeed.

### Authentication

Opaque, server-side sessions — a deliberate alternative to stateless JWTs:

1. Login verifies the password with **`scrypt`** (memory-hard, from `node:crypto`, so no
   native dependency to compile) using `timingSafeEqual`.
2. 32 bytes of CSPRNG entropy become the raw token.
3. Only `HMAC-SHA256(SESSION_SECRET, rawToken)` is stored. A stolen database dump can't
   be replayed as a login — the key lives in the environment.
4. The raw token goes into an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie.
5. Sign-out **deletes the row**, so the session is genuinely revoked — unlike a JWT.

The token hash is a `UNIQUE` column, so the lookup *is* the check. And the login path
runs a **decoy `scrypt`** on unknown email addresses, so response timing never reveals
which addresses have accounts.

### Database schema

```
User ──< Session          (cascades on delete; tokenHash is UNIQUE)
  └──< Event             (createdById → User; slug is UNIQUE)
```

`Event` carries the brief's required `id`, `title`, `description`, `date`, `location`,
`status` plus `slug`, `summary`, `category`, `format`, `startDate`/`endDate`, `address`,
`city`, `organizer`, `price`, `capacity`, `attendees`, `imageUrl`, `isFeatured`.
`Session` is the one model beyond the brief — it exists so auth is revocable.

**The slug is immutable.** It's part of the public URL, so renaming a title must not
break links that were already shared.

### Timezone handling (the part everyone gets wrong)

`datetime-local` inputs post a wall-clock string with no timezone. Parsing that with
`new Date()` would silently use the *server's* zone — an event created in Bandung could
shift by a day once deployed. This app pins every time to **WIB (UTC+7, no DST)**:
`lib/validation/event.ts` applies the offset explicitly, and `lib/format.ts` renders
with `timeZone: "Asia/Jakarta"`. Because WIB has no DST, the offset is plain arithmetic,
and `startOfWibDay` / `endOfWibDay` / `wibDayKey` power the `?when=today` logic.

Day boundaries are the sneaky part. `setHours(0,0,0,0)` uses the *host's* zone, so a
deployment on UTC would have filed a 02:00 WIB event under the previous day — and since
WIB midnight is 17:00 UTC, "today" would be wrong for seven hours of every day. Those
helpers pin the boundary to WIB, so the result is genuinely identical on every machine.

### Public vs. admin scope

`getEventBySlug` / `getEventById` take a `scope: "public" | "admin"`. Public reads filter
to `PUBLISHED` and `SOLD_OUT` **in the query, not in the UI**, so a draft is simply
absent. An unpublished event returns `404` — never `403` — because `403` would confirm
the slug exists.

---

## 4. Tech stack and rationales

| Layer | Choice | Why |
| ----- | ------ | --- |
| Framework | **Next.js 16** (App Router, React 19) | Server Components let the catalog and detail pages query the database directly — no fetch-to-self, no separate API server. Streaming + `loading.tsx` give real loading states. |
| Language | **TypeScript 5.9**, `strict` | Cross-field rules (end ≥ start, attendees ≤ capacity) are enforced by types and one schema. `typedRoutes` turns a typo'd `<Link href>` into a compile error. |
| Database | **SQLite** via **Prisma 7** | Zero setup for an evaluator: no server to install, the DB is a file. Prisma gives real migrations and a typed client. Swapping to Postgres is changing a datasource block. |
| Driver | `@prisma/adapter-better-sqlite3` | Prisma 7 talks to SQLite through an explicit adapter. Synchronous `better-sqlite3` suits a read-mostly, single-writer workload this size. |
| Validation | **Zod 4** | One schema parses form input, JSON API input, and the query string. It's the *only* validation layer — client checks are convenience, never the gate. |
| Auth | `node:crypto` `scrypt` + HMAC sessions | No auth dependency, no native build step, and the design is explainable end to end. |
| Styling | **Tailwind CSS 4** | Design tokens are CSS variables in `globals.css`; utilities keep components consistent without a component library. |
| Fonts | `next/font` (Inter, JetBrains Mono) | Self-hosted and preloaded — no layout shift, no third-party request at runtime. |

**Deliberately not used:** a UI component library (the brief exempts UI design; a design
system would obscure the full-stack work), a state-management library (Server Components
carry the data; client state is only filter inputs and dialog visibility), and anything
more than Prisma's typed client (which is easier to review than hand-rolled SQL).

---

## 5. Local setup

### Prerequisites

- **Node.js 20 or newer** (developed on 24)
- **npm** (ships with Node)

That's the whole list. **No database server, no Docker, no global installs.**

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    Set SESSION_SECRET — see section 6. (Dev works without it; it warns.)

# 3. Generate the Prisma client, apply migrations, load demo data
npm run setup

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>. The catalog is at `/`, the console at `/admin`.

`npm run setup` is just three steps chained; run them individually if you want to see
what each does:

```bash
npm run db:generate     # generate the Prisma client
npm run db:migrate      # apply migrations (creates prisma/dev.db)
npm run db:seed         # demo admin + 16 events
```

### Verifying the install

```bash
npm run verify           # typecheck + lint + production build + smoke test
npm run smoke            # boots the server and exercises the API end to end
```

`npm run smoke` starts the app on a scratch database and runs ~87 checks: the catalog
returns seeded events, filters and pagination behave, a draft is **not** publicly
visible, unauthenticated writes get `401`, an authenticated admin can
create → read → update → delete, and cover uploads are stored, served back, and refused
when oversized or mismatched. It cleans up after itself.

Two things worth knowing:

- It runs `next dev`, not `next start` — a production server snapshots `public/` at
  boot, so a file uploaded *during* the test would never be served. Build output goes to
  `.next-smoke/`, so testing never invalidates a real build.
- It needs its port free (`SMOKE_PORT=3200` to override). It will not test someone
  else's server.

### All scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `build:webpack` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck, lint, build, and smoke test, in that order |
| `npm run smoke` | End-to-end API smoke test on a scratch database |
| `npm run setup` | generate + migrate + seed |
| `npm run db:migrate` / `db:migrate:dev` | Apply / create migrations |
| `npm run db:seed` | Load demo data (**destructive** — clears events and sessions) |
| `npm run db:studio` | Prisma Studio, to browse the data |
| `npm run db:reset` | Drop, re-migrate, and re-seed |

---

## 6. Environment variables

Copy `.env.example` to `.env`. **No secret is committed** — `.env` is git-ignored and
only `.env.example` is tracked.

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `DATABASE_URL` | yes | `file:./prisma/dev.db` | SQLite connection string, resolved from project root. |
| `SESSION_SECRET` | **in production** | dev fallback | HMAC key for session-token hashing. **≥ 16 characters.** |
| `UPLOAD_DIR` | no | `./public/uploads` | Where cover images are written. |
| `NEXT_PUBLIC_SITE_URL` | no | — | Reserved for the deployed base URL. Currently unused — OG URLs stay relative. |
| `API_ALLOWED_ORIGINS` | no | *(empty)* | Comma-separated CORS allow-list. Empty means `*` on public read endpoints. |
| `SEED_ADMIN_EMAIL` | no | `admin@ieee-itb.ac.id` | Email created by `npm run db:seed`. |
| `SEED_ADMIN_PASSWORD` | no | `Admin#2026!` | Password created by `npm run db:seed`. |
| `SEED_ADMIN_NAME` | no | `Bagas Prakoso` | Display name for the seeded admin. |

Generate a real secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Dev convenience:** if `SESSION_SECRET` is unset the app falls back to a fixed
> development key and logs a warning — so a fresh clone runs unconfigured. But it
> **throws in production** rather than silently sign sessions with a public constant.

---

## 7. Database setup

### Schema

Defined in `prisma/schema.prisma` — three models: `User`, `Session`, `Event` (see
[§3](#database-schema)).

> **Note on enums:** SQLite has no native `enum` type, so `status`, `category`, and
> `format` are stored as strings. TypeScript unions + Zod in `src/lib/constants.ts` and
> `src/lib/validation/` constrain them, so an invalid value still can't reach the DB.

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
cancelled, archived), category, format, and a mix of past/future dates — chosen so
every filter combination and empty state is reachable in a demo.

> **The seed clears the `events` and `sessions` tables first.** Never point it at
> anything you care about.

Override the demo account without editing files:

```bash
SEED_ADMIN_EMAIL=me@example.com SEED_ADMIN_PASSWORD='Something#Strong1' npm run db:seed
```

### Inspect / reset

```bash
npm run db:studio         # browse the data in a GUI
npm run db:reset          # drop + re-migrate + re-seed (destructive)
```

---

## 8. Demo account

Seeded by `npm run db:seed`:

| Field | Value |
| ----- | ----- |
| URL | <http://localhost:3000/admin/login> |
| Email | `admin@ieee-itb.ac.id` |
| Password | `Admin#2026!` |

> Throwaway credentials, committed **on purpose** so an evaluator can sign in without
> any setup. Not a real account — change them before any real deployment.

### Trying it without the UI

```bash
# 1. Log in and capture the session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ieee-itb.ac.id","password":"Admin#2026!"}'

# 2. Read the public catalog
curl http://localhost:3000/api/events

# 3. Create an event (dates are naive WIB, "YYYY-MM-DDTHH:MM" — no Z, no ms)
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

---

## API reference

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

> The three auth operations are methods on **one resource** — `POST /api/auth/login`
> and `GET /api/auth/me` do not exist.

**Query params** for `GET /api/events`: `q`, `category`, `format`, `status`, `when`
(`all`/`upcoming`/`past`/`today`/`week`/`month`), `price`, `sort`, `featured`, `page`,
`perPage`. All Zod-validated, and two of them behave differently on purpose: `page` /
`perPage` fall back to defaults so a hand-typed `?page=abc` still renders, while an
unrecognised enum value (`?sort=sideways`) is a `400`, not a silent reinterpretation.
`status` only narrows the public set — `?status=DRAFT` returns an empty list, never
drafts.

Public read endpoints send permissive CORS headers and never allow credentials; the
mutating verbs are excluded from `Access-Control-Allow-Methods` and require an
`httpOnly` cookie, so third-party origins can't drive the admin API with a visitor's
ambient session. When `API_ALLOWED_ORIGINS` is set, a disallowed `Origin` gets **no**
`Access-Control-Allow-Origin` header at all — earlier it echoed the first allowed
origin, which made a denial look like success in curl.

---

## 9. Known issues and limitations

Listed honestly, roughly in the order I'd fix them.

1. **Uploads need a writable filesystem.** Cover images go to `public/uploads`. Ideal
   for the Node server this targets; on a read-only serverless host the write fails.
   Fix: object storage (S3/R2) behind the `lib/uploads.ts` seam. Images aren't resized
   or re-encoded — a 5 MB PNG is stored as-is, served through `next/image`.
2. **Sessions aren't rotated on use.** A token stays valid for its full 8-hour life
   rather than refreshing per request. Defensible for a single-admin app.
3. **No rate limiting on login.** Constant-time work makes enumeration hard, but there's
   no throttle. `express-rate-limit` at the edge would be first on the list for a public
   deployment.
4. **SQLite is single-writer.** Fine for a student branch; not for a real ticketing
   system. Only the Prisma layer would need to change.
5. **Dashboard "revenue" is an estimate** — `attendees × price` in application code,
   because SQLite can't multiply two columns in an aggregate. Labelled a proxy in the UI.
6. **Image type checks are magic-byte checks, not full decodes.** A deliberately crafted
   polyglot could pass. Low practical risk (uploads are served as inert static assets)
   and object storage with content-type enforcement removes it entirely.
7. **Timezone is fixed to WIB.** Deliberate — every event is in Bandung — but a
   multi-zone event would need a per-event zone column.
8. **No automated test suite beyond smoke.** `npm run smoke` covers the API end to end,
   but there are no unit tests for the service/validation layers. First thing added
   with more time.
9. **`smoke` runs `next dev`, so `next start` is untested for runtime uploads.** The
   production-boot snapshot of `public/` makes the upload round-trip untestable there —
   the one behaviour the test can't reach, worth confirming on a real deploy.
10. **The admin list loads all filter counts up front** (`~11` aggregates per request).
    Instant at this size; at thousands of events, the status tabs would want caching.
11. **No CSRF token on the REST API.** `SameSite=Lax` cookies cover the common
    cross-site form-POST case, and read endpoints refuse credentials via CORS. A
    double-submit token would close the rest for a browser client on another origin.

---

## 10. AI tools used

**Yes — AI coding assistants were used throughout, and the candidate remains fully
responsible for all submitted code, decisions, and explanations.**

### Tools

- **opencode** — the primary assistant: architecture decisions, components, route
  handlers, the service layer; debugging build/type errors; writing documentation.
- **GitHub Copilot** — inline completions during development.
- **Google Stitch** — the UI reference the design derives from.

### How it was used, concretely

- **Architecture:** proposals for the service-layer split, the error envelope, the
  session design, and the public/admin scope model were drafted with AI and then
  critically rewritten — several first drafts were rejected for simpler options (the
  immutable `slug`, and writing the image *before* the row so a failure can't leave a
  dangling reference).
- **Implementation:** most component/route code was AI-assisted, then reviewed and
  edited by hand. The comments explaining *why* a non-obvious decision was made were
  written deliberately — they're the part worth reading.
- **Documentation:** drafted with AI assistance from the real source, then checked
  against the code — every command, flag, and path here was verified by running it.

### What was verified rather than trusted

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke` (87 checks)
all pass, and the setup path was followed from a clean state. The smoke test found four
real bugs, each now covered by a check that fails if the bug returns:

- **Every catalog filter was dead** — a Zod `.optional()` placed after a transform
  demanded a value for every key.
- **`POST`/`PATCH` `/api/events` always returned 422** — date strings were converted to
  `Date` before a schema that only accepted strings (which also fixed a timezone
  bug: the conversion resolved in the server's zone, not Jakarta's).
- **`PATCH` still 422'd on most events** — merged rows held `null` for unset optional
  fields the schema typed as `string`; they're `nullish` now.
- **A malformed date crashed instead of validating** — `superRefine` ran after a failed
  field check and `end.getTime()` threw, turning a 422 into a 500.
- **The MIME allow-list could be bypassed via `Content-Type: constructor`** — a plain
  object resolved an inherited `Object.prototype` member. Lookups now use
  `Object.hasOwn`.
- **Impossible dates were silently accepted** — `Date.UTC` rolls `2026-13-01` forward
  to January instead of failing. Calendar parts are range-checked now, leap years
  included.
- **`?status=` was ignored on the public catalog** — it's applied as an *intersection*
  with publicly visible statuses, so it can narrow but never widen.
- **`endDate` was required though every caller treated it as optional** — the documented
  curl example returned 422. It may now be omitted entirely.
- **Image formats matched on too-weak a prefix** — WebP needs `RIFF` *and* `WEBP` (a WAV
  no longer passes), AVIF needs a `ftyp` box declaring an AVIF brand.
- **"Today" was computed in the server's timezone** — `setHours(0,0,0,0)` used the host
  zone, and WIB midnight is 17:00 UTC, so `?when=today` missed early-morning events for
  seven hours a day. Day boundaries are pinned to WIB now.

### What a reviewer should check first

The parts that encode real reasoning rather than syntax:

- `src/lib/services/event-service.ts` — the scope model and the `generateUniqueSlug` loop.
- `src/lib/errors.ts` and `src/lib/api.ts` — why status is derived from the code.
- `src/lib/auth/session.ts` and `src/lib/auth/password.ts` — the token/HMAC design and
  constant-time comparison.
- `src/lib/uploads.ts` — the write-then-update ordering and signature check.
- `src/lib/validation/event.ts` — the `superRefine` cross-field rules.

---

## Project structure

Each folder carries its own README; here's the map.

```
src/
├── app/                      # routes, Server Actions, REST API
│   ├── events/[slug]         # public event detail  — /events/[slug]
│   ├── admin/login/          # sign-in (outside the authed group)
│   ├── admin/(console)/      # layout + guard protects everything inside
│   │   ├── page.tsx          # dashboard
│   │   └── events/           # list, new, [id]/edit
│   ├── actions/              # Server Actions (auth, events)
│   └── api/                  # auth, events, events/[id], image, health
├── components/               # public/ + admin/ + ui/ primitives, icons.tsx
├── lib/                      # services, validation, auth, uploads, formatting
├── generated/prisma/         # generated client (git-ignored)
prisma/                       # schema, migrations/, seed.ts → README.md
scripts/                      # smoke.mjs (e2e API test) → README.md
design/                       # Google Stitch prototypes + per-screen READMEs
├── public-catalog/  event-detail/  admin-login/  admin-console/
```

Convention files (`error.tsx`, `loading.tsx`) sit next to the route they cover — that's
how Next.js discovers them.

---

## Licence

Submitted as a take-home assignment for the IEEE ITB Student Branch Fullstack Developer
probation programme.