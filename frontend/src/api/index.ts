import type { ApiKeyStatus, ChatRequest, Conversation, Message } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  const data = await res.json();
  return data.conversations || [];
}

export async function createConversation(title?: string, model?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, model }),
  });
  return await res.json();
}

export async function getConversation(id: number): Promise<{
  id: number;
  title: string;
  model: string;
  messages: Message[];
}> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  return await res.json();
}

export async function deleteConversation(id: number): Promise<void> {
  await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
}

export async function sendMessage(data: ChatRequest, onChunk: (payload: any) => void): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || "请求失败");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const processBuffer = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    const events = normalized.split("\n\n");
    const rest = events.pop() || "";
    for (const evt of events) {
      for (const line of evt.split("\n")) {
        if (!line.startsWith("data: ")) {
          continue;
        }
        const raw = line.slice(6).trim();
        if (!raw) {
          continue;
        }
        try {
          onChunk(JSON.parse(raw));
        } catch {
          // 忽略无法解析的碎片，继续处理后续事件
        }
      }
    }
    return rest;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        processBuffer(`${buffer}\n\n`);
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    buffer = processBuffer(buffer);
  }
}

export async function fetchApiKeys(): Promise<ApiKeyStatus[]> {
  const res = await fetch(`${API_BASE}/settings/keys`);
  const data = await res.json();
  return data.keys || [];
}

export async function saveApiKey(provider: string, apiKey: string): Promise<void> {
  await fetch(`${API_BASE}/settings/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });
}

export async function removeApiKey(provider: string): Promise<void> {
  await fetch(`${API_BASE}/settings/keys/${provider}`, {
    method: "DELETE",
  });
}
