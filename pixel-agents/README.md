# ⚡ Pixel Agents

> The game interface where AI agents build real things.

Watch your AI coding agents as pixel characters in a living office. They walk to desks, type at keyboards, read documents, pick tasks from a Kanban board, and celebrate when they're done.

## Demo

![Pixel Agents](https://img.shields.io/badge/status-in%20development-yellow)

## Features

- 🎮 **Pixel Art Office** — Desks, plants, couches, whiteboard, bookshelf, coffee machine, printer
- 👥 **5 Agent Roles** — Coder, Reviewer, Designer, Writer, Tester (each with unique sprite)
- 🤖 **AI Agent Integration** — Connect Claude Code / Codex via WebSocket for real-time status
- 📋 **Kanban Board** — Auto-assign tasks, agents pick work and complete it
- ✨ **Particle Effects** — Code sparks, typing particles, steam, error bursts
- 🔊 **Sound Effects** — Procedural audio: typing clicks, footsteps, completion chimes
- 🔄 **Real-time Sync** — WebSocket with auto-reconnect and state sync

## Quick Start

```bash
cd pixel-agents
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

### With Real Agent

```bash
# Start the WebSocket server
cd server && pnpm install && node src/index.js ~/.claude/CLAUDE.md.jsonl

# Open frontend with WebSocket URL
http://localhost:5173/?ws=ws://localhost:8787
```

## Architecture

```
┌─────────────────┐     JSONL      ┌──────────────┐     WebSocket     ┌──────────┐
│  Claude Code    │ ──────────────→ │ Log Parser   │ ────────────────→ │ Frontend │
│  / Codex        │                 │ (server/)    │                   │ (Canvas) │
└─────────────────┘                 └──────────────┘                   └──────────┘
```

## Project Structure

```
pixel-agents/
├── src/
│   ├── engine/
│   │   ├── Agent.ts           # Agent state machine + task workflow
│   │   ├── BFS.ts             # Pathfinding algorithm
│   │   ├── Game.ts            # Main game loop + simulation
│   │   ├── KanbanBoard.ts     # Task board UI
│   │   ├── ParticleSystem.ts  # Visual effects
│   │   ├── Renderer.ts        # Canvas 2D rendering
│   │   ├── SoundSystem.ts     # Procedural audio effects
│   │   ├── SpriteRenderer.ts  # Pixel art sprites
│   │   └── TileMap.ts         # Office layout
│   ├── types/
│   │   └── index.ts           # Type definitions
│   └── main.ts                # Entry point
├── server/
│   └── src/
│       └── index.js           # WebSocket + JSONL parser
├── index.html
├── package.json
└── vite.config.ts
```

## Tech Stack

- **Frontend**: TypeScript + Canvas 2D + Vite
- **Backend**: Node.js + ws (WebSocket)
- **Audio**: Web Audio API (procedural, no files)
- **Zero external assets** — everything is procedurally generated

## Roadmap

- [x] MVP — Basic pixel office + agent animation
- [x] Phase 1 — TypeScript engineering
- [x] Phase 2 — WebSocket real-time sync
- [x] Phase 3 — Kanban task board
- [x] Phase 4 — Visual upgrades (particles + sprites + audio)
- [ ] Phase 5 — Platform (API + plugins + Electron)

## License

MIT
