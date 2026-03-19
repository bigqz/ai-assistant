export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  model: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  created_at: Date;
}

export interface ChatRequest {
  conversationId: number | null;
  message: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
