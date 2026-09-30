# design/ — the pixels come from here

Every screen you see in this app started as a **Google Stitch** prototype. These
four folders are those prototypes, kept in the repo so an evaluator can open the
source screen next to the implemented one and see exactly what was being aimed at.

> The brief said UI design is **not** evaluated — so the design budget went into
> copying a look, not inventing one.

## The colour story: "Amazon, but for IEEE"

The palette is straight out of **Amazon's design language** — high-contrast
commerce, built for trust and fast scanning:

| Token | Hex | Job |
| ----- | --- | --- |
| Amazon orange | `#FF9900` | the one "do it now" colour — Register, Publish, Save |
| Deep squid ink | `#131921` | the header / whatever needs to feel like ground level |
| Slate navy | `#232F3E` | sub-bars, toolbars, operational surfaces |
| Carton grey | `#F3F3F3` | the page canvas, quiet by default |
| Price-tag navy | `#0F1111` | primary text |
| Warm white | `#FFFFFF` | cards, so content pops off the grey |

A whole screen can be read in one glance because exactly **one** accent colour
exists. Everything else is either neutral or semantic (green = ok, red = stop,
amber = wait, blue = info).

## The folders

| Folder | Stitch screen | Implemented at |
| ------ | ------------- | -------------- |
| [`public-catalog/`](./public-catalog/) | Event list with search, filters, facets | `src/app/page.tsx` |
| [`event-detail/`](./event-detail/) | Full event page + registration block | `src/app/events/[slug]/page.tsx` |
| [`admin-login/`](./admin-login/) | Sign-in page | `src/app/admin/login/page.tsx` |
| [`admin-console/`](./admin-console/) | Dashboard, event table, forms, delete confirm | `src/app/admin/(console)/**` |

Each folder holds the same three files:

- **`screen.png`** — a rendered preview, open it first.
- **`code.html`** — the Stitch-generated prototype markup.
- **`DESIGN.md`** — the token dump (colour, type, spacing, radius) the
  implementation cribbed from.