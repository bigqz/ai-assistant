export interface Conversation {
  id: number;
  title: string;
  model: string;
  updatedAt: string;
}

export interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  model?: string;
  createdAt?: string;
}

export interface ApiKeyStatus {
  provider: "openai" | "claude" | "deepseek" | "minimax";
  hasKey: boolean;
  masked?: string;
}

export interface ChatRequest {
  conversationId: number | null;
  message: string;
  model: string;
}
