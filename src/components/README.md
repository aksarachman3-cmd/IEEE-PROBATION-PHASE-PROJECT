# src/components/ — the React UI

Three drawers, one job each:

| Folder | Job | Examples |
| ------ | --- | -------- |
| `public/` | The storefront half — anything a visitor touches | `site-header`, `event-card`, `catalog-search`, `catalog-filters` |
| `admin/` | The console half — the dashboard UI | `admin-shell`, `event-table`, `event-form`, `delete-event-button`, `login-form` |
| `ui/` | Tiny reusable primitives with no business meaning | `button`, `badge`, `field`, `dialog`, `toast`, `pagination`, `states` |

The split rule is simple: **if a component mentions an event, it's `public/` or
`admin/`. If it just draws a pretty rectangle, it's `ui/`.**

Two things worth knowing:

- `catalog-search` lives in the header, which is why the desktop and mobile
  variants get **separate slots** from the page (`site-header.tsx`) — so the DOM
  never ends up with two inputs sharing one `id`.
- Inline SVG icons are hand-written in `icons.tsx` — no icon library, nothing to
  install, tree-shaking does the rest.