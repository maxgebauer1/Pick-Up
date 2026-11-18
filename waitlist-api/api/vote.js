// Vercel serverless function: POST /api/vote
//
// Stores one game vote: name, sport, captain interest, and the Saturday /
// Sunday time slots the person can make. Creates its table on first use.
// Requires DATABASE_URL (same Neon connection as /api/waitlist).

const { neon } = require("@neondatabase/serverless");

const SPORTS = ["soccer", "baseball", "basketball"];
const DAYS = ["sat", "sun"];
const SLOTS = ["9am", "11am", "1pm", "3pm", "5pm"];
const VALID_TIMES = DAYS.flatMap((d) => SLOTS.map((s) => `${d}-${s}`));

let tableReady = false;
async function ensureTable(sql) {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS game_votes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      captain BOOLEAN NOT NULL DEFAULT FALSE,
      times JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableReady = true;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const name = String(body.name || "").trim().slice(0, 80);
  const sport = String(body.sport || "");
  const captain = body.captain === true;
  const times = Array.isArray(body.times)
    ? [...new Set(body.times)].filter((t) => VALID_TIMES.includes(t))
    : [];

  if (name.length < 2) return res.status(400).json({ error: "Enter your name" });
  if (!SPORTS.includes(sport)) return res.status(400).json({ error: "Pick a sport" });
  if (times.length === 0) return res.status(400).json({ error: "Pick at least one time" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);
    await sql`
      INSERT INTO game_votes (name, sport, captain, times)
      VALUES (${name}, ${sport}, ${captain}, ${JSON.stringify(times)}::jsonb)
    `;
  } catch (err) {
    console.error("vote save failed:", err);
    return res.status(500).json({ error: "Could not save your vote. Try again." });
  }

  return res.status(200).json({ ok: true });
};
