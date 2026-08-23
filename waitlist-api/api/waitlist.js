// Vercel serverless function: POST /api/waitlist
//
// Shared endpoint for all pickupsports.us landing page variants (a/b/c/d).
// Validates a waitlist signup and fires off a confirmation email (Resend)
// and confirmation text (Twilio) in parallel. A failure in one channel
// doesn't block or fail the other.
//
// Required env vars (set in the Vercel project settings):
//   RESEND_API_KEY
//   RESEND_FROM            e.g. "Pick Up <hello@yourdomain.com>"
//                           (falls back to Resend's shared test sender)
//   TWILIO_ACCOUNT_SID     Account SID (starts "AC..."), from the Twilio console
//   TWILIO_API_KEY_SID     API Key SID (starts "SK...") — used for auth instead
//                           of the raw Auth Token
//   TWILIO_API_KEY_SECRET
//   TWILIO_FROM_NUMBER     E.164 format, e.g. "+15551234567"
//   ALLOWED_ORIGINS        comma-separated list of origins allowed to call
//                           this endpoint (CORS), e.g.
//                           "https://a.pickupsports.us,https://b.pickupsports.us"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOnly(str) {
  return (str || "").replace(/\D/g, "");
}

function isValidPhone(str) {
  const d = digitsOnly(str);
  return d.length >= 10 && d.length <= 15;
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function sendConfirmationEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Pick Up <onboarding@resend.dev>";
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "You're on the Pick Up waitlist",
      html:
        '<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1b241f;">' +
        "<p>You're on the early access list for <strong>Pick Up</strong>.</p>" +
        "<p>We'll email you the second signups open. No spam before then.</p>" +
        '<p style="margin-top:32px; padding-top:16px; border-top:1px solid #e4eae4; font-size:12px; color:#6d7a71;">' +
        "You're receiving this because you joined the Pick Up waitlist. " +
        '<a href="https://api.pickupsports.us/privacy" style="color:#6d7a71;">Privacy Policy</a>' +
        '<br>Pick Up, 1921 New Garden Rd APT J105, Greensboro, NC 27410' +
        "</p>" +
        "</div>",
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  }
}

async function sendConfirmationText(phone) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !apiKeySid || !apiKeySecret || !from) {
    throw new Error("Twilio env vars not set");
  }

  // Assumes a US/E.164-able 10-digit input, matching the client's
  // isValidPhone check. Add proper country-code handling before opening
  // signups to international numbers.
  const digits = digitsOnly(phone);
  const to = digits.length === 10 ? `+1${digits}` : `+${digits}`;

  const params = new URLSearchParams({
    To: to,
    From: from,
    Body:
      "Pick Up: You're on the waitlist! We'll text you when signups open. " +
      "Msg&data rates may apply. Reply STOP to unsubscribe, HELP for help.",
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`Twilio failed: ${res.status} ${await res.text()}`);
  }
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, phone } = req.body || {};

  if (!EMAIL_RE.test(email || "")) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (!isValidPhone(phone || "")) {
    return res.status(400).json({ error: "Invalid phone" });
  }

  const [emailResult, smsResult] = await Promise.allSettled([
    sendConfirmationEmail(email),
    sendConfirmationText(phone),
  ]);

  if (emailResult.status === "rejected") {
    console.error("waitlist email failed:", emailResult.reason);
  }
  if (smsResult.status === "rejected") {
    console.error("waitlist sms failed:", smsResult.reason);
  }

  return res.status(200).json({
    ok: true,
    email: emailResult.status === "fulfilled",
    sms: smsResult.status === "fulfilled",
  });
};
