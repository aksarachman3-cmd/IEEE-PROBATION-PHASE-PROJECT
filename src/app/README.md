# src/app/ — the routes

Next.js App Router means **folders are URLs**. This tree is the whole site map.

```
app/
├── page.tsx            ─  /          public event catalog (search, filters, sort)
├── events/[slug]/      ─  /events/x  event detail page
├── admin/
│   ├── login/          ─  /admin/login   the front door (no auth needed to look)
│   └── (console)/      ─  /admin         dashboard + /admin/events/*  (guarded)
├── actions/            ─  Server Actions (auth, events) — the "form submit" path
└── api/
    ├── events*         ─  REST: list/create, read/patch/delete, image upload
    ├── auth            ─  REST login / session check / logout
    └── health          ─  liveness + DB connectivity probe
```

The `(console)` parentheses are Next.js route-group syntax — the URL stays
`/admin`, but the layout that wraps the group contains the **auth guard**, so
every future route dropped under `/admin` is protected by default, not by
memory.

**Convention files** (`loading.tsx`, `error.tsx`) sit right next to the route
they cover — that's how Next.js discovers them. There's no central "loading"
folder because there's no central "page" folder either.