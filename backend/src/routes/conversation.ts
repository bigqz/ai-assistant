import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, title, model, updated_at
     FROM conversations
     WHERE user_id = 1
     ORDER BY updated_at DESC`
  );
  const conversations = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updated_at,
  }));
  res.json({ conversations });
});

router.post("/", async (req, res) => {
  const title = (req.body?.title as string | undefined) || "新对话";
  const model = (req.body?.model as string | undefined) || "MiniMax-M2.7";
  const result = await pool.query(
    "INSERT INTO conversations (user_id, title, model) VALUES (1, $1, $2) RETURNING id",
    [title, model]
  );
  const id = result.rows[0].id as number;
  res.json({ id, title, model });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const convResult = await pool.query(
    "SELECT id, title, model FROM conversations WHERE id = $1 AND user_id = 1",
    [id]
  );
  const conv = convResult.rows[0];
  if (!conv) {
    res.status(404).json({ error: "会话不存在" });
    return;
  }

  const msgResult = await pool.query(
    `SELECT id, role, content, model, created_at
     FROM messages
     WHERE conversation_id = $1
     ORDER BY id ASC`,
    [id]
  );

  const messages = msgResult.rows.map((row: any) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    model: row.model,
    createdAt: row.created_at,
  }));

  res.json({
    id: conv.id,
    title: conv.title,
    model: conv.model,
    messages,
  });
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body?.title || "").trim();
  if (!title) {
    res.status(400).json({ error: "标题不能为空" });
    return;
  }

  await pool.query("UPDATE conversations SET title = $1 WHERE id = $2 AND user_id = 1", [title, id]);
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM conversations WHERE id = $1 AND user_id = 1", [id]);
  res.json({ success: true });
});

export default router;
