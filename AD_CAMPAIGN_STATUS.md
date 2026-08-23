# Pick Up — Ad Campaign Infrastructure: Session Summary & Launch Checklist

Last updated: 2026-08-23

## What this covers

Infrastructure for running Meta (Facebook/Instagram) ads against 4 A/B landing
page variants for the Pick Up waitlist, with automated email + SMS confirmation
and database storage on signup.

---

## What's live right now

### Landing pages — all 5 subdomains resolving and deployed

| Subdomain | Content | Vercel project |
|---|---|---|
| `a.pickupsports.us` | landing-v2 | `landing-v2` |
| `b.pickupsports.us` | landing-v3 | `landing-v3` |
| `c.pickupsports.us` | landing-v4 | `landing-v4` |
| `d.pickupsports.us` | copy-edits landing-v1 | `landing-v1` |
| `api.pickupsports.us` | shared waitlist API + privacy + thanks | `waitlist-api` |

Root domain `pickupsports.us` is intentionally unassigned (original single
landing page was removed in favor of the 4 A/B variants above).

### Signup flow (fully wired end-to-end, not yet live-tested)

1. Visitor fills out the form on any of the 4 landing pages. Submission is
   blocked until they check the **required consent checkbox** ("I agree to
   receive texts and emails... Reply STOP to opt out. Privacy Policy").
2. Form POSTs to `api.pickupsports.us/api/waitlist` (`waitlist-api/api/waitlist.js`
   in this repo, on `main`), which in parallel:
   - Sends a confirmation **email** via Resend, from `mitch@pickupsports.us`
     (domain verified in Resend already). Footer includes the privacy policy
     link and required CAN-SPAM mailing address (1921 New Garden Rd APT J105,
     Greensboro, NC 27410).
   - Sends a confirmation **text** via Twilio, from `+15722091661`, with
     required "Reply STOP / HELP" carrier-compliance language.
   - **Saves the signup** to Postgres (Neon integration, database
     `neon-coffee-bridge`, table `waitlist_signups`: email, phone, `source`
     = which landing subdomain it came from, whether email/sms actually sent,
     timestamp). A storage failure doesn't block the confirmations from going out.
3. On success, the browser redirects to **`api.pickupsports.us/thanks`** — one
   universal confirmation page (not 4 separate ones) with the logo, thanks
   copy, and a native share button. It has a marked spot in the HTML comments
   for the Meta Pixel, so the pixel/conversion event only needs to be added
   **once**, here, whenever the ad account is ready.

### Compliance
- Privacy policy at `api.pickupsports.us/privacy`, linked identically from all
  4 pages (footer link + consent checkbox link) — single source, can't drift.
- Required opt-in consent checkbox on every form (both instances per page).
- CAN-SPAM mailing address in the email footer.
- SMS opt-out language ("Reply STOP") in every text.

### What's NOT done yet
- **No live end-to-end test run** — DNS is live and the code is deployed, but
  nobody has actually submitted the form and confirmed the email + text arrive
  and a row lands in the database. Ask Claude to run this next.
- **Twilio A2P 10DLC registration** — not done. Needed before sending real SMS
  volume or carriers will filter/block texts from `+15722091661`. Done by you
  in the Twilio console; also worth confirming there whether that number is
  toll-free (different verification path, "Toll-Free Verification").
- **Meta Pixel / Conversions API** — not installed. Placeholder comment is
  ready in `waitlist-api/thanks.html`.
- Everything in the Meta ads platform section below.

---

## Launch checklist

### 🟢 Done this session
- [x] DNS records for `a`, `b`, `c`, `d`, `api` added and verified live
- [x] Physical mailing address added to confirmation email footer
- [x] Universal `/thanks` confirmation page built, all 4 pages redirect to it
- [x] Fixed dead footer "Privacy Policy" link (was `href="#"`) on all 4 pages
- [x] Vercel Postgres (Neon, `neon-coffee-bridge`) created, connected to
      `waitlist-api`, `waitlist_signups` table created and wired into the API

### 🔴 Do next
- [ ] **Run the live end-to-end test** — submit the form on one variant, confirm
      the email arrives, the text arrives, and a row shows up in
      `waitlist_signups`. Ask Claude to do this.
- [ ] **Twilio A2P 10DLC registration** for `+15722091661` in the Twilio
      console (business info, EIN, use-case description) — required before
      real SMS volume goes out.

### ⚪ Not started — Meta ads platform (outside this repo)
- [ ] Meta Business Manager account
- [ ] Facebook Page for Pick Up
- [ ] Meta ad account + payment method
- [ ] Verify `pickupsports.us` in Meta Business Manager
- [ ] Meta Pixel / Conversions API — install on `waitlist-api/thanks.html`
      (the marked spot is already there) once the ad account exists
- [ ] Ad creative + copy per variant
- [ ] Targeting, budget, campaign structure in Ads Manager

---

## Reference

- Waitlist API: `waitlist-api/api/waitlist.js`
- Privacy policy: `waitlist-api/privacy.html`
- Thanks/confirmation page: `waitlist-api/thanks.html`
- Landing page variants live in worktrees: `.claude/worktrees/landing-v2/` (v2,
  v3, v4) and `.claude/worktrees/landing-copy-edits/` (v1).
- Vercel projects (account `maxgebauer1s-projects`): `landing-v1`, `landing-v2`,
  `landing-v3`, `landing-v4`, `waitlist-api`.
- Database: Neon Postgres `neon-coffee-bridge`, connected to `waitlist-api`.
  Table `waitlist_signups` (email, phone, source, email_sent, sms_sent, created_at).
- Secrets (Resend key, Twilio credentials, DB connection strings) live only as
  encrypted Vercel env vars on `waitlist-api` — not in this repo.
