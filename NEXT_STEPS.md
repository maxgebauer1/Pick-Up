# Pick Up — where I left off / next steps

_Last updated: 2026-07-25_

## Status: ✅ finished product built, tested, pushed

- **PR #1:** https://github.com/maxgebauer1/Pick-Up/pull/1 (branch `claude/app-redesign-plan-wbo2ov` → `main`) — **not merged yet.**
- Full-stack app works end-to-end: auth, browse, create, join/leave, confirm,
  check-in, waitlist, lobby chat, Web Push reminders. Verified against a live
  server with data persisted to SQLite.
- Architecture + how-to-run details live in **`CLAUDE.md`**.
- Demo login: `mia@demo.app` / `pickup123`.

## Pick up here — decide what's next

1. **Merge PR #1** (if you're happy with it).
2. **Deploy it.** ⚠️ The API + push need a long-running Node host (Render /
   Railway / Fly / a VM) — NOT Vercel serverless (the reminder scheduler uses
   setInterval). The static client can go on Vercel; the server can't.
3. **SMS reminders (Twilio)** as a 2nd channel — notification layer is already
   channel-agnostic, so this slots in. Extra motivation: iOS Web Push only works
   once the app is added to the Home Screen.
4. **Smaller polish, optional:**
   - Real geolocation / distance (currently seed-only; user-made games show no distance)
   - Edit / cancel-game button (delete endpoint already exists, no UI yet)
   - Move SQLite → Postgres before real scale

## To run it again locally
```bash
npm install && npm --prefix server install && npm --prefix client install
npm --prefix client run build
node server/index.js     # http://localhost:5001
```

## How to restart with me
Just say e.g. "merge the PR", "help me deploy the server", or "start on SMS
reminders." Everything's committed on `claude/app-redesign-plan-wbo2ov`.
