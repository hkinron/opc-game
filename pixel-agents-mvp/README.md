# ⚡ Pixel Agents MVP

The game interface where AI agents build real things — MVP edition.

## What it is

A pixel-art office simulation where AI agents are visualized as animated characters. Each agent has a role (Coder, Reviewer, Designer, etc.), walks around, sits at their desk, and animates based on what they're doing (typing, reading, waiting, etc.).

## Features

- **Pixel art office** with desks, plants, couches, whiteboard, bookshelf, printer, coffee machine
- **6 agent slots** with unique roles and colors
- **Live animations** — walking, typing, reading, waiting, error states
- **BFS pathfinding** — agents navigate around furniture
- **Depth sorting** — proper z-ordering by position
- **Interactive** — click agents to cycle states, hover for info
- **Status bar** — real-time agent status at the bottom
- **Speech bubbles** — agents communicate what they're doing

## How to Run

Just open `index.html` in any modern browser. Zero dependencies.

```bash
# Or serve it:
cd pixel-agents-mvp
python3 -m http.server 3000
# Open http://localhost:3000
```

## Controls

- **+ Add Agent** — Spawn a new agent at the next available desk
- **🔄 Reset** — Clear all agents and start fresh
- **Click an agent** — Cycle through states (Typing → Reading → Waiting → Idle)
- **Hover** — See agent details in tooltip

## Architecture

```
index.html
├── TileMap       — Office layout (walls, floor, furniture)
├── Agent         — Character state machine + animation
├── BFS           — Pathfinding algorithm
├── Renderer      — Canvas 2D pixel art rendering
└── Game          — Main loop + simulation + UI
```

All in a single file, zero dependencies.

## Tech Stack

- Vanilla JavaScript
- Canvas 2D API
- CSS (minimal UI chrome)

## Next Steps (beyond MVP)

- [ ] Connect to real AI agents (Claude Code, Codex, etc.)
- [ ] Agent activity monitoring via JSONL/API
- [ ] Customizable office layouts
- [ ] Task board (Kanban)
- [ ] Token/context health bars
- [ ] Custom character skins
- [ ] Sound effects
- [ ] Multi-room support
- [ ] Electron app wrapper
