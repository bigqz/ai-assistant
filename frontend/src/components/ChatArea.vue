<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { Message } from "../types";
import MessageItem from "./Message.vue";

const props = defineProps<{
  messages: Message[];
}>();

const chatListEl = ref<HTMLElement | null>(null);

async function scrollToBottom() {
  await nextTick();
  const el = chatListEl.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

watch(() => props.messages, scrollToBottom, { deep: true });
</script>

<template>
  <section class="chat-area">
    <div ref="chatListEl" class="chat-list">
      <div v-if="messages.length === 0" class="empty">
        <h2>欢迎使用 AI Assistant</h2>
        <p>先在左侧选择模型并创建一个新对话，然后开始提问。</p>
      </div>
      <MessageItem v-for="(msg, idx) in messages" :key="idx" :message="msg" />
    </div>
  </section>
</template>

<style scoped>
.chat-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding: 18px;
}

.chat-list::-webkit-scrollbar {
  width: 10px;
}

.chat-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
}

.chat-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

.empty {
  color: var(--text-secondary);
  margin-top: 20vh;
  text-align: center;
}

.empty h2 {
  color: var(--text-primary);
  margin-bottom: 8px;
}
</style>
