# Landing page — waitlist email + SMS

Static site (`index.html` / `style.css` / `script.js`) plus one serverless
function (`api/waitlist.js`) that confirms each waitlist signup by email
(Resend) and text (Twilio).

## How it works

1. The signup form (`form.signup` in `index.html`) posts `{ email, phone }`
   to `WAITLIST_ENDPOINT` (`/api/waitlist`, set in `script.js`).
2. `api/waitlist.js` validates both fields server-side, then fires a
   confirmation email and confirmation text in parallel. Either channel can
   fail without failing the request or blocking the other — signups always
   succeed client-side (also cached in `localStorage` as a fallback).

No database yet — this only sends the two confirmations. Nothing persists
signups server-side.

## Deploying

1. New Vercel project, **Root Directory = `landing`**. Vercel auto-detects
   the static files plus `api/waitlist.js` — no `vercel.json` needed.
2. Set these env vars in the Vercel project:

   | Var | Notes |
   |---|---|
   | `RESEND_API_KEY` | from the Resend dashboard |
   | `RESEND_FROM` | e.g. `Pick Up <hello@updates.yourdomain.com>` — see DNS note below |
   | `TWILIO_ACCOUNT_SID` | starts `AC...`, main Twilio console dashboard |
   | `TWILIO_API_KEY_SID` | starts `SK...`, from Twilio API Keys page |
   | `TWILIO_API_KEY_SECRET` | shown once when the API Key is created |
   | `TWILIO_FROM_NUMBER` | E.164 format, e.g. `+15551234567` |

3. Add the custom domain in Vercel (Project → Settings → Domains) and point
   it at Vercel per the DNS records it gives you.

## DNS — don't touch your existing mail setup

Resend needs domain-verification DNS records (SPF TXT + DKIM CNAME) to send
as your domain. Two gotchas:

- **MX records (mail receiving) are untouched** — Resend only sends, so your
  existing company email keeps working no matter what.
- **SPF is one-record-per-domain.** If you already have an SPF TXT record
  (e.g. for Google Workspace/Microsoft 365), you can't just add Resend's
  separately — they'd conflict and you'd have to merge them.

**Recommended: verify a subdomain instead of the root domain** — e.g.
`updates.yourdomain.com` — and set `RESEND_FROM` to an address on that
subdomain. Subdomains get independent SPF/DKIM, so there's no risk of
clashing with your root domain's existing email setup.

## Twilio auth note

`api/waitlist.js` authenticates to Twilio using an **API Key** (SID +
Secret), not the account's raw Auth Token — the Account SID is still
required separately since it's part of the request URL
(`/Accounts/{AccountSid}/Messages.json`), but the Basic Auth credentials
are the API Key SID/Secret pair.
