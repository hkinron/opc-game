import { TileMap, TILE_CONFIG } from './TileMap';
import { Agent, ROLE_COLORS } from './Agent';
import { SpriteRenderer } from './SpriteRenderer';
import { ParticleSystem } from './ParticleSystem';
import { SoundSystem } from './SoundSystem';
import { ThemeColors } from './ConfigSystem';
import { TileType, AgentState } from '../types';
import { KanbanBoard, TASK_COLORS, PRIORITY_COLORS } from './KanbanBoard';
import { InteractionSystem } from './InteractionSystem';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private tileMap: TileMap;
  private kanbanBoard: KanbanBoard | null = null;
  private particles: ParticleSystem;
  private sounds: SoundSystem;
  private interactions: InteractionSystem | null = null;
  private hoverTile: { x: number; y: number } | null = null;
  private theme: ThemeColors;
  tileSize: number = 32;

  constructor(canvas: HTMLCanvasElement, tileMap: TileMap, theme?: ThemeColors) {
    this.ctx = canvas.getContext('2d')!;
    this.tileMap = tileMap;
    this.theme = theme || {
      background: '#1a1a2e', wall: '#2a2a3e', wallHighlight: 'rgba(255,255,255,0.1)',
      wallShadow: 'rgba(0,0,0,0.2)', floor: '#4a4a6a', floorPattern: 'rgba(255,255,255,0.03)',
      floorGrid: 'rgba(255,255,255,0.05)', desk: '#8b6914', deskTop: '#a07820',
      deskLeg: '#6b5010', monitor: '#333', monitorScreen: '#5599cc', accent: '#e94560',
      text: '#e0e0e0', textMuted: '#94a3b8', header: '#16213e', headerBorder: '#0f3460',
      statusbar: '#16213e', statusbarBorder: '#0f3460',
    };
    this.particles = new ParticleSystem(this.ctx);
    this.sounds = new SoundSystem();
    this.resize(canvas);
  }

  setKanbanBoard(board: KanbanBoard): void {
    this.kanbanBoard = board;
  }

  setInteractions(system: InteractionSystem): void {
    this.interactions = system;
  }

  setHoverTile(x: number, y: number): void {
    this.hoverTile = { x, y };
  }

  getSoundSystem(): SoundSystem {
    return this.sounds;
  }

  resize(canvas: HTMLCanvasElement): void {
    const headerH = 44, statusH = 34;
    const availW = window.innerWidth, availH = window.innerHeight - headerH - statusH;
    this.tileSize = Math.max(16, Math.min(40, Math.floor(Math.min(availW / this.tileMap.width, availH / this.tileMap.height))));
    const w = this.tileMap.width * this.tileSize, h = this.tileMap.height * this.tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(agents: Agent[], time: number): void {
    const ctx = this.ctx, ts = this.tileSize;

    // Draw tiles
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const type = this.tileMap.tiles[y][x], px = x * ts, py = y * ts;
        ctx.fillStyle = TILE_CONFIG[type].color;
        ctx.fillRect(px, py, ts, ts);
        if (type === TileType.Floor) {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          if ((x + y) % 2 === 0) ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.strokeRect(px, py, ts, ts);
        }
        if (type === TileType.Wall) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px, py, ts, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px, py + ts - 2, ts, 2);
        }
        if (type === TileType.Desk) this.drawDesk(px, py, ts);
        if (type === TileType.Plant) this.drawPlant(px, py, ts, time);
        if (type === TileType.Couch) this.drawCouch(px, py, ts);
        if (type === TileType.Whiteboard) this.drawWhiteboard(px, py, ts);
        if (type === TileType.Bookshelf) this.drawBookshelf(px, py, ts);
        if (type === TileType.Printer) this.drawPrinter(px, py, ts, time);
        if (type === TileType.Coffee) this.drawCoffee(px, py, ts, time);
        if (type === TileType.Kanban) this.drawKanbanTile(px, py, ts, time);
      }
    }

    // Highlight interactable objects on hover
    if (this.hoverTile && this.interactions) {
      const obj = this.interactions.getInteractableAt(this.hoverTile.x, this.hoverTile.y);
      if (obj) {
        const px = obj.nearbyTile.x * ts;
        const py = obj.nearbyTile.y * ts;
        ctx.strokeStyle = 'rgba(250,204,21,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(px - 2, py - 2, ts + 4, ts + 4);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(250,204,21,0.15)';
        ctx.fillRect(px - 2, py - 2, ts + 4, ts + 4);
      }
    }

    // Draw Kanban overlay
    if (this.kanbanBoard) this.drawKanbanOverlay(ts, time);

    // Emit ambient particles (coffee steam, etc.)
    this.emitAmbientParticles(ts, time);

    // Draw agents sorted by Y for depth
    [...agents].sort((a, b) => a.y - b.y).forEach(a => {
      // Emit state-based particles
      this.emitStateParticles(a, ts, time);
      // Draw agent using SpriteRenderer
      this.drawAgent(a, ts, time);
    });

    // Update and render particles on top
    this.particles.updateAndRender(0.016);
  }

  // ============================================
  // Tile Drawing
  // ============================================

  private drawKanbanTile(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#2d2d4e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.strokeStyle = '#5a5a8e';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    const dotColors = ['#3b82f6', '#f59e0b', '#22c55e'];
    const colIdx = x - 4;
    if (colIdx >= 0 && colIdx < 3) {
      c.fillStyle = dotColors[colIdx];
      c.fillRect(x + ts / 2 - 3, y + ts / 2 - 2, 6, 6);
    }
    c.fillStyle = '#94a3b8';
    c.font = '8px monospace';
    c.textAlign = 'center';
    const labels = ['TODO', 'DOING', 'DONE'];
    if (colIdx >= 0 && colIdx < labels.length) {
      c.fillText(labels[colIdx], x + ts / 2, y + ts / 2 + 8);
    }
  }

  private drawKanbanOverlay(ts: number, time: number): void {
    if (!this.kanbanBoard) return;
    const c = this.ctx;
    const board = this.kanbanBoard;
    const bx = board.getTileX() * ts;
    const by = board.getTileY() * ts;
    const bw = board.getTileWidth() * ts;
    const bh = ts;

    c.fillStyle = '#1e1e3a';
    c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    c.strokeStyle = '#6366f1';
    c.lineWidth = 2;
    c.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);

    c.fillStyle = '#e2e8f0';
    c.font = 'bold 10px monospace';
    c.textAlign = 'center';
    c.fillText('📋 KANBAN', bx + bw / 2, by + bh + 12);

    const tasks = board.getTasks();
    const todoTasks = tasks.filter(t => t.state === 'todo');
    const doingTasks = tasks.filter(t => t.state === 'doing');
    const doneTasks = tasks.filter(t => t.state === 'done');

    const colWidth = bw / 3;
    for (let i = 1; i < 3; i++) {
      c.strokeStyle = 'rgba(99,102,241,0.3)';
      c.lineWidth = 1;
      c.setLineDash([2, 2]);
      c.beginPath();
      c.moveTo(bx + colWidth * i, by - 2);
      c.lineTo(bx + colWidth * i, by + bh + 2);
      c.stroke();
      c.setLineDash([]);
    }

    const cardY = by + bh + 18;
    const cardH = 14;

    const drawCards = (cols: { tasks: typeof tasks; colIdx: number; color: { bg: string; border: string } }[]) => {
      for (const { tasks: colTasks, colIdx, color } of cols) {
        const colX = bx + colWidth * colIdx + 2;
        const maxCards = Math.min(colTasks.length, 4);
        for (let i = 0; i < maxCards; i++) {
          const task = colTasks[i];
          const cy = cardY + i * (cardH + 2);
          const cardW = colWidth - 6;
          c.fillStyle = color.bg + '40';
          c.fillRect(colX, cy, cardW, cardH);
          c.strokeStyle = color.border;
          c.lineWidth = 1;
          c.strokeRect(colX, cy, cardW, cardH);
          c.fillStyle = PRIORITY_COLORS[task.priority] || '#888';
          c.fillRect(colX + 2, cy + 3, 4, 4);
          c.fillStyle = '#e2e8f0';
          c.font = '7px monospace';
          c.textAlign = 'left';
          const title = task.title.length > 12 ? task.title.substring(0, 11) + '…' : task.title;
          c.fillText(title, colX + 8, cy + 10);
        }
        if (colTasks.length > 4) {
          c.fillStyle = '#64748b';
          c.font = '7px monospace';
          c.textAlign = 'left';
          c.fillText(`+${colTasks.length - 4} more`, colX, cardY + maxCards * (cardH + 2) + 10);
        }
      }
    };

    drawCards([
      { tasks: todoTasks, colIdx: 0, color: TASK_COLORS.todo },
      { tasks: doingTasks, colIdx: 1, color: TASK_COLORS.doing },
      { tasks: doneTasks, colIdx: 2, color: TASK_COLORS.done },
    ]);
  }

  private drawDesk(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a07820'; c.fillRect(x + 2, y + 4, ts - 4, ts - 8);
    c.fillStyle = '#6b5010'; c.fillRect(x + 3, y + ts - 6, 3, 4); c.fillRect(x + ts - 6, y + ts - 6, 3, 4);
    c.fillStyle = '#333'; c.fillRect(x + ts / 2 - 4, y + 6, 8, 6);
    c.fillStyle = '#5599cc'; c.fillRect(x + ts / 2 - 3, y + 7, 6, 4);
    c.fillStyle = 'rgba(85,153,204,0.3)'; c.fillRect(x + ts / 2 - 4, y + 5, 8, 8);
  }

  private drawPlant(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx, sway = Math.sin(t * 2);
    c.fillStyle = '#8b4513'; c.fillRect(x + ts / 2 - 4, y + ts - 10, 8, 8);
    c.fillStyle = '#3a8a2a'; c.fillRect(x + ts / 2 - 2 + sway, y + 6, 4, ts - 16);
    c.fillStyle = '#4aaa3a'; c.fillRect(x + ts / 2 - 5 + sway, y + 4, 4, 6); c.fillRect(x + ts / 2 + 1 + sway, y + 2, 4, 8);
  }

  private drawCouch(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a04040'; c.fillRect(x + 2, y + ts / 2 - 4, ts - 4, ts / 2 - 2);
    c.fillStyle = '#8b3a3a'; c.fillRect(x + 2, y + ts / 2 + 2, ts - 4, 4);
    c.fillStyle = '#b05050'; c.fillRect(x + 4, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6); c.fillRect(x + ts / 2 + 2, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
  }

  private drawWhiteboard(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#d0d0e0'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#e8e8f0'; c.fillRect(x + 4, y + 4, ts - 8, ts - 8);
    c.fillStyle = '#333'; c.fillRect(x + 6, y + 8, ts - 14, 2); c.fillRect(x + 6, y + 13, ts - 20, 2); c.fillRect(x + 6, y + 18, ts - 16, 2);
  }

  private drawBookshelf(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#4a2a10'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#5c3a1e'; c.fillRect(x + 3, y + ts / 2 - 1, ts - 6, 2);
    ['#d94a4a', '#4a90d9', '#d9a94a', '#4ad97a', '#a94ad9'].forEach((cl, i) => { c.fillStyle = cl; c.fillRect(x + 4 + i * 6, y + 4, 4, ts / 2 - 6); });
    ['#4a90d9', '#d9a94a', '#4ad97a'].forEach((cl, i) => { c.fillStyle = cl; c.fillRect(x + 4 + i * 7, y + ts / 2 + 1, 5, ts / 2 - 7); });
  }

  private drawPrinter(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#555'; c.fillRect(x + 4, y + 8, ts - 8, ts - 12);
    c.fillStyle = '#666'; c.fillRect(x + 6, y + 10, ts - 12, 6);
    if (Math.sin(t * 0.5) > 0) { c.fillStyle = '#fff'; c.fillRect(x + ts / 2 - 3, y + ts - 8, 6, 6); }
  }

  private drawCoffee(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#8b6914'; c.fillRect(x + 6, y + ts / 2, ts - 12, ts / 2 - 4);
    c.fillStyle = '#f0f0f0'; c.fillRect(x + ts / 2 - 3, y + ts / 2 + 2, 6, 6);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    const sy = y + ts / 2 + Math.sin(t * 3) * 2;
    c.fillRect(x + ts / 2 - 2, sy, 1, 4); c.fillRect(x + ts / 2 + 1, sy + 1, 1, 3);
  }

  // ============================================
  // Particle Effects
  // ============================================

  /** Ambient particles from the environment */
  private emitAmbientParticles(ts: number, time: number): void {
    // Coffee steam
    const coffeeTileX = 7, coffeeTileY = 5; // coffee position in TileMap
    if (Math.random() < 0.08) {
      this.particles.emit({
        x: coffeeTileX * ts + ts / 2,
        y: coffeeTileY * ts + ts / 4,
        count: 1,
        type: 'steam',
        color: '#ffffff',
        speed: 0.4,
        size: 3,
        life: 2,
        direction: 'up',
      });
    }
  }

  /** State-based particles per agent */
  private emitStateParticles(agent: Agent, ts: number, time: number): void {
    const px = agent.x * ts + ts / 2;
    const py = agent.y * ts + ts / 2;

    switch (agent.state) {
      case AgentState.Typing: {
        // Code sparks — floating code characters
        if (Math.random() < 0.3) {
          this.particles.emit({
            x: px, y: py + ts / 4,
            count: 1,
            type: 'code',
            colors: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'],
            speed: 0.5,
            life: 1.5,
            direction: 'up',
          });
        }
        // Typing sparks — colored bursts from keyboard
        if (Math.random() < 0.2) {
          this.particles.emit({
            x: px, y: py + ts / 3,
            count: 2,
            type: 'spark',
            color: ROLE_COLORS[agent.config.role].accent,
            speed: 0.8,
            size: 1.5,
            life: 0.6,
            spread: Math.PI * 0.5,
            direction: 'up',
          });
        }
        break;
      }

      case AgentState.Walking: {
        // Dust particles while walking
        if (agent.animFrame % 2 === 0 && Math.random() < 0.3) {
          this.particles.emit({
            x: px, y: py + ts / 2,
            count: 1,
            type: 'float',
            color: '#94a3b8',
            speed: 0.3,
            size: 2,
            life: 0.8,
            direction: 'up',
          });
        }
        break;
      }

      case AgentState.Error: {
        // Red error burst
        if (Math.random() < 0.15) {
          this.particles.emit({
            x: px, y: py,
            count: 3,
            type: 'burst',
            color: '#ef4444',
            speed: 1.5,
            size: 2,
            life: 0.8,
          });
        }
        break;
      }

      case AgentState.FetchingTask: {
        // Sparkle when getting a task
        if (Math.random() < 0.2) {
          this.particles.emit({
            x: px, y: py - ts / 2,
            count: 2,
            type: 'burst',
            colors: ['#fbbf24', '#fde68a', '#f59e0b'],
            speed: 1,
            size: 2,
            life: 1,
          });
        }
        break;
      }
    }
  }

  // ============================================
  // Agent Drawing — now uses SpriteRenderer
  // ============================================

  private drawAgent(a: Agent, ts: number, time: number): void {
    const ctx = this.ctx;
    const px = a.x * ts + ts / 2;
    const py = a.y * ts + ts / 2 + a.bobOffset;

    // Use SpriteRenderer for pixel art characters
    SpriteRenderer.drawAgent(ctx, px, py, a.config.role, a.state, a.animFrame, a.facing, time);

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(a.config.name, px, py + ts / 2 + 10);

    // State emoji
    const emoji: Record<string, string> = {
      idle: '😴', walking: '🚶', typing: '⌨️',
      reading: '📖', waiting: '⏳', error: '❌', fetching_task: '📋'
    };
    ctx.font = '10px sans-serif';
    ctx.fillText(emoji[a.state] || '', px, py - ts / 2 - 8);

    // Task indicator
    if (a.currentTask) {
      const taskEmoji = a.taskWorkflow === 'working_on_task' ? '💻'
        : a.taskWorkflow === 'walking_to_complete' ? '✅' : '📋';
      ctx.font = '8px monospace';
      ctx.fillStyle = '#a5b4fc';
      ctx.textAlign = 'center';
      ctx.fillText(`${taskEmoji} ${a.currentTask.title}`, px, py - ts / 2 - 20);
    }

    // Speech bubble
    if (a.speechBubble) {
      this.drawSpeechBubble(px, py - ts / 2 - 12, a.speechBubble);
    }
  }

  private drawSpeechBubble(x: number, y: number, text: string): void {
    const ctx = this.ctx;
    ctx.font = '10px monospace';
    const tw = ctx.measureText(text).width + 12, th = 18;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - th, tw, th, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x + 4, y);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 6);
  }
}
