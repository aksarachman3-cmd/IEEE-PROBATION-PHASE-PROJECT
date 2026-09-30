# prisma/ — the database, in plain sight

SQLite, driven by Prisma 7.

| File / folder | Role |
| ------------- | ---- |
| `schema.prisma` | The source of truth: `User`, `Session`, `Event`. |
| `migrations/` | Committed migration history — a fresh clone gets the exact same schema, no manual SQL. |
| `seed.ts` | Demo data: one admin + 16 events spanning every status/category/format, chosen so every filter and empty state is demoable. |
| `dev.db` | The actual database file — git-ignored, created on your machine by `npm run setup`. |

**Handles to reach for:**

```bash
npm run db:studio     # browse the data in a GUI
npm run db:migrate    # apply pending migrations
npm run db:reset      # drop + re-migrate + re-seed (destroys data!)
```

> SQLite has no native `enum` type, so `status`, `category`, and `format` are
> stored as strings — but the app constrains them with TypeScript unions + Zod, so
> a bogus value still can't reach the database through the app.