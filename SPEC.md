# AI 私人助手 - 详细需求文档

## 1. 项目概述

**项目名称**：AI Assistant
**项目类型**：Web应用（前后端分离）
**核心功能**：支持多AI模型的私人对话助手，带对话历史管理
**目标用户**：个人用户，希望拥有私有的AI对话助手

## 2. 技术架构

### 2.1 技术栈
- **前端**：Vue 3 + Vite + TypeScript
- **后端**：Node.js + Express + TypeScript
- **数据库**：MySQL 8.0
- **样式**：CSS Variables + Scoped CSS

### 2.2 项目结构
```
ai-assistant/
├── backend/                 # 后端 (Node.js + Express)
│   ├── src/
│   │   ├── index.ts         # 入口
│   │   ├── config.ts        # 配置
│   │   ├── db.ts           # 数据库连接
│   │   ├── routes/         # 路由
│   │   │   ├── chat.ts     # 对话API
│   │   │   ├── conversation.ts  # 会话管理API
│   │   │   └── settings.ts      # 设置API
│   │   ├── services/       # 业务逻辑
│   │   │   └── ai.ts       # AI调用服务
│   │   └── types/          # 类型定义
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/               # 前端 (Vue 3)
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── assets/
    │   │   └── styles/
    │   │       └── main.css
    │   ├── components/
    │   │   ├── Sidebar.vue
    │   │   ├── ChatArea.vue
    │   │   ├── Message.vue
    │   │   ├── InputArea.vue
    │   │   └── Settings.vue
    │   ├── composables/
    │   │   ├── useChat.ts
    │   │   └── useConversations.ts
    │   ├── api/
    │   │   └── index.ts
    │   └── types/
    │       └── index.ts
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

## 3. 数据库设计

### 3.1 建表SQL (init_db.sql)

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS ai_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_assistant;

-- 用户表（单用户版本预留）
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL DEFAULT 'default_user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化默认用户
INSERT INTO users (id, username) VALUES (1, 'default_user') ON DUPLICATE KEY UPDATE username='default_user';

-- 对话会话表
CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL DEFAULT 1,
    title VARCHAR(255) DEFAULT '新对话',
    model VARCHAR(50) DEFAULT 'gpt-4o',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 消息记录表
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_id (conversation_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- API Keys表
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL DEFAULT 1,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'claude', 'deepseek')),
    api_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_provider (user_id, provider),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 4. 后端设计 (Node.js + Express)

### 4.1 配置 (config.ts)
```typescript
export interface Config {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  server: {
    port: number;
  };
  ai: {
    defaultModel: string;
  };
}

export const config: Config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_assistant',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
  },
  ai: {
    defaultModel: 'gpt-4o',
  },
};
```

### 4.2 数据库连接 (db.ts)
```typescript
import mysql from 'mysql2/promise';
import { config } from './config';

export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

### 4.3 类型定义 (types/index.ts)
```typescript
export interface User {
  id: number;
  username: string;
  created_at: Date;
}

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
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: Date;
}

export interface ApiKey {
  id: number;
  user_id: number;
  provider: 'openai' | 'claude' | 'deepseek';
  api_key: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatRequest {
  conversationId: number | null;
  message: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### 4.4 AI服务 (services/ai.ts)

```typescript
import { Readable } from 'stream';

export type ModelProvider = 'openai' | 'claude' | 'deepseek';

export interface AIResponse {
  stream: Readable;
  model: string;
}

abstract class AIService {
  abstract provider: ModelProvider;
  abstract baseURL: string;
  
  abstract chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    apiKey: string,
    model: string
  ): Promise<Readable>;
}

class OpenAIService extends AIService {
  provider = 'openai';
  baseURL = 'https://api.openai.com/v1';
  
  async chat(messages, apiKey, model) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
    
    // 转换Web流为Node流
    // ... 返回Readable流
  }
}

class ClaudeService extends AIService {
  provider = 'claude';
  baseURL = 'https://api.anthropic.com/v1';
  
  async chat(messages, apiKey, model) {
    // Claude API实现
  }
}

class DeepSeekService extends AIService {
  provider = 'deepseek';
  baseURL = 'https://api.deepseek.com/v1';
  
  async chat(messages, apiKey, model) {
    // DeepSeek API实现
  }
}

// 工厂函数
export function getAIService(provider: ModelProvider): AIService {
  switch (provider) {
    case 'openai': return new OpenAIService();
    case 'claude': return new ClaudeService();
    case 'deepseek': return new DeepSeekService();
    default: return new OpenAIService();
  }
}
```

### 4.5 API路由

#### 4.5.1 对话API (routes/chat.ts)

**POST /api/chat/send**
- 功能：发送消息并获取AI回复（流式）
- 请求体：
```typescript
{
  conversationId: number | null,  // null表示新对话
  message: string,
  model: string  // gpt-4o, claude-3-5-sonnet-20241022, deepseek-chat
}
```
- 响应：SSE流式返回
- 返回格式：
```
data: {"role": "assistant", "content": "你好"}
data: {"done": true}
```

#### 4.5.2 会话管理API (routes/conversation.ts)

**GET /api/conversations**
- 功能：获取所有会话列表
- 响应：
```typescript
{
  conversations: [
    {
      id: number,
      title: string,
      model: string,
      updatedAt: string
    }
  ]
}
```

**POST /api/conversations**
- 功能：创建新会话
- 请求体：{ title?: string, model?: string }
- 响应：{ id: number, title: string, model: string }

**GET /api/conversations/:id**
- 功能：获取会话详情（包括消息）
- 响应：
```typescript
{
  id: number,
  title: string,
  model: string,
  messages: [
    { id: number, role: string, content: string, model: string, createdAt: string }
  ]
}
```

**DELETE /api/conversations/:id**
- 功能：删除会话
- 响应：{ success: true }

**PUT /api/conversations/:id**
- 功能：更新会话标题
- 请求体：{ title: string }
- 响应：{ success: true }

#### 4.5.3 设置API (routes/settings.ts)

**GET /api/settings/keys**
- 功能：获取已配置的API Keys（返回掩码）
- 响应：
```typescript
{
  keys: [
    { provider: "openai", hasKey: true, masked: "sk-...abc" },
    { provider: "claude", hasKey: false },
    { provider: "deepseek", hasKey: true, masked: "sk-...xyz" }
  ]
}
```

**POST /api/settings/keys**
- 功能：保存API Key
- 请求体：{ provider: string, apiKey: string }
- 响应：{ success: true }

**DELETE /api/settings/keys/:provider**
- 功能：删除API Key
- 响应：{ success: true }

### 4.6 入口 (index.ts)
```typescript
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat';
import conversationRoutes from './routes/conversation';
import settingsRoutes from './routes/settings';
import { config } from './config';

const app = express();

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});
```

## 5. 前端设计 (Vue 3)

### 5.1 样式主题 (assets/styles/main.css)
```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --accent: #e94560;
  --text-primary: #eaeaea;
  --text-secondary: #a0a0a0;
  --border: #2a2a4a;
  --user-msg-bg: #1f4068;
  --assistant-msg-bg: #16213e;
  --input-bg: #1a1a2e;
  --hover: #2a2a5a;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

### 5.2 布局结构

**整体布局**：Flexbox，左侧固定宽度280px，右侧自适应

```
+------------------+--------------------------------+
|    侧边栏         |         聊天区域               |
|  (280px)         |                                |
|                  |  +--------------------------+  |
| [+ 新对话]       |  |  消息1 (用户)            |  |
|                  |  +--------------------------+  |
| 对话1            |  |  消息2 (助手)             |  |
| 对话2            |  +--------------------------+  |
| 对话3            |  |  消息3 (用户)            |  |
| ...              |  +--------------------------+  |
|                  |  |  消息4 (助手)             |  |
|                  |  +--------------------------+  |
| [⚙️ 设置]        |  |  输入框                   |  |
|                  |  +--------------------------+  |
+------------------+--------------------------------+
```

### 5.3 组件详细设计

#### 5.3.1 Sidebar.vue
- 宽度：280px
- 背景：var(--bg-secondary)
- 顶部：新对话按钮 + 模型选择下拉框
- 中间：会话列表，每项显示标题+时间
- 底部：设置按钮
- 悬停效果：背景色变亮

#### 5.3.2 ChatArea.vue
- 消息列表：垂直排列，自动滚动到底部
- 空状态：显示欢迎语 + 使用提示

#### 5.3.3 Message.vue
- 用户消息：右对齐，背景色 var(--user-msg-bg)
- 助手消息：左对齐，背景色 var(--assistant-msg-bg)
- 代码块：高亮显示
- 复制按钮：悬停时显示

#### 5.3.4 InputArea.vue
- 固定在底部
- 文本框：自适应高度，最大200px
- 发送按钮：右侧，点击或Ctrl+Enter发送
- 禁用状态：发送中时禁用

#### 5.3.5 Settings.vue
- 弹窗形式，居中显示
- 遮罩层背景
- 每个模型显示：
  - 模型名称
  - API Key输入框（密码类型）
  - 保存/删除按钮
- 关闭按钮

### 5.4 Composables

#### useChat.ts
```typescript
import { ref } from 'vue';
import type { Message } from '../types';
import { sendMessage } from '../api';

export function useChat(conversationId: () => number | null) {
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  async function send(content: string, model: string) {
    isLoading.value = true;
    try {
      // 调用API，获取流式响应
      // 逐块更新messages
    } finally {
      isLoading.value = false;
    }
  }

  return {
    messages,
    isLoading,
    send,
  };
}
```

#### useConversations.ts
```typescript
import { ref } from 'vue';
import type { Conversation } from '../types';
import { 
  fetchConversations, 
  createConversation, 
  deleteConversation 
} from '../api';

export function useConversations() {
  const conversations = ref<Conversation[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    conversations.value = await fetchConversations();
    loading.value = false;
  }

  async function create(title?: string, model?: string) {
    const conv = await createConversation(title, model);
    conversations.value.unshift(conv);
    return conv.id;
  }

  async function remove(id: number) {
    await deleteConversation(id);
    conversations.value = conversations.value.filter(c => c.id !== id);
  }

  return {
    conversations,
    loading,
    load,
    create,
    remove,
  };
}
```

### 5.5 API调用 (api/index.ts)
```typescript
import type { Conversation, Message, ApiKey, ChatRequest } from '../types';

const API_BASE = 'http://localhost:3000/api';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  const data = await res.json();
  return data.conversations;
}

export async function createConversation(
  title?: string, 
  model?: string
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model }),
  });
  return res.json();
}

export async function getConversation(id: number): Promise<{
  id: number;
  title: string;
  model: string;
  messages: Message[];
}> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  return res.json();
}

export async function deleteConversation(id: number): Promise<void> {
  await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
}

export async function sendMessage(
  data: ChatRequest,
  onChunk: (content: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    // 解析SSE数据
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          onChunk(data.content);
        }
      }
    }
  }
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch(`${API_BASE}/settings/keys`);
  const data = await res.json();
  return data.keys;
}

export async function saveApiKey(
  provider: string, 
  apiKey: string
): Promise<void> {
  await fetch(`${API_BASE}/settings/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey }),
  });
}

export async function deleteApiKey(provider: string): Promise<void> {
  await fetch(`${API_BASE}/settings/keys/${provider}`, { 
    method: 'DELETE' 
  });
}
```

## 6. 支持的AI模型

| 提供商 | 模型ID | 流式支持 | 上下文限制 |
|--------|--------|----------|------------|
| OpenAI | gpt-4o | ✅ | 128K |
| OpenAI | gpt-4o-mini | ✅ | 128K |
| Claude | claude-3-5-sonnet-20241022 | ✅ | 200K |
| Claude | claude-3-haiku-20240307 | ✅ | 200K |
| DeepSeek | deepseek-chat | ✅ | 64K |

## 7. 环境变量

### 后端 (.env)
```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_assistant

# 服务
PORT=3000
```

### 前端 (.env)
```env
VITE_API_BASE=http://localhost:3000/api
```

## 8. 安装与运行

### 后端
```bash
cd backend
npm install
# 初始化数据库
mysql -u root -p < init_db.sql
# 启动
npm run dev
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 9. 验收标准

1. ✅ 可以创建新对话
2. ✅ 可以发送消息并收到AI回复（流式输出）
3. ✅ 可以切换不同AI模型
4. ✅ 对话历史保存在数据库，刷新页面不丢失
5. ✅ 可以删除会话
6. ✅ API Key安全存储在数据库
7. ✅ 代码有适当的错误处理
8. ✅ UI美观，符合深色主题设计
