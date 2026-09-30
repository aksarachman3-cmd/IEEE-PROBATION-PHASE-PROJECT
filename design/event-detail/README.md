# Design: Event Detail & Registration

The **conversion page** — where a browser decides "yes, I'm going". Header with
the one orange button, a two-column split (the story on the left, the facts in a
card on the right), and a registration block that never makes you hunt.

> Stitch screen → live at `/events/[slug]` → `src/app/events/[slug]/page.tsx`

**What shipped:**

- Sticky facts box: date, time, venue, price, remaining seats — the numbers a
  decision needs, up front and tabular.
- Status badge (published / sold out) coloured from the semantic palette.
- The orange `#FF9900` CTA appears exactly once, at the moment of decision.

| File | Role |
| ---- | ---- |
| `screen.png` | Rendered preview |
| `code.html` | Stitch-generated HTML prototype |
| `DESIGN.md` | Full token spec |