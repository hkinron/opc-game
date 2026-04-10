# Pixel Agents — 开发路线图

## 当前状态 (2026-04-10 14:47)
- ✅ MVP v0.1: 单文件 HTML，Canvas 渲染，模拟 agent 动画
- ✅ Phase 1 完成: TypeScript 工程化重构，Vite 构建，11 模块，13.6KB
- 代码位置: `pixel-agents/` (TS 版本), `pixel-agents-mvp/index.html` (MVP 原版)
- 文档: `pixel-agents-mvp/docs/uml.md`
- UML: `docs/uml.md` 已写好

## Phase 1: 工程化重构 ✅ DONE

目标: 从单文件拆成正经 TS 项目，Vite 构建

### 任务清单
- [ ] 初始化 TypeScript 项目结构
- [ ] 拆分 TileMap 为独立模块
- [ ] 拆分 Agent 为独立模块（含状态机）
- [ ] 拆分 Renderer 为独立模块
- [ ] 拆分 BFS 寻路算法
- [ ] 拆分 Game 主循环
- [ ] Vite 构建配置
- [ ] TypeScript 严格模式
- [ ] 添加 README 和开发指南

### 目录结构
```
pixel-agents/
├── src/
│   ├── main.ts
│   ├── engine/
│   │   ├── Game.ts
│   │   ├── TileMap.ts
│   │   ├── Agent.ts
│   │   ├── Renderer.ts
│   │   └── BFS.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Phase 2: 接入真实 Agent

目标: 让像素角色反映真实 agent 的工作状态

### 架构
```
[Claude Code / Codex] → [JSONL Log] → [Log Parser] → [WebSocket Server] → [Frontend]
```

### 任务
- [ ] 后端 Node.js WebSocket 服务器
- [ ] Claude Code JSONL 日志解析器
- [ ] Agent 状态映射 (JSONL events → AgentState)
- [ ] 前端 WebSocket 客户端
- [ ] 实时状态同步
- [ ] 历史回放功能

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
