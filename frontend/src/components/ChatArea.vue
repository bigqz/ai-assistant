<script setup lang="ts">
import { nextTick, watch } from "vue";
import type { Message } from "../types";
import MessageItem from "./Message.vue";

const props = defineProps<{
  messages: Message[];
}>();

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    const el = document.getElementById("chat-list");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
);
</script>

<template>
  <section class="chat-area">
    <div id="chat-list" class="chat-list">
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
  display: flex;
  flex-direction: column;
}

.chat-list {
  flex: 1;
  overflow-y: scroll;
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
