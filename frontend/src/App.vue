<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ChatArea from "./components/ChatArea.vue";
import InputArea from "./components/InputArea.vue";
import SettingsDialog from "./components/Settings.vue";
import Sidebar from "./components/Sidebar.vue";
import { useChat } from "./composables/useChat";
import { useConversations } from "./composables/useConversations";

const activeConversationId = ref<number | null>(null);
const selectedModel = ref("MiniMax-M2.7");
const showSettings = ref(false);

const { conversations, load, remove } = useConversations();
const { messages, isLoading, send, loadConversation } = useChat(
  () => activeConversationId.value,
  (id) => {
    activeConversationId.value = id;
    load();
  }
);

const sortedConversations = computed(() => conversations.value);

async function onNewChat() {
  activeConversationId.value = null;
  messages.value = [];
}

async function onSelectChat(id: number) {
  activeConversationId.value = id;
  await loadConversation(id);
}

async function onDeleteChat(id: number) {
  await remove(id);
  if (activeConversationId.value === id) {
    activeConversationId.value = null;
    messages.value = [];
  }
}

async function onSend(content: string) {
  const hadConversation = !!activeConversationId.value;
  await send(content, selectedModel.value);
  if (!hadConversation) {
    await load();
  }
}

watch(selectedModel, async () => {
  if (!activeConversationId.value) {
    return;
  }
  await loadConversation(activeConversationId.value);
});

onMounted(load);
</script>

<template>
  <div class="layout">
    <Sidebar
      :conversations="sortedConversations"
      :active-id="activeConversationId"
      :selected-model="selectedModel"
      @new-chat="onNewChat"
      @select-chat="onSelectChat"
      @delete-chat="onDeleteChat"
      @open-settings="showSettings = true"
      @update:model="selectedModel = $event"
    />
    <main class="main">
      <ChatArea :messages="messages" />
      <InputArea :disabled="isLoading" @send="onSend" />
    </main>
    <SettingsDialog v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
