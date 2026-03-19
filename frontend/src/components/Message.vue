<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "../types";

const props = defineProps<{
  message: Message;
}>();

const isLoading = computed(
  () => props.message.role === "assistant" && props.message.content === "__LOADING__"
);
</script>

<template>
  <div class="message" :class="message.role">
    <div class="bubble">
      <template v-if="isLoading">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </template>
      <template v-else>{{ message.content }}</template>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  margin-bottom: 12px;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 10px 12px;
  line-height: 1.6;
  border-radius: 10px;
  white-space: pre-wrap;
}

.user .bubble {
  background: var(--user-msg-bg);
}

.assistant .bubble {
  background: var(--assistant-msg-bg);
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  display: inline-block;
  margin-right: 4px;
  animation: typing 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
  margin-right: 0;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
</style>
