# scripts/ — the safety net

Only one script lives here, and it earns its keep:

## `smoke.mjs` — the end-to-end API smoke test

Boots the app on a **scratch** database (`.smoke/`), then throws ~87 checks at
it, cleaning up after itself:

- the public catalog returns seeded events; filters, sort, and pagination behave;
- a **draft is not publicly visible** (404, not a leak);
- unauthenticated writes are rejected with `401`;
- logged-in admins can create → read → update → delete;
- cover uploads round-trip and are refused when oversized or when the bytes don't
  match the declared type.

Runs on `next dev` (not `next start`) because a production server snapshots the
`public/` folder at boot and would never serve a file uploaded *mid-test*. Build
output goes to `.next-smoke/` so real builds aren't invalidated.

```bash
npm run smoke          # run it
SMOKE_PORT=3200 npm run smoke   # if 3000-ish ports are taken
```

> It genuinely pays rent: it caught **four real bugs** — dead catalog filters, a
> `POST`/`PATCH` that always 422'd, a date bug that crashed instead of validating,
> and a MIME allow-list that could be bypassed via `Object.prototype`. Every one
> is a regression check now.