import type { ChatMessage } from "../types/index.js";

export type ModelProvider = "openai" | "claude" | "deepseek" | "minimax";

function openAICompatibleBase(provider: ModelProvider): string {
  if (provider === "deepseek") {
    return "https://api.deepseek.com/v1";
  }
  if (provider === "minimax") {
    return process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  }
  return "https://api.openai.com/v1";
}

function providerFromModel(model: string): ModelProvider {
  const normalized = model.toLowerCase();
  if (normalized.startsWith("claude-")) {
    return "claude";
  }
  if (normalized.startsWith("deepseek-")) {
    return "deepseek";
  }
  if (normalized.startsWith("minimax") || normalized.includes("minimax")) {
    return "minimax";
  }
  return "openai";
}

function normalizeModel(provider: ModelProvider, model: string): string {
  const normalized = model.trim();
  if (provider === "minimax") {
    const lower = normalized.toLowerCase();
    if (lower === "minimax2.7" || lower === "minimax-m2.7" || lower === "minimax-text-01") {
      return "MiniMax-M2.7";
    }
  }
  return normalized;
}

function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function* parseSSE(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line.startsWith("data:")) {
        continue;
      }
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }
      yield payload;
    }
  }
}

async function* streamFromOpenAICompatible(
  provider: ModelProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const finalModel = normalizeModel(provider, model);
  const response = await fetch(`${openAICompatibleBase(provider)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: finalModel,
      messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`AI请求失败: ${response.status} ${text}`);
  }

  const reader = response.body.getReader();
  for await (const payload of parseSSE(reader)) {
    const data = JSON.parse(payload);
    const choice = data?.choices?.[0];
    const contentFromDelta = choice?.delta?.content;
    const contentFromText = choice?.text;
    const contentFromMessage = choice?.message?.content;
    const stringDelta = typeof choice?.delta === "string" ? choice.delta : undefined;

    if (typeof contentFromDelta === "string" && contentFromDelta.length > 0) {
      yield contentFromDelta;
      continue;
    }
    if (Array.isArray(contentFromDelta)) {
      const merged = contentFromDelta
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("");
      if (merged) {
        yield merged;
        continue;
      }
    }
    if (typeof contentFromMessage === "string" && contentFromMessage.length > 0) {
      yield contentFromMessage;
      continue;
    }
    if (Array.isArray(contentFromMessage)) {
      const merged = contentFromMessage
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("");
      if (merged) {
        yield merged;
        continue;
      }
    }
    if (typeof contentFromText === "string" && contentFromText.length > 0) {
      yield contentFromText;
      continue;
    }
    if (typeof stringDelta === "string" && stringDelta.length > 0) {
      yield stringDelta;
    }
  }
}

function extractTextFromAnyContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part?.text === "string") {
          return part.text;
        }
        if (typeof part?.content === "string") {
          return part.content;
        }
        return "";
      })
      .join("");
  }
  return "";
}

async function* streamFromMiniMaxTokenPlan(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const finalModel = normalizeModel("minimax", model);
  const response = await fetch("https://api.minimaxi.com/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: finalModel,
      max_tokens: 8096,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`AI请求失败: ${response.status} ${text}`);
  }

  const reader = response.body.getReader();
  let fullText = "";
  for await (const payload of parseSSE(reader)) {
    let event: any;
    try {
      event = JSON.parse(payload);
    } catch {
      continue;
    }
    const delta = event?.delta?.text;
    if (typeof delta === "string" && delta.length > 0) {
      fullText += delta;
    }
  }

  const visible = stripThinkingTags(fullText);
  if (!visible.trim()) {
    throw new Error("MiniMax Token Plan返回成功但内容为空，请检查模型权限。");
  }
  yield visible;
}

async function* streamFromMiniMax(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  if (apiKey.startsWith("sk-cp-")) {
    yield* streamFromMiniMaxTokenPlan(apiKey, model, messages);
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const finalModel = normalizeModel("minimax", model);
  let response: Response;
  try {
    response = await fetch(`${openAICompatibleBase("minimax")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: finalModel,
        messages,
        stream: false,
        reasoning_split: true,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("MiniMax响应超时（60秒），请重试或切换到 MiniMax-M2.7-highspeed。");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`AI请求失败: ${response.status} ${raw}`);
  }

  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`AI返回非JSON内容: ${raw.slice(0, 300)}`);
  }

  const choice = data?.choices?.[0];
  const text =
    extractTextFromAnyContent(choice?.message?.content) ||
    extractTextFromAnyContent(choice?.delta?.content) ||
    (typeof choice?.text === "string" ? choice.text : "") ||
    (typeof data?.output_text === "string" ? data.output_text : "");

  const visibleText = stripThinkingTags(text);
  if (!visibleText.trim()) {
    throw new Error("MiniMax返回成功但内容为空，请检查模型权限或更换模型ID。");
  }

  yield visibleText;
}

async function* streamFromClaude(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`AI请求失败: ${response.status} ${text}`);
  }

  const reader = response.body.getReader();
  for await (const payload of parseSSE(reader)) {
    const event = JSON.parse(payload);
    const delta = event?.delta?.text;
    if (typeof delta === "string" && delta.length > 0) {
      yield delta;
    }
  }
}

export async function* streamChat(
  model: string,
  apiKey: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const provider = providerFromModel(model);
  if (provider === "claude") {
    yield* streamFromClaude(apiKey, model, messages);
    return;
  }
  if (provider === "minimax") {
    yield* streamFromMiniMax(apiKey, model, messages);
    return;
  }
  yield* streamFromOpenAICompatible(provider, apiKey, model, messages);
}

export function getProviderByModel(model: string): ModelProvider {
  return providerFromModel(model);
}
