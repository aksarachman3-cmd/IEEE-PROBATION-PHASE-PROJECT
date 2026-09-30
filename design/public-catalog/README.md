# Design: Public Event Catalog

The **first impression** — the storefront. A dense but breathable grid of event
cards with a sticky search bar and a sidebar of filters that know their job.

> Stitch screen → live at [`/`](https://localhost:3000) → `src/app/page.tsx`

**What the screen gets right, and what shipped:**

- The search box lives in the header, works on desktop *and* mobile (the header
  accepts a separate slot for each — that's why `site-header.tsx` takes two
  props, not a render function).
- Filters with **facet counts** (e.g. "12 events") so you never filter into a void.
- Cards use the full-width cover, orange CTA only on the primary action.

| File | Role |
| ---- | ---- |
| `screen.png` | Rendered preview |
| `code.html` | Stitch-generated HTML prototype |
| `DESIGN.md` | Full token spec (Amazon palette, Inter + JetBrains Mono type scale) |

**Colours that carry this screen:** `#FF9900` accent, `#131921` header, `#F3F3F3`
canvas, `#0F1111` text.