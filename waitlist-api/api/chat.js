// Vercel serverless function: GET/POST /api/chat
//
// Simple public message board for the vote page. GET returns the latest
// messages (oldest first), POST adds one. Clients poll GET.
// Requires DATABASE_URL.

const { neon } = require("@neondatabase/serverless");

let tableReady = false;
async function ensureTable(sql) {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableReady = true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, name, message, created_at FROM (
          SELECT * FROM chat_messages ORDER BY id DESC LIMIT 60
        ) t ORDER BY id ASC
      `;
      return res.status(200).json({ messages: rows });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = String(body.name || "").trim().slice(0, 40);
      const message = String(body.message || "").trim().slice(0, 300);
      if (name.length < 2) return res.status(400).json({ error: "Enter your name first" });
      if (!message) return res.status(400).json({ error: "Write a message" });

      // Light flood control: max 5 messages per name per minute.
      const recent = await sql`
        SELECT COUNT(*)::int AS n FROM chat_messages
        WHERE name = ${name} AND created_at > NOW() - INTERVAL '1 minute'
      `;
      if (recent[0].n >= 5) return res.status(429).json({ error: "Slow down a little" });

      await sql`INSERT INTO chat_messages (name, message) VALUES (${name}, ${message})`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("chat failed:", err);
    return res.status(500).json({ error: "Chat is unavailable right now" });
  }
};
