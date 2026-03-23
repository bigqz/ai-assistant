import { Router } from "express";
import { pool } from "../db.js";
import { getProviderByModel, streamChat } from "../services/ai.js";
import type { ChatMessage, ChatRequest } from "../types/index.js";

const router = Router();

function buildTitle(message: string): string {
  const plain = message.trim().replace(/\s+/g, " ");
  return plain.length > 20 ? `${plain.slice(0, 20)}...` : plain || "新对话";
}

router.post("/send", async (req, res) => {
  const body = req.body as ChatRequest;
  const text = String(body.message || "").trim();
  const model = String(body.model || "").trim() || "MiniMax-M2.7";

  if (!text) {
    res.status(400).json({ error: "消息不能为空" });
    return;
  }

  let conversationId = body.conversationId ?? null;
  if (!conversationId) {
    const title = buildTitle(text);
    const [insertConv] = await pool.execute(
      "INSERT INTO conversations (user_id, title, model) VALUES (1, ?, ?)",
      [title, model]
    );
    conversationId = (insertConv as any).insertId as number;
  }

  await pool.execute(
    "INSERT INTO messages (conversation_id, role, content, model) VALUES (?, 'user', ?, ?)",
    [conversationId, text, model]
  );
  await pool.execute("UPDATE conversations SET model = ? WHERE id = ? AND user_id = 1", [
    model,
    conversationId,
  ]);

  const [historyRows] = await pool.execute(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC",
    [conversationId]
  );
  const history: ChatMessage[] = (historyRows as any[]).map((row) => ({
    role: row.role,
    content: row.content,
  }));

  const provider = getProviderByModel(model);
  const [keyRows] = await pool.execute(
    "SELECT api_key FROM api_keys WHERE user_id = 1 AND provider = ? LIMIT 1",
    [provider]
  );
  const apiKey = (keyRows as any[])[0]?.api_key as string | undefined;
  if (!apiKey) {
    res.status(400).json({ error: `未配置 ${provider} 的API Key` });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let assistantContent = "";
  try {
    for await (const chunk of streamChat(model, apiKey, history)) {
      assistantContent += chunk;
      res.write(`data: ${JSON.stringify({ role: "assistant", content: chunk, conversationId })}\n\n`);
    }
    res.write("data: {\"done\":true}\n\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI调用失败";
    console.error("[chat/send] stream error:", msg);
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    if (assistantContent.trim()) {
      await pool.execute(
        "INSERT INTO messages (conversation_id, role, content, model) VALUES (?, 'assistant', ?, ?)",
        [conversationId, assistantContent, model]
      );
    }
    res.end();
  }
});

export default router;
