<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { fetchApiKeys, removeApiKey, saveApiKey } from "../api";
import type { ApiKeyStatus } from "../types";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const keys = ref<ApiKeyStatus[]>([]);
const form = reactive<Record<string, string>>({
  openai: "",
  claude: "",
  deepseek: "",
  minimax: "",
});

async function load() {
  keys.value = await fetchApiKeys();
}

async function save(provider: string) {
  if (!form[provider]?.trim()) {
    return;
  }
  await saveApiKey(provider, form[provider].trim());
  form[provider] = "";
  await load();
}

async function remove(provider: string) {
  await removeApiKey(provider);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="panel">
      <h3>API Key 设置</h3>
      <div v-for="item in keys" :key="item.provider" class="line">
        <div class="left">
          <div class="name">{{ item.provider }}</div>
          <div class="mask-text">{{ item.hasKey ? item.masked : "未配置" }}</div>
        </div>
        <input
          v-model="form[item.provider]"
          type="password"
          :placeholder="`输入 ${item.provider} key`"
        />
        <button @click="save(item.provider)">保存</button>
        <button class="danger" @click="remove(item.provider)">删除</button>
      </div>
      <button class="close" @click="emit('close')">关闭</button>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  width: min(900px, 90vw);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.line {
  display: grid;
  grid-template-columns: 140px 1fr 80px 80px;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.left {
  color: var(--text-secondary);
}

.name {
  color: var(--text-primary);
  text-transform: capitalize;
}

input,
button {
  height: 36px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0 10px;
}

.danger {
  color: #ff8f8f;
}

.close {
  margin-top: 14px;
  width: 100%;
}
</style>
