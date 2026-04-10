# Pixel Agents — 开发路线图

## 当前状态 (2026-04-10 14:52)
- ✅ MVP v0.1: 单文件 HTML，Canvas 渲染，模拟 agent 动画
- ✅ Phase 1 完成: TypeScript 工程化重构，Vite 构建
- ✅ Phase 2 完成: WebSocket 实时同步 + JSONL 日志解析
- 代码: `pixel-agents/` (主项目), `pixel-agents/server/` (后端服务)
- 文档: `pixel-agents-mvp/docs/uml.md`

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

## Phase 3: 任务系统 (Kanban)
- [ ] Kanban 板 UI
- [ ] 任务卡片组件
- [ ] Agent 自主取任务逻辑
- [ ] 任务状态跟踪
- [ ] 完成动画

## Phase 4: 视觉升级
- [ ] Sprite sheet 动画系统
- [ ] 自定义角色皮肤
- [ ] 多房间支持
- [ ] 粒子效果 (敲代码冒火花等)
- [ ] 音效

## Phase 5: 平台化
- [ ] 开放 API
- [ ] 插件系统
- [ ] 主题商店
- [ ] Electron 桌面版
