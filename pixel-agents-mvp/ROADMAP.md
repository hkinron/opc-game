# Pixel Agents — 开发路线图

## 当前状态 (2026-04-10 16:35)
- ✅ MVP → Phase 5 全部完成
- 代码: `pixel-agents/`
- 构建: 17 模块 → 40.7KB (gzip 12.7KB)
- 下一步: 部署到 GitHub Pages

## Phase 1: 工程化重构 ✅ DONE
- TypeScript 多模块项目，Vite 构建
- 严格类型，11 模块 → 13.6KB (gzip 4.6KB)

## Phase 2: 接入真实 Agent ✅ DONE

### 架构
```
[Claude Code / Codex] → [JSONL Log] → [Log Parser] → [WebSocket Server:8787] → [Frontend]
```

### 后端 (server/)
- Node.js WebSocket 服务器 (`ws` 库)
- JSONL 日志解析器，监听 Claude Code 日志文件
- 支持的事件: subagent_spawn, subagent_summary, tool_use (Write/Read/Bash), error, user_response
- 事件广播到所有连接的客户端
- 自动重连 + 状态同步
- 历史事件缓存 (最近 100 条)

### 前端 (src/)
- `AgentWebSocket.ts` — WebSocket 客户端，自动重连
- `Game.ts` 更新 — 支持实时模式和模拟模式切换
- URL 参数 `?ws=ws://host:8787` 启用实时模式
- 状态栏显示 `[LIVE]` 或 `[SIM]`
- Agent 活动显示在 speech bubble 里 (文件名、命令等)

### 用法
```bash
# 启动后端，监听 Claude Code 日志
node server/src/index.js ~/.claude/CLAUDE.md.jsonl

# 启动前端 (开发模式)
cd pixel-agents && pnpm dev

# 启动前端并连接后端
# 浏览器打开: http://localhost:5173/?ws=ws://localhost:8787
```

## Phase 3: 任务系统 (Kanban) ✅ DONE

### KanbanBoard 组件 (`src/engine/KanbanBoard.ts`)
- 侧边滑出面板（4 列：Todo / In Progress / Review / Done）
- 任务卡片：标题 + 优先级徽章 + 负责人
- 优先级颜色：🔴 high / 🟡 medium / 🟢 low
- 列头颜色编码：蓝/黄/紫/绿

### 任务数据模型
- `Task` 类型: id, title, description, column, assignee, priority, createdAt
- 6 个默认任务，支持动态添加/移动/分配

### Agent 自主取任务
- 空闲 agent 自动从 Todo 列取最高优先级任务
- 取任务动画：走到看板区域 → 回到工位 → 开始工作
- 完成任务后自动移到 Review 列
- Speech bubble 显示任务名和进度

### 交互
- 📋 Kanban 按钮切换侧边面板
- 点击 agent 切换状态
- 状态栏显示任务统计 (todo→progress→review→done)
- Tooltip 显示 agent 当前任务详情

## Phase 4: 视觉升级 ✅ DONE

### 动画系统 (`src/engine/AnimationSystem.ts`)
- Animator 类: 多动画管理, 状态驱动切换
- 5 套预定义动画: idle, walking, typing, reading, error
- 帧循环 + 时间控制, 支持 loop/once 模式

### 精灵渲染器 (`src/engine/SpriteRenderer.ts`)
- 16x20 像素程序化精灵 (无需外部资源)
- 5 种角色专属皮肤:
  - Coder: 蓝色衬衫 + 眼镜
  - Reviewer: 红色衬衫 + 放大镜
  - Designer: 黄色衬衫 + 调色板 + 长发
  - Writer: 绿色衬衫 + 钢笔 + 短卷发
  - Tester: 紫色衬衫 + 虫子图标
- 动态动画: 行走腿部摆动, 打字手臂运动, 角色专属配件动画
- 状态指示器: 键盘发光 (typing), 红色闪烁 (error)

### 粒子系统 (`src/engine/ParticleSystem.ts`)
- 5 种粒子类型: spark, float, burst, steam, code
- 灵活的 emit API: 颜色/方向/速度/生命周期/扩散角度
- 物理模拟: 重力 (spark/burst), 上浮 (steam/code), 减速 (code)
- Code 粒子: 渲染为代码片段字符 (0, 1, {, }, </>, ;, fn, =>)
- 环境粒子: 咖啡蒸汽持续飘散

### 音效系统 (`src/engine/SoundSystem.ts`)
- Web Audio API 程序化音效 (零外部资源)
- 打字声: 短促点击音 (per-key 频率随机)
- 脚步声: 柔和低沉
- 完成音效: C-E-G-C 上行和弦
- 错误音效: 刺耳蜂鸣
- 任务拾取: 叮叮双音
- 音量控制 + 静音切换

### 环境粒子效果
- 打字: 代码字符上浮 + 角色色火花飞溅
- 行走: 脚部灰尘粒子
- 错误: 红色爆炸粒子
- 取任务: 金色闪光粒子

### 构建: 16 模块 → 36.5KB (gzip 11.6KB)

## Phase 5: 平台化 ✅ DONE

### REST API (`server/src/index.js`)
- 基于 Node.js http 服务器 + WebSocket 共享端口
- CORS 支持
- 端点:
  - `GET /api/health` — 服务器状态 + 连接数
  - `GET /api/agents` — 所有 agent 状态列表
  - `POST /api/agents/:id/state` — 更新 agent 状态
  - `GET /api/tasks` — 任务历史
  - `POST /api/tasks` — 添加新任务
  - `GET /api/events` — 事件历史 (?limit=N)
  - `POST /api/events` — 推送自定义事件
  - `GET /api/plugins` — 插件列表
  - `POST /api/plugins` — 注册插件
  - `GET /` — API 文档

### 插件系统 (`PluginManager`)
- 事件钩子系统: `pluginManager.hook('agent_event', handler)`
- 内置插件: default-theme, default-layout
- 热注册: POST /api/plugins 动态注册

### 配置系统 (`src/engine/ConfigSystem.ts`)
- **主题**: default / cyber / sunset (3 套配色)
- **布局**: Standard Office / Open Plan (2 种地图)
- **皮肤**: default / pastel (2 套角色配色)
- URL 参数切换: `?theme=cyber&layout=open-plan&skins=pastel`
- ConfigManager 类统一管理

### TileMap 重构
- 支持自定义布局配置
- 动态家具生成

### 构建: 17 模块 → 40.7KB (gzip 12.7KB)
