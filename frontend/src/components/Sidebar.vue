<script setup lang="ts">
import type { Conversation } from "../types";

defineProps<{
  conversations: Conversation[];
  activeId: number | null;
  selectedModel: string;
}>();

const emit = defineEmits<{
  (e: "new-chat"): void;
  (e: "select-chat", id: number): void;
  (e: "delete-chat", id: number): void;
  (e: "open-settings"): void;
  (e: "update:model", model: string): void;
}>();

const modelOptions = [
  { label: "gpt-4o", value: "gpt-4o" },
  { label: "gpt-4o-mini", value: "gpt-4o-mini" },
  { label: "claude-3-5-sonnet-20241022", value: "claude-3-5-sonnet-20241022" },
  { label: "claude-3-haiku-20240307", value: "claude-3-haiku-20240307" },
  { label: "deepseek-chat", value: "deepseek-chat" },
  { label: "minimax2.7", value: "MiniMax-M2.7" },
];
</script>

<template>
  <aside class="sidebar">
    <button class="new-btn" @click="emit('new-chat')">+ 新对话</button>
    <select
      class="model-select"
      :value="selectedModel"
      @change="emit('update:model', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="model in modelOptions" :key="model.value" :value="model.value">
        {{ model.label }}
      </option>
    </select>

    <div class="list">
      <button
        v-for="item in conversations"
        :key="item.id"
        class="item"
        :class="{ active: activeId === item.id }"
        @click="emit('select-chat', item.id)"
      >
        <div class="title">{{ item.title }}</div>
        <div class="row">
          <span class="time">{{ new Date(item.updatedAt).toLocaleString() }}</span>
          <span class="delete" @click.stop="emit('delete-chat', item.id)">删除</span>
        </div>
      </button>
    </div>

    <button class="settings-btn" @click="emit('open-settings')">设置</button>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.new-btn,
.settings-btn,
.model-select {
  width: 100%;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 10px;
  border-radius: 8px;
}

.new-btn:hover,
.settings-btn:hover,
.item:hover {
  background: var(--hover);
}

.list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  text-align: left;
  border-radius: 8px;
  padding: 10px;
}

.item.active {
  border-color: var(--accent);
}

.title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 12px;
}

.delete {
  color: #ff8f8f;
}
</style>
