import { TileMap, TILE_CONFIG } from './TileMap';
import { Agent, ROLE_COLORS } from './Agent';
import { TileType, AgentState } from '../types';
import { KanbanBoard, TASK_COLORS, PRIORITY_COLORS } from './KanbanBoard';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private tileMap: TileMap;
  private kanbanBoard: KanbanBoard | null = null;
  tileSize: number = 32;

  constructor(canvas: HTMLCanvasElement, tileMap: TileMap) {
    this.ctx = canvas.getContext('2d')!;
    this.tileMap = tileMap;
    this.resize(canvas);
  }

  setKanbanBoard(board: KanbanBoard): void {
    this.kanbanBoard = board;
  }

  resize(canvas: HTMLCanvasElement): void {
    const headerH = 44, statusH = 34;
    const availW = window.innerWidth, availH = window.innerHeight - headerH - statusH;
    this.tileSize = Math.max(16, Math.min(40, Math.floor(Math.min(availW / this.tileMap.width, availH / this.tileMap.height))));
    const w = this.tileMap.width * this.tileSize, h = this.tileMap.height * this.tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h * 'px';
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(agents: Agent[], time: number): void {
    const ctx = this.ctx, ts = this.tileSize;
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

    // Draw Kanban board overlay (cards above the board)
    if (this.kanbanBoard) this.drawKanbanOverlay(ts, time);

    [...agents].sort((a, b) => a.y - b.y).forEach(a => this.drawAgent(a, ts));
  }

  private drawKanbanTile(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // Board background
    c.fillStyle = '#2d2d4e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    // Board frame
    c.strokeStyle = '#5a5a8e';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    // Column header dots
    const dotColors = ['#3b82f6', '#f59e0b', '#22c55e'];
    const colIdx = x - (4); // KANBAN_BOARD.x = 4
    if (colIdx >= 0 && colIdx < 3) {
      c.fillStyle = dotColors[colIdx];
      c.fillRect(x + ts / 2 - 3, y + ts / 2 - 2, 6, 6);
    }
    // Title
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

    // Draw board frame spanning all tiles
    const bx = board.getTileX() * ts;
    const by = board.getTileY() * ts;
    const bw = board.getTileWidth() * ts;
    const bh = ts;

    // Board frame
    c.fillStyle = '#1e1e3a';
    c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    c.strokeStyle = '#6366f1';
    c.lineWidth = 2;
    c.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);

    // Title
    c.fillStyle = '#e2e8f0';
    c.font = 'bold 10px monospace';
    c.textAlign = 'center';
    c.fillText('📋 KANBAN', bx + bw / 2, by + bh + 12);

    // Task cards floating below the board
    const tasks = board.getTasks();
    const todoTasks = tasks.filter(t => t.state === 'todo');
    const doingTasks = tasks.filter(t => t.state === 'doing');
    const doneTasks = tasks.filter(t => t.state === 'done');

    // Draw column separators
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

    // Draw cards below the board
    const cardY = by + bh + 18;
    const cardH = 14;
    const cardMaxH = 80; // max height for cards area

    const drawCards = (cols: { tasks: typeof tasks; colIdx: number; color: { bg: string; border: string } }[]) => {
      for (const { tasks: colTasks, colIdx, color } of cols) {
        const colX = bx + colWidth * colIdx + 2;
        const maxCards = Math.min(colTasks.length, 4);
        for (let i = 0; i < maxCards; i++) {
          const task = colTasks[i];
          const cy = cardY + i * (cardH + 2);
          const cardW = colWidth - 6;

          // Card background
          c.fillStyle = color.bg + '40'; // semi-transparent
          c.fillRect(colX, cy, cardW, cardH);
          c.strokeStyle = color.border;
          c.lineWidth = 1;
          c.strokeRect(colX, cy, cardW, cardH);

          // Priority dot
          c.fillStyle = PRIORITY_COLORS[task.priority] || '#888';
          c.fillRect(colX + 2, cy + 3, 4, 4);

          // Task title (truncated)
          c.fillStyle = '#e2e8f0';
          c.font = '7px monospace';
          c.textAlign = 'left';
          const title = task.title.length > 12 ? task.title.substring(0, 11) + '…' : task.title;
          c.fillText(title, colX + 8, cy + 10);
        }
        // Count badge if more cards
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

    // Draw "..." if there are more tasks than shown
    const maxVisible = 4;
    const anyOverflow = todoTasks.length > maxVisible || doingTasks.length > maxVisible || doneTasks.length > maxVisible;
    if (anyOverflow) {
      c.fillStyle = '#94a3b8';
      c.font = '8px monospace';
      c.textAlign = 'center';
      c.fillText(`📊 ${tasks.length} tasks total`, bx + bw / 2, cardY + maxVisible * (cardH + 2) + 16);
    }
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

  private drawAgent(a: Agent, ts: number): void {
    const ctx = this.ctx;
    const px = a.x * ts + ts / 2, py = a.y * ts + ts / 2 + a.bobOffset;
    const col = ROLE_COLORS[a.config.role];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath();
    ctx.ellipse(px, py + ts / 2 - 2, ts / 3, ts / 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.body; const bw = ts / 2.5, bh = ts / 2.5;
    ctx.fillRect(px - bw, py - bh / 2, bw * 2, bh);
    ctx.fillStyle = '#e8c39e'; const hs = ts / 3.5;
    ctx.fillRect(px - hs, py - hs * 2, hs * 2, hs * 2);
    ctx.fillStyle = '#444'; ctx.fillRect(px - hs, py - hs * 2, hs * 2, 3);
    ctx.fillStyle = '#333';
    const ex = a.facing === 'left' ? -2 : a.facing === 'right' ? 2 : 0;
    ctx.fillRect(px - 3 + ex, py - hs - 1, 2, 2); ctx.fillRect(px + 1 + ex, py - hs - 1, 2, 2);
    switch (a.state) {
      case AgentState.Typing:
        ctx.fillStyle = col.accent; const ao = Math.sin(a.animFrame * Math.PI / 2) * 3;
        ctx.fillRect(px - bw - 2, py - 2 + ao, 3, 6); ctx.fillRect(px + bw - 1, py - 2 - ao, 3, 6); break;
      case AgentState.Walking:
        ctx.fillStyle = '#335'; const lo = Math.sin(a.animFrame * Math.PI / 2) * 3;
        ctx.fillRect(px - 3, py + bh / 2, 3, 4 + lo); ctx.fillRect(px, py + bh / 2, 3, 4 - lo); break;
      case AgentState.Reading:
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.strokeRect(px - 5, py - hs - 2, 4, 3); ctx.strokeRect(px + 1, py - hs - 2, 4, 3); break;
      case AgentState.Waiting:
        ctx.fillStyle = '#fbbf24'; ctx.font = `${ts / 2}px monospace`; ctx.textAlign = 'center';
        ctx.fillText('?', px, py - hs * 2 - 4); break;
      case AgentState.Error:
        ctx.fillStyle = '#ef4444'; ctx.font = `${ts / 2}px monospace`; ctx.textAlign = 'center';
        ctx.fillText('!', px, py - hs * 2 - 4); break;
      case AgentState.FetchingTask:
        // Happy dance / sparkle
        ctx.fillStyle = '#fbbf24'; ctx.font = `${ts / 2}px monospace`; ctx.textAlign = 'center';
        ctx.fillText('✨', px, py - hs * 2 - 4);
        break;
    }
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.config.name, px, py + bh / 2 + 12);
    const emoji: Record<string, string> = { idle: '😴', walking: '🚶', typing: '⌨️', reading: '📖', waiting: '⏳', error: '❌', fetching_task: '📋' };
    ctx.font = '10px sans-serif'; ctx.fillText(emoji[a.state] || '', px, py - hs * 2 - 8);

    // Task indicator above agent
    if (a.currentTask) {
      const taskEmoji = a.taskWorkflow === 'working_on_task' ? '💻' : a.taskWorkflow === 'walking_to_complete' ? '✅' : '📋';
      ctx.font = '8px monospace';
      ctx.fillStyle = '#a5b4fc';
      ctx.textAlign = 'center';
      ctx.fillText(`${taskEmoji} ${a.currentTask.title}`, px, py - hs * 2 - 20);
    }

    if (a.speechBubble) this.drawSpeechBubble(px, py - hs * 3 - 20, a.speechBubble);
  }

  private drawSpeechBubble(x: number, y: number, text: string): void {
    const ctx = this.ctx;
    ctx.font = '10px monospace'; const tw = ctx.measureText(text).width + 12, th = 18;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - th, tw, th, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x + 4, y); ctx.fill();
    ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 6);
  }
}
