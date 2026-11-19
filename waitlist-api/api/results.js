// Vercel serverless function: POST /api/results
//
// Password-protected read of vote data. Body: { password }.
// Requires env vars DATABASE_URL and RESULTS_PASSWORD.

const crypto = require("crypto");
const { neon } = require("@neondatabase/serverless");

function passwordOk(given) {
  const expected = process.env.RESULTS_PASSWORD || "";
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(String(given || "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!passwordOk((req.body || {}).password)) {
    return res.status(401).json({ error: "Wrong password" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    // Tables are created on first vote/chat; tolerate them not existing yet.
    await sql`CREATE TABLE IF NOT EXISTS game_votes (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, sport TEXT NOT NULL,
      captain BOOLEAN NOT NULL DEFAULT FALSE, times JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;

    await sql`ALTER TABLE game_votes ADD COLUMN IF NOT EXISTS waiver_signature TEXT`;
    await sql`ALTER TABLE game_votes ADD COLUMN IF NOT EXISTS waiver_version TEXT`;
    await sql`ALTER TABLE game_votes ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE game_votes ADD COLUMN IF NOT EXISTS waiver_ip TEXT`;
    const votes = await sql`SELECT id, name, sport, captain, times, created_at, waiver_signature, waiver_version, waiver_signed_at FROM game_votes ORDER BY id DESC`;
    const chat = await sql`SELECT id, name, message, created_at FROM chat_messages ORDER BY id DESC LIMIT 200`;
    return res.status(200).json({ votes, chat });
  } catch (err) {
    console.error("results failed:", err);
    return res.status(500).json({ error: "Could not load results" });
  }
};
