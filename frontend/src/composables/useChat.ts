import { ref } from "vue";
import { getConversation, sendMessage } from "../api";
import type { Message } from "../types";

const LOADING_PLACEHOLDER = "__LOADING__";

export function useChat(conversationId: () => number | null, onConversationCreated?: (id: number) => void) {
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  async function loadConversation(id: number) {
    const detail = await getConversation(id);
    messages.value = detail.messages || [];
  }

  async function send(content: string, model: string) {
    if (!content.trim() || isLoading.value) {
      return;
    }

    isLoading.value = true;
    messages.value.push({ role: "user", content: content.trim() });

    const assistantIdx = messages.value.length;
    messages.value.push({ role: "assistant", content: LOADING_PLACEHOLDER });

    const setAssistant = (text: string) => {
      messages.value[assistantIdx].content = text;
    };
    const appendAssistant = (text: string) => {
      if (messages.value[assistantIdx].content === LOADING_PLACEHOLDER) {
        messages.value[assistantIdx].content = text;
        return;
      }
      messages.value[assistantIdx].content += text;
    };

    try {
      await sendMessage(
        {
          conversationId: conversationId(),
          message: content.trim(),
          model,
        },
        (payload) => {
          if (payload.conversationId && !conversationId()) {
            onConversationCreated?.(payload.conversationId);
          }
          if (payload.error) {
            setAssistant(`请求失败：${payload.error}`);
            return;
          }
          if (payload.content) {
            appendAssistant(payload.content);
          }
        }
      );
      if (!messages.value[assistantIdx].content.trim()) {
        setAssistant("模型没有返回内容，请检查模型ID或API Key权限。");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "请求失败";
      setAssistant(`请求失败：${msg}`);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    messages,
    isLoading,
    loadConversation,
    send,
  };
}
