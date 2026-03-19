<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "send", content: string): void;
}>();

const value = ref("");

function submit() {
  const text = value.value.trim();
  if (!text) {
    return;
  }
  emit("send", text);
  value.value = "";
}
</script>

<template>
  <div class="input-wrap">
    <textarea
      v-model="value"
      class="input"
      :disabled="disabled"
      placeholder="输入内容，Ctrl+Enter 发送"
      @keydown.ctrl.enter.prevent="submit"
    />
    <button class="send-btn" :disabled="disabled" @click="submit">发送</button>
  </div>
</template>

<style scoped>
.input-wrap {
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  padding: 12px;
  display: flex;
  gap: 10px;
}

.input {
  flex: 1;
  min-height: 52px;
  max-height: 200px;
  resize: vertical;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  padding: 10px;
  border-radius: 8px;
}

.send-btn {
  width: 80px;
  border: 1px solid var(--border);
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
}

.send-btn:disabled {
  opacity: 0.6;
}
</style>
