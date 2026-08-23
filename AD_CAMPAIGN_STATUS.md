# Pick Up — Ad Campaign Infrastructure: Session Summary & Launch Checklist

Last updated: 2026-08-23

## What this covers

Infrastructure for running Meta (Facebook/Instagram) ads against 4 A/B landing
page variants for the Pick Up waitlist, with automated email + SMS confirmation
on signup.

---

## What was done this session

### Landing pages
- Reviewed every landing page variant that existed across git branches/worktrees
  (`landing-v1` through `landing-v4`, a `copy-edits` set, and a `waitlist-integrations`
  set) and consolidated down to 4 kept variants, deleting the rest (files removed
  and committed per-branch; git history preserved, no branches/worktrees deleted).
- Deployed each kept variant as its own Vercel project, each on its own ad-friendly
  subdomain of `pickupsports.us`:

  | Subdomain | Variant | Vercel project |
  |---|---|---|
  | `a.pickupsports.us` | landing-v2 | `landing-v2` |
  | `b.pickupsports.us` | landing-v3 | `landing-v3` |
  | `c.pickupsports.us` | landing-v4 | `landing-v4` |
  | `d.pickupsports.us` | copy-edits landing-v1 | `landing-v1` |

- Removed the original `landing/` folder/project (was live at bare `pickupsports.us`);
  root domain is intentionally untouched/unassigned for now.

### Waitlist backend (Resend + Twilio)
- Recovered Twilio/Resend credentials from a prior session transcript (the
  waitlist-integrations variant that got deleted had them, but the conversation
  ended before it was fully wired up or deployed).
- Built **one shared serverless API** (`api.pickupsports.us`, Vercel project
  `waitlist-api`) instead of duplicating the integration + secrets across 4
  projects. Source at `waitlist-api/api/waitlist.js` in this repo (main branch).
- On signup, the API sends (in parallel, non-blocking):
  - **Confirmation email** via Resend, from `mitch@pickupsports.us` (domain
    already verified in Resend — no DNS work needed there).
  - **Confirmation text** via Twilio, from `+15722091661`. Includes required
    "Reply STOP to unsubscribe, HELP for help" carrier-compliance language.
- CORS-restricted via `ALLOWED_ORIGINS` env var to only the 4 landing subdomains.
- All secrets set as encrypted env vars on the `waitlist-api` Vercel project
  (`RESEND_API_KEY`, `RESEND_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`,
  `TWILIO_API_KEY_SECRET`, `TWILIO_FROM_NUMBER`, `ALLOWED_ORIGINS`) — not in git.

### Compliance
- Wrote a privacy policy, hosted **once** at `api.pickupsports.us/privacy`
  (`waitlist-api/privacy.html`). All 4 landing pages link to this same URL, so
  it's uniform by construction — edit one file, every page's link stays correct.
- Added a **required** consent checkbox to both forms (top + bottom) on all 4
  landing pages: "I agree to receive texts and emails from Pick Up... Reply STOP
  to opt out. [Privacy Policy]". Submission is blocked client-side until checked.

### Everything is committed
- `main`: original `landing/` removal, new `waitlist-api/` project.
- `worktree-landing-v2` branch: duplicate `landing/` removed; consent checkbox +
  `WAITLIST_ENDPOINT` wiring added to `landing-v2`, `landing-v3`, `landing-v4`.
- `worktree-landing-copy-edits` branch: duplicate `landing/` removed; consent
  checkbox + `WAITLIST_ENDPOINT` wiring added to `landing-v1`.
- `worktree-landing-waitlist-integrations` branch: its `landing/` folder (incl.
  the original, now-superseded `api/waitlist.js`) removed — not one of the 4
  kept variants.

---

## Launch checklist

### 🔴 Blocking — nothing works publicly until these are done

- [ ] **Add 5 DNS records** at Network Solutions for `pickupsports.us` (existing
      MX/email records are untouched by these — they're separate subdomains):

  | Type | Host | Value |
  |---|---|---|
  | A | `a` | `76.76.21.21` |
  | A | `b` | `76.76.21.21` |
  | A | `c` | `76.76.21.21` |
  | A | `d` | `76.76.21.21` |
  | A | `api` | `76.76.21.21` |

- [ ] **Run the end-to-end test** once DNS propagates — submit a real form on one
      variant, confirm both the email and text actually arrive. (Blocked on the
      DNS step above; ask Claude to run this once records are in.)

### 🟡 Needed before real ad spend / real signups

- [ ] **Decide on a signups database.** Right now submissions trigger the
      email/text and are **not stored anywhere** — there's no list to look at
      later. Two options discussed:
  - Vercel Postgres (marketplace integration, same Vercel account, free tier) —
    real queryable table, best if you'll want to export signups later (e.g. to
    upload as a Meta/Twilio custom audience). Needs your go-ahead since it's an
    account-level integration.
  - Resend Contacts (zero new setup) — simpler, but really an email list, not a
    proper database, and doesn't cleanly hold phone numbers.
- [ ] **Give Claude a physical mailing address** for the email footer. CAN-SPAM
      requires a real postal address in commercial email; a placeholder is in
      the code right now (`waitlist-api/api/waitlist.js`) with a TODO comment.
- [ ] **Twilio A2P 10DLC registration.** Sending SMS from `+15722091661` to real
      people at any real volume requires registering as a business ("brand")
      and campaign with Twilio, or carriers will filter/block the texts. This is
      done by you in the Twilio console (business info, EIN, use-case
      description) — Claude can guide you through it but can't submit it for you.
      Also worth double-checking in the Twilio console whether `+15722091661` is
      a toll-free number — those go through a separate Toll-Free Verification
      process instead of A2P 10DLC.

### ⚪ Not started — outside this repo, needed for Meta ads specifically

- [ ] Create a Meta Business Manager account.
- [ ] Create/connect a Facebook Page for Pick Up.
- [ ] Set up a Meta ad account with a payment method.
- [ ] Verify `pickupsports.us` domain ownership inside Meta Business Manager.
- [ ] Install the Meta Pixel and/or Conversions API on the 4 landing pages so
      Meta can track and optimize toward waitlist signups as a conversion event.
      (Not built yet — needs a decision on Pixel vs. server-side Conversions API,
      then code added to `script.js` in each variant / event forwarding added to
      `waitlist-api`.)
- [ ] Ad creative (images/video) and ad copy per variant — business/creative
      work, not something built in this repo.
- [ ] Targeting, budget, and campaign structure in Meta Ads Manager.

---

## Reference

- Waitlist API source: `waitlist-api/api/waitlist.js`
- Privacy policy source: `waitlist-api/privacy.html`
- Landing page variants live in worktrees: `.claude/worktrees/landing-v2/` (v2,
  v3, v4) and `.claude/worktrees/landing-copy-edits/` (v1).
- Vercel projects (account `maxgebauer1s-projects`): `landing-v1`, `landing-v2`,
  `landing-v3`, `landing-v4`, `waitlist-api`.
