# Pixel Agents — 开发路线图

## 当前状态 (2026-04-10 16:05)
- ✅ MVP v0.1: 单文件 HTML，Canvas 渲染，模拟 agent 动画
- ✅ Phase 1: TypeScript 工程化重构
- ✅ Phase 2: WebSocket 实时同步
- ✅ Phase 3: Kanban 任务板
- ✅ Phase 4: 视觉升级 (粒子系统 + 精灵渲染)
- 代码: `pixel-agents/`

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

### 粒子系统 (`src/engine/ParticleSystem.ts`)
- 5 种粒子类型: spark, float, burst, steam, code
- 灵活的 emit API: 颜色/方向/速度/生命周期/扩散角度
- 物理模拟: 重力 (spark/burst), 上浮 (steam/code), 减速 (code)
- Code 粒子: 渲染为代码片段字符 (0, 1, {, }, </>, ;, fn, =>)

### 精灵渲染器 (`src/engine/SpriteRenderer.ts`)
- 16x20 像素程序化精灵 (无需外部资源)
- 5 种角色专属外观:
  - Coder: 蓝色衬衫 + 眼镜
  - Reviewer: 红色衬衫 + 放大镜
  - Designer: 黄色衬衫 + 调色板 + 长发
  - Writer: 绿色衬衫 + 钢笔 + 短卷发
  - Tester: 紫色衬衫 + 虫子图标
- 动态动画: 行走腿部摆动, 打字手臂运动, 角色专属配件动画
- 状态指示器: 键盘发光 (typing), 红色闪烁 (error)

### 环境粒子效果
- 打字: 代码字符上浮 + 角色色火花飞溅
- 行走: 脚部灰尘粒子
- 错误: 红色爆炸粒子
- 取任务: 金色闪光粒子
- 咖啡机: 蒸汽粒子持续飘散

### 构建: 15 模块 → 32.1KB (gzip 10.6KB)

## Phase 5: 平台化
- [ ] 开放 API
- [ ] 插件系统
- [ ] 主题商店
- [ ] Electron 桌面版
