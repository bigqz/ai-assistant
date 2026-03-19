import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, title, model, updated_at
     FROM conversations
     WHERE user_id = 1
     ORDER BY updated_at DESC`
  );
  const conversations = (rows as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updated_at,
  }));
  res.json({ conversations });
});

router.post("/", async (req, res) => {
  const title = (req.body?.title as string | undefined) || "新对话";
  const model = (req.body?.model as string | undefined) || "gpt-4o";
  const [result] = await pool.execute(
    "INSERT INTO conversations (user_id, title, model) VALUES (1, ?, ?)",
    [title, model]
  );
  const id = (result as any).insertId as number;
  res.json({ id, title, model });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [convRows] = await pool.execute(
    "SELECT id, title, model FROM conversations WHERE id = ? AND user_id = 1",
    [id]
  );
  const conv = (convRows as any[])[0];
  if (!conv) {
    res.status(404).json({ error: "会话不存在" });
    return;
  }

  const [msgRows] = await pool.execute(
    `SELECT id, role, content, model, created_at
     FROM messages
     WHERE conversation_id = ?
     ORDER BY id ASC`,
    [id]
  );

  const messages = (msgRows as any[]).map((row) => ({
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

  await pool.execute("UPDATE conversations SET title = ? WHERE id = ? AND user_id = 1", [title, id]);
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.execute("DELETE FROM conversations WHERE id = ? AND user_id = 1", [id]);
  res.json({ success: true });
});

export default router;
