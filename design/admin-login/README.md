# Design: Admin Portal Sign-In

A deliberately **quiet** screen. One card, one email field, one password field,
one button. No decoration — the whole point is that nothing distracts from the
fact that this is a locked door.

> Stitch screen → live at `/admin/login` → `src/app/admin/login/page.tsx`

**What shipped:**

- Centered card on the neutral canvas; the navy `#131921` footer anchors the page.
- Orange `#FF9900` submit as the single accent.
- Server-rendered error banner when credentials are wrong, with a live demo-account
  hint so evaluators don't get stuck.

| File | Role |
| ---- | ---- |
| `screen.png` | Rendered preview |
| `code.html` | Stitch-generated HTML prototype |
| `DESIGN.md` | Full token spec |