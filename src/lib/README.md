# src/lib/ — the brain

No JSX, no routes — just the logic the app actually runs on. This is where a
reviewer's eyes should go first.

| Path | What it does |
| ---- | ------------ |
| `services/` | **Business logic lives here and nowhere else.** `event-service`, `auth-service`. Pages, Server Actions, and route handlers all call these — never the DB directly. |
| `validation/` | **Zod schemas** for forms and query strings. The single validation layer; client-side checks are just convenience. |
| `auth/` | Session tokens, `scrypt` password hashing, the `requireAdmin*` guards. |
| `api.ts` | The `route()` wrapper + the one JSON response envelope every `/api` endpoint uses. |
| `errors.ts` | `AppError` codes and the single table mapping code → HTTP status. |
| `uploads.ts` | Cover-image storage, signature checks, write-before-row ordering. |
| `image-types.ts` | Magic-byte type detection for WebP / AVIF / PNG / JPEG. |
| `constants.ts` | The allowed enums (status, category, format, price bands, sort keys). |
| `cors.ts` | The CORS allow-list for read endpoints. |
| `prisma.ts` | The one shared Prisma client instance. |
| `format.ts` | WIB/`Asia/Jakarta` date formatting — the timezone is pinned by design. |
| `routes.ts` · `utils.ts` | Typed-route helpers and tiny utilities. |

The most "why?" density is in `services/event-service.ts` (the public/admin
scope model), `errors.ts` + `api.ts` (why a status code is derived from an error
code), and `auth/` (why sessions are HMAC-hashed database rows, not JWTs).