# Design: Admin Event Management Console

The **engine room**. Dense, dashboard-first, built for someone doing this fifty
times a week: a nav rail, a metrics strip up top, a filterable event table, and
modal forms for create/edit with a confirm dialog before anything is deleted.

> Stitch screen → live at `/admin` → `src/app/admin/(console)/**`

**What shipped:**

- Dashboard KPIs: counts per status, occupancy %, a revenue proxy.
- Event table that collapses into cards on mobile.
- One `event-form.tsx` reused by both the "new" and "edit" routes.
- Delete requires an explicit typed-ish confirm dialog — no accidental wipe-outs.

| File | Role |
| ---- | ---- |
| `screen.png` | Rendered preview |
| `code.html` | Stitch-generated HTML prototype |
| `DESIGN.md` | Full token spec |

**Colours that carry this screen:** `#131921` sidebar, `#232F3E` toolbars,
`#FF9900` for the handful of row-level actions that matter.