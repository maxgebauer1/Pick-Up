// One-time setup endpoint: creates the waitlist_signups table.
// Not linked from anywhere; call it once after deploy, then this file can be
// deleted (the CREATE TABLE IF NOT EXISTS is safe to leave, but there's no
// reason to keep a migration endpoint live).
const { neon } = require("@neondatabase/serverless");

module.exports = async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        source TEXT,
        email_sent BOOLEAN NOT NULL DEFAULT false,
        sms_sent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
