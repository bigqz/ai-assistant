import { Router } from "express";
import { pool } from "../db.js";

const router = Router();
const providers = ["openai", "claude", "deepseek", "minimax"] as const;

function maskKey(key: string): string {
  if (key.length <= 8) {
    return `${key.slice(0, 2)}...${key.slice(-2)}`;
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

router.get("/keys", async (_req, res) => {
  const [rows] = await pool.query("SELECT provider, api_key FROM api_keys WHERE user_id = 1");
  const existing = new Map<string, string>();
  for (const row of rows as any[]) {
    existing.set(row.provider, row.api_key);
  }

  const keys = providers.map((provider) => {
    const val = existing.get(provider);
    if (!val) {
      return { provider, hasKey: false };
    }
    return { provider, hasKey: true, masked: maskKey(val) };
  });

  res.json({ keys });
});

router.post("/keys", async (req, res) => {
  const provider = String(req.body?.provider || "");
  const apiKey = String(req.body?.apiKey || "");
  if (!providers.includes(provider as (typeof providers)[number]) || !apiKey.trim()) {
    res.status(400).json({ error: "参数错误" });
    return;
  }

  await pool.execute(
    `INSERT INTO api_keys (user_id, provider, api_key)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE api_key = VALUES(api_key)`,
    [provider, apiKey.trim()]
  );

  res.json({ success: true });
});

router.delete("/keys/:provider", async (req, res) => {
  const provider = String(req.params.provider || "");
  if (!providers.includes(provider as (typeof providers)[number])) {
    res.status(400).json({ error: "参数错误" });
    return;
  }

  await pool.execute("DELETE FROM api_keys WHERE user_id = 1 AND provider = ?", [provider]);
  res.json({ success: true });
});

export default router;
