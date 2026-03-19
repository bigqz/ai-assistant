import { ref } from "vue";
import { createConversation, deleteConversation, fetchConversations } from "../api";
import type { Conversation } from "../types";

export function useConversations() {
  const conversations = ref<Conversation[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      conversations.value = await fetchConversations();
    } finally {
      loading.value = false;
    }
  }

  async function create(title?: string, model?: string): Promise<number> {
    const created = await createConversation(title, model);
    conversations.value.unshift({
      id: created.id,
      title: created.title,
      model: created.model,
      updatedAt: new Date().toISOString(),
    });
    return created.id;
  }

  async function remove(id: number) {
    await deleteConversation(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
  }

  return {
    conversations,
    loading,
    load,
    create,
    remove,
  };
}
