import { TileMap, TILE_CONFIG } from './TileMap';
import { Agent, ROLE_COLORS } from './Agent';
import { SpriteRenderer } from './SpriteRenderer';
import { ParticleSystem } from './ParticleSystem';
import { SoundSystem } from './SoundSystem';
import { ThemeColors } from './ConfigSystem';
import { TileType, AgentState } from '../types';
import { KanbanBoard, TASK_COLORS, PRIORITY_COLORS } from './KanbanBoard';
import { InteractionSystem } from './InteractionSystem';
import { OfficeCat, CatState } from './OfficeCat';
import { DayNightCycle, AtmosphereState, Weather } from './DayNightCycle';
import { Boss, BossState } from './Boss';

interface OfficeEvent { message: string; timer: number; color: string; flashTimer: number; }
interface ConfettiParticle { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number; rotation: number; rotSpeed: number; }
interface RainDrop { x: number; y: number; speed: number; length: number; }
interface SnowFlake { x: number; y: number; speed: number; drift: number; size: number; }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private tileMap: TileMap;
  private kanbanBoard: KanbanBoard | null = null;
  private particles: ParticleSystem;
  private sounds: SoundSystem;
  private interactions: InteractionSystem | null = null;
  private hoverTile: { x: number; y: number } | null = null;
  private theme: ThemeColors;
  private officeCat: OfficeCat | null = null;
  private boss: Boss | null = null;
  private dayNight: DayNightCycle;
  tileSize: number = 32;
  private activeEvents: OfficeEvent[] = [];
  private discoMode: boolean = false;
  private confetti: ConfettiParticle[] = [];
  private rainDrops: RainDrop[] = [];
  private snowFlakes: SnowFlake[] = [];

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
    this.dayNight = new DayNightCycle();
    // Init weather particles
    const W = canvas.width, H = canvas.height;
    for (let i = 0; i < 80; i++) this.rainDrops.push({ x: Math.random() * W, y: Math.random() * H, speed: 4 + Math.random() * 4, length: 8 + Math.random() * 8 });
    for (let i = 0; i < 50; i++) this.snowFlakes.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.5 + Math.random() * 1.5, drift: (Math.random() - 0.5) * 0.5, size: 1 + Math.random() * 2 });
    this.resize(canvas);
  }

  setKanbanBoard(board: KanbanBoard): void { this.kanbanBoard = board; }
  setInteractions(system: InteractionSystem): void { this.interactions = system; }
  setOfficeCat(cat: OfficeCat): void { this.officeCat = cat; }
  setBoss(b: Boss): void { this.boss = b; }
  setHoverTile(x: number, y: number): void { this.hoverTile = { x, y }; }
  getSoundSystem(): SoundSystem { return this.sounds; }
  getDayNight(): DayNightCycle { return this.dayNight; }

  triggerEvent(msg: string, duration: number = 15): void {
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
    this.activeEvents.push({ message: msg, timer: duration, color: colors[Math.floor(Math.random() * colors.length)], flashTimer: 0 });
  }

  triggerConfetti(x: number, y: number): void {
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 3;
      this.confetti.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, color: colors[Math.floor(Math.random() * colors.length)], life: 1, size: 2 + Math.random() * 3, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3 });
    }
  }

  toggleDisco(): void {
    this.discoMode = !this.discoMode;
    if (this.discoMode) this.triggerEvent('🕺 迪斯科模式开启！', 30);
    else this.triggerEvent('🎵 迪斯科模式关闭', 5);
  }

  resize(canvas: HTMLCanvasElement): void {
    const headerH = 44, statusH = 34;
    const availW = window.innerWidth, availH = window.innerHeight - headerH - statusH;
    this.tileSize = Math.max(16, Math.min(40, Math.floor(Math.min(availW / this.tileMap.width, availH / this.tileMap.height))));
    const w = this.tileMap.width * this.tileSize, h = this.tileMap.height * this.tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    // Use setTransform instead of scale to prevent compounding on repeated resizes
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(agents: Agent[], time: number): void {
    const ctx = this.ctx, ts = this.tileSize;
    const atm = this.dayNight.getState();

    // ---- Clear canvas (in device pixels) ----
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();

    // ---- Draw tiles ----
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const type = this.tileMap.tiles[y][x], px = x * ts, py = y * ts;

        if (type === TileType.Wall) {
          this.drawWall(px, py, ts, x, y);
        } else if (type === TileType.Floor) {
          this.drawFloor(px, py, ts, x, y, time);
        }
        if (type === TileType.Desk) this.drawDesk(px, py, ts);
        else if (type === TileType.Plant) this.drawPlant(px, py, ts, time);
        else if (type === TileType.Couch) this.drawCouch(px, py, ts);
        else if (type === TileType.Whiteboard) this.drawWhiteboard(px, py, ts);
        else if (type === TileType.Bookshelf) this.drawBookshelf(px, py, ts);
        else if (type === TileType.Printer) this.drawPrinter(px, py, ts, time);
        else if (type === TileType.Window) this.drawWindow(px, py, ts, time, atm);
        else if (type === TileType.Clock) this.drawClock(px, py, ts);
        else if (type === TileType.Poster) this.drawPoster(px, py, ts, x, y);
        else if (type === TileType.Carpet) this.drawCarpet(px, py, ts, x, y);
        else if (type === TileType.Lamp) this.drawLamp(px, py, ts, time, atm);
        else if (type === TileType.WaterCooler) this.drawWaterCooler(px, py, ts, time);
        else if (type === TileType.Fridge) this.drawFridge(px, py, ts);
        else if (type === TileType.TrashCan) this.drawTrashCan(px, py, ts);
        else if (type === TileType.Door) this.drawDoor(px, py, ts);
        else if (type === TileType.Coffee) this.drawCoffee(px, py, ts, time);
        else if (type === TileType.Kanban) this.drawKanbanTile(px, py, ts, time);
        else if (type === TileType.MeetingTable) this.drawMeetingTable(px, py, ts, time, x, y);
        else if (type === TileType.Microwave) this.drawMicrowave(px, py, ts, time);
        else if (type === TileType.SnackBar) this.drawSnackBar(px, py, ts, time);
        else if (type === TileType.Elevator) this.drawElevator(px, py, ts, time);
        else if (type === TileType.ReceptionDesk) this.drawReceptionDesk(px, py, ts);
        else if (type === TileType.Restroom) this.drawRestroom(px, py, ts);
        else if (type === TileType.Signpost) this.drawSignpost(px, py, ts, time);
        else if (type === TileType.PackageLocker) this.drawPackageLocker(px, py, ts, time);
        else if (type === TileType.DeskCup) this.drawDeskCup(px, py, ts, time);
        else if (type === TileType.DeskPlant) this.drawDeskPlant(px, py, ts, time);
        else if (type === TileType.DeskPhoto) this.drawDeskPhoto(px, py, ts);
        else if (type === TileType.UmbrellaStand) this.drawUmbrellaStand(px, py, ts, time);
        else if (type === TileType.AttendanceMachine) this.drawAttendanceMachine(px, py, ts, time);
      }
    }

    // Hover highlight
    if (this.hoverTile && this.interactions) {
      const obj = this.interactions.getInteractableAt(this.hoverTile.x, this.hoverTile.y);
      if (obj) {
        const px = obj.nearbyTile.x * ts, py = obj.nearbyTile.y * ts;
        ctx.strokeStyle = 'rgba(250,204,21,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.strokeRect(px - 2, py - 2, ts + 4, ts + 4); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(250,204,21,0.15)'; ctx.fillRect(px - 2, py - 2, ts + 4, ts + 4);
      }
    }

    // Office cat
    if (this.officeCat) this.drawCat(this.officeCat, ts, time);

    // Kanban overlay
    if (this.kanbanBoard) this.drawKanbanOverlay(ts, time);

    // Ambient particles
    this.emitAmbientParticles(ts, time, atm);

    // Agents (sorted by Y for depth)
    [...agents].sort((a, b) => a.y - b.y).forEach(a => {
      this.emitStateParticles(a, ts, time);
      this.drawAgent(a, ts, time);
    });

    // Boss NPC (if visible)
    if (this.boss && this.boss.isVisible()) {
      this.drawBoss(this.boss, ts, time);
    }

    // Weather (rain/snow)
    this.drawWeather(ts, time, atm);

    // Day/night lighting
    this.drawLighting(time, atm);

    // Disco
    if (this.discoMode) this.drawDisco(time);

    // Confetti
    this.updateAndDrawConfetti();

    // Particle system on top
    this.particles.updateAndRender(0.016);

    // Event banner
    this.drawEventBanner(time);

    // Update timers
    for (let i = this.activeEvents.length - 1; i >= 0; i--) { this.activeEvents[i].timer -= 0.016; this.activeEvents[i].flashTimer += 0.016; if (this.activeEvents[i].timer <= 0) this.activeEvents.splice(i, 1); }
    this.dayNight.update(0.016);
  }

  // ============================================
  // Tile Drawing
  // ============================================

  private drawKanbanTile(x: number, y: number, ts: number, _t: number): void {
    const c = this.ctx;
    c.fillStyle = '#2d2d4e'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.strokeStyle = '#5a5a8e'; c.lineWidth = 1; c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    const dotColors = ['#3b82f6', '#f59e0b', '#22c55e'];
    const colIdx = x - 4;
    if (colIdx >= 0 && colIdx < 3) { c.fillStyle = dotColors[colIdx]; c.fillRect(x + ts / 2 - 3, y + ts / 2 - 2, 6, 6); }
    c.fillStyle = '#94a3b8'; c.font = '8px monospace'; c.textAlign = 'center';
    const labels = ['TODO', 'DOING', 'DONE'];
    if (colIdx >= 0 && colIdx < labels.length) c.fillText(labels[colIdx], x + ts / 2, y + ts / 2 + 8);
  }

  private drawKanbanOverlay(ts: number, _time: number): void {
    if (!this.kanbanBoard) return;
    const c = this.ctx, board = this.kanbanBoard;
    const bx = board.getTileX() * ts, by = board.getTileY() * ts, bw = board.getTileWidth() * ts, bh = ts;
    c.fillStyle = '#1e1e3a'; c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    c.strokeStyle = '#6366f1'; c.lineWidth = 2; c.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
    c.fillStyle = '#e2e8f0'; c.font = 'bold 10px monospace'; c.textAlign = 'center';
    c.fillText('📋 KANBAN', bx + bw / 2, by + bh + 12);
    const tasks = board.getTasks();
    const todoTasks = tasks.filter(t => t.state === 'todo');
    const doingTasks = tasks.filter(t => t.state === 'doing');
    const doneTasks = tasks.filter(t => t.state === 'done');
    const colWidth = bw / 3;
    for (let i = 1; i < 3; i++) { c.strokeStyle = 'rgba(99,102,241,0.3)'; c.lineWidth = 1; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(bx + colWidth * i, by - 2); c.lineTo(bx + colWidth * i, by + bh + 2); c.stroke(); c.setLineDash([]); }
    const cardY = by + bh + 18, cardH = 14;
    const drawCards = (cols: { tasks: typeof tasks; colIdx: number; color: { bg: string; border: string } }[]) => {
      for (const { tasks: colTasks, colIdx, color } of cols) {
        const colX = bx + colWidth * colIdx + 2, maxCards = Math.min(colTasks.length, 4);
        for (let i = 0; i < maxCards; i++) {
          const task = colTasks[i], cy = cardY + i * (cardH + 2), cardW = colWidth - 6;
          c.fillStyle = color.bg + '40'; c.fillRect(colX, cy, cardW, cardH);
          c.strokeStyle = color.border; c.lineWidth = 1; c.strokeRect(colX, cy, cardW, cardH);
          c.fillStyle = PRIORITY_COLORS[task.priority] || '#888'; c.fillRect(colX + 2, cy + 3, 4, 4);
          c.fillStyle = '#e2e8f0'; c.font = '7px monospace'; c.textAlign = 'left';
          c.fillText(task.title.length > 12 ? task.title.substring(0, 11) + '…' : task.title, colX + 8, cy + 10);
        }
        if (colTasks.length > 4) { c.fillStyle = '#64748b'; c.font = '7px monospace'; c.textAlign = 'left'; c.fillText(`+${colTasks.length - 4} more`, colX, cardY + maxCards * (cardH + 2) + 10); }
      }
    };
    drawCards([{ tasks: todoTasks, colIdx: 0, color: TASK_COLORS.todo }, { tasks: doingTasks, colIdx: 1, color: TASK_COLORS.doing }, { tasks: doneTasks, colIdx: 2, color: TASK_COLORS.done }]);
  }

  // ---- Floor & Wall ----
  private drawFloor(x: number, y: number, ts: number, tx: number, ty: number, _t: number): void {
    const c = this.ctx;
    // Warm office floor — subtle wood tile look
    c.fillStyle = (tx + ty) % 2 === 0 ? '#4e4e72' : '#48486a';
    c.fillRect(x, y, ts, ts);
    // Subtle grain
    c.strokeStyle = 'rgba(255,255,255,0.02)';
    c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const gy = y + 4 + i * (ts / 3);
      c.beginPath(); c.moveTo(x + 2, gy); c.lineTo(x + ts - 2, gy); c.stroke();
    }
    // Edge
    c.strokeStyle = 'rgba(0,0,0,0.1)';
    c.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
  }

  private drawWall(x: number, y: number, ts: number, _tx: number, ty: number): void {
    const c = this.ctx;
    // Dark wall with subtle depth
    const gradient = c.createLinearGradient(x, y, x, y + ts);
    gradient.addColorStop(0, '#3a3a52');
    gradient.addColorStop(1, '#2a2a3e');
    c.fillStyle = gradient;
    c.fillRect(x, y, ts, ts);
    // Top highlight
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(x, y, ts, 2);
    // Bottom shadow
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(x, y + ts - 2, ts, 2);
    // Subtle brick stagger
    c.strokeStyle = 'rgba(255,255,255,0.02)';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x, y + ts / 2);
    c.lineTo(x + ts, y + ts / 2);
    if (ty % 2 === 0) {
      c.moveTo(x + ts / 2, y); c.lineTo(x + ts / 2, y + ts / 2);
    } else {
      c.moveTo(x + ts / 4, y); c.lineTo(x + ts / 4, y + ts / 2);
      c.moveTo(x + ts * 3 / 4, y); c.lineTo(x + ts * 3 / 4, y + ts / 2);
    }
    c.stroke();
  }

  private drawDesk(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a07820'; c.fillRect(x + 2, y + 4, ts - 4, ts - 8);
    c.fillStyle = '#6b5010'; c.fillRect(x + 3, y + ts - 6, 3, 4); c.fillRect(x + ts - 6, y + ts - 6, 3, 4);
    c.fillStyle = '#222'; c.fillRect(x + ts / 2 - 8, y + 4, 7, 6); c.fillRect(x + ts / 2 + 1, y + 4, 7, 6);
    c.fillStyle = '#4488bb'; c.fillRect(x + ts / 2 - 7, y + 5, 5, 4);
    c.fillStyle = '#88bb44'; c.fillRect(x + ts / 2 + 2, y + 5, 5, 4);
    c.fillStyle = 'rgba(68,136,187,0.2)'; c.fillRect(x + ts / 2 - 9, y + 3, 9, 8);
    c.fillStyle = 'rgba(136,187,68,0.2)'; c.fillRect(x + ts / 2, y + 3, 9, 8);
    c.fillStyle = '#444'; c.fillRect(x + ts / 2 - 5, y + ts - 8, 10, 3);
    c.fillStyle = '#555'; c.fillRect(x + ts / 2 + 6, y + ts - 7, 3, 2);
    c.fillStyle = '#f0f0f0'; c.fillRect(x + 3, y + ts - 7, 3, 3);
    c.fillStyle = '#8b4513'; c.fillRect(x + 3, y + ts - 7, 3, 1);
  }

  private drawPlant(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx, sw = Math.sin(t * 2);
    c.fillStyle = '#8b4513'; c.fillRect(x + ts / 2 - 5, y + ts - 10, 10, 8);
    c.fillStyle = '#6b3410'; c.fillRect(x + ts / 2 - 6, y + ts - 10, 12, 2);
    c.fillStyle = '#3a8a2a'; c.fillRect(x + ts / 2 - 2 + sw * 0.5, y + 4, 4, ts - 14);
    c.fillStyle = '#4aaa3a';
    c.fillRect(x + ts / 2 - 7 + sw, y + 6, 5, 4);
    c.fillRect(x + ts / 2 + 2 + sw, y + 10, 5, 4);
    c.fillRect(x + ts / 2 - 5 + sw, y + 14, 4, 3);
    c.fillStyle = '#5abb4a'; c.fillRect(x + ts / 2 + sw, y + 2, 4, 4);
  }

  private drawCouch(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a04040'; c.fillRect(x + 2, y + ts / 2 - 4, ts - 4, ts / 2 - 2);
    c.fillStyle = '#8b3a3a'; c.fillRect(x + 2, y + ts / 2 + 2, ts - 4, 4);
    c.fillStyle = '#b05050';
    c.fillRect(x + 4, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
    c.fillRect(x + ts / 2 + 2, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
  }

  private drawWhiteboard(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#d0d0e0'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#e8e8f0'; c.fillRect(x + 4, y + 4, ts - 8, ts - 8);
    c.fillStyle = '#333';
    c.fillRect(x + 6, y + 8, ts - 14, 2);
    c.fillRect(x + 6, y + 13, ts - 20, 2);
    c.fillRect(x + 6, y + 18, ts - 16, 2);
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

  private drawWindow(x: number, y: number, ts: number, t: number, atm: AtmosphereState): void {
    const c = this.ctx;
    c.fillStyle = '#3a5a7e'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = atm.windowColor; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // Animated clouds (daytime)
    if (atm.timeOfDay === 'day' || atm.timeOfDay === 'afternoon') {
      const co = (t * 1.5) % (ts + 10) - 5;
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(x + 2 + co, y + 5, 6, 3); c.fillRect(x + 4 + co, y + 4, 4, 2);
    }
    // Stars + moon (night)
    if (atm.timeOfDay === 'night') {
      c.fillStyle = '#fff';
      c.fillRect(x + 5, y + 5, 1, 1); c.fillRect(x + 12, y + 7, 1, 1); c.fillRect(x + 9, y + 4, 1, 1);
      c.fillStyle = '#f5f5dc'; c.fillRect(x + ts - 10, y + 5, 4, 4);
    }
    // Window frame cross
    c.fillStyle = '#3a5a7e';
    c.fillRect(x + ts / 2 - 1, y + 1, 2, ts - 2);
    c.fillRect(x + 1, y + ts / 2 - 1, ts - 2, 2);
    // Light beam
    if (atm.ambientBrightness > 0.5) {
      c.fillStyle = `rgba(255,255,200,${0.03 * atm.ambientBrightness})`;
      c.fillRect(x - ts / 4, y + ts, ts * 1.5, ts);
    }
  }

  private drawClock(x: number, y: number, ts: number): void {
    const c = this.ctx, cx = x + ts / 2, cy = y + ts / 2;
    c.fillStyle = '#f0f0f0'; c.beginPath(); c.arc(cx, cy, ts / 2 - 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a2a3e'; c.beginPath(); c.arc(cx, cy, ts / 2 - 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e0e0e0';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2, r = ts / 2 - 7; c.fillRect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2); }
    const now = new Date();
    const hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const mA = (now.getMinutes() + now.getSeconds() / 60) / 60 * Math.PI * 2 - Math.PI / 2;
    c.strokeStyle = '#e0e0e0'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hA) * 6, cy + Math.sin(hA) * 6); c.stroke();
    c.strokeStyle = '#bbb'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(mA) * 8, cy + Math.sin(mA) * 8); c.stroke();
    c.fillStyle = '#e94560'; c.beginPath(); c.arc(cx, cy, 1.5, 0, Math.PI * 2); c.fill();
  }
  private drawPoster(x: number, y: number, ts: number, tx: number, ty: number): void {
    const c = this.ctx; c.fillStyle = '#2a2a3e'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    c.fillStyle = colors[(tx + ty) % colors.length]; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(x + 5, y + 6, ts - 10, 2); c.fillRect(x + 5, y + 10, ts - 14, 2); c.fillRect(x + 5, y + 14, ts - 12, 2);
  }
  private drawCarpet(x: number, y: number, ts: number, tx: number, ty: number): void {
    const c = this.ctx; c.fillStyle = '#3a3a5a'; c.fillRect(x, y, ts, ts);
    c.fillStyle = 'rgba(255,255,255,0.04)'; if ((tx + ty) % 2 === 0) c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1; c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
  }
  private drawLamp(x: number, y: number, ts: number, t: number, atm: AtmosphereState): void {
    const c = this.ctx;
    c.fillStyle = '#555'; c.fillRect(x + ts / 2 - 4, y + 2, 8, 4);
    c.fillStyle = '#fbbf24'; c.fillRect(x + ts / 2 - 6, y + 6, 12, 3);
    c.fillStyle = '#fff8e1'; c.fillRect(x + ts / 2 - 2, y + 4, 4, 3);
    const base = atm.ambientBrightness < 0.5 ? 0.25 : 0.12;
    const glow = base + Math.sin(t * 2) * 0.05;
    c.fillStyle = `rgba(255,220,100,${glow})`; c.fillRect(x - 2, y + 8, ts + 4, ts - 8);
  }
  private drawWaterCooler(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#2980b9'; c.fillRect(x + ts / 2 - 5, y + ts - 12, 10, 10);
    c.fillStyle = '#85c1e9'; c.fillRect(x + ts / 2 - 4, y + 2, 8, ts - 14);
    const waterH = ts / 2 + Math.sin(t) * 2;
    c.fillStyle = 'rgba(52,152,219,0.4)'; c.fillRect(x + ts / 2 - 3, y + ts - 14 - waterH, 6, waterH);
    c.fillStyle = '#bdc3c7'; c.fillRect(x + ts / 2 - 1, y + ts - 14, 2, 3);
    c.fillStyle = '#f0f0f0'; c.fillRect(x + ts - 8, y + ts - 6, 5, 4);
  }
  private drawFridge(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#7f8c8d'; c.fillRect(x + 3, y + 2, ts - 6, ts - 4);
    c.fillStyle = '#95a5a6'; c.fillRect(x + 4, y + 3, ts - 10, ts - 6);
    c.fillStyle = '#bdc3c7'; c.fillRect(x + ts - 10, y + ts / 2, 2, 6);
    c.fillStyle = 'rgba(100,200,255,0.3)'; c.fillRect(x + 5, y + 5, 4, 2);
  }
  private drawTrashCan(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#2c3e50'; c.fillRect(x + ts / 2 - 5, y + ts - 14, 10, 12);
    c.fillStyle = '#34495e'; c.fillRect(x + ts / 2 - 6, y + ts - 14, 12, 2);
    c.fillStyle = '#e74c3c'; c.fillRect(x + ts / 2 - 2, y + ts - 16, 3, 3);
    c.fillStyle = '#f39c12'; c.fillRect(x + ts / 2 + 1, y + ts - 15, 2, 2);
  }
  private drawDoor(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#4a3a2e'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#5a4a3e'; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x + ts - 8, y + ts / 2, 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + 6, y + 6, ts - 14, ts / 2 - 6); c.fillRect(x + 6, y + ts / 2 + 1, ts - 14, ts / 2 - 7);
  }

  // ============================================
  // 新增：会议室长桌
  // ============================================
  private drawMeetingTable(x: number, y: number, ts: number, t: number, tx: number, ty: number): void {
    const c = this.ctx;
    const map = this.tileMap;
    // 深色木纹桌面
    c.fillStyle = '#5c3a1e'; c.fillRect(x + 1, y + 2, ts - 2, ts - 4);
    c.fillStyle = '#6b4423'; c.fillRect(x + 2, y + 3, ts - 4, ts - 6);
    // 桌面纹理 — 木纹线条
    c.strokeStyle = 'rgba(139,90,43,0.3)'; c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(x + 3, y + 6 + i * 6); c.lineTo(x + ts - 3, y + 6 + i * 6); c.stroke();
    }
    // 椅子 — 用瓦片坐标检查四周
    c.fillStyle = '#8b4513';
    const isNeighbor = (dx: number, dy: number): boolean => {
      const nx = tx + dx, ny = ty + dy;
      return ny >= 0 && ny < map.height && nx >= 0 && nx < map.width && map.tiles[ny][nx] === TileType.MeetingTable;
    };
    // 上方椅子
    if (!isNeighbor(0, -1)) c.fillRect(x + ts / 2 - 4, y + 1, 8, 4);
    // 下方椅子
    if (!isNeighbor(0, 1)) c.fillRect(x + ts / 2 - 4, y + ts - 5, 8, 4);
    // 左侧椅子
    if (!isNeighbor(-1, 0)) c.fillRect(x + 1, y + ts / 2 - 4, 4, 8);
    // 右侧椅子
    if (!isNeighbor(1, 0)) c.fillRect(x + ts - 5, y + ts / 2 - 4, 4, 8);
    // 投影仪光效（桌子中央偶尔闪烁）
    if (Math.sin(t * 0.7) > 0.8) {
      c.fillStyle = 'rgba(100,180,255,0.15)';
      c.fillRect(x + ts / 2 - 2, y + ts / 2 - 2, 4, 4);
    }
  }

  // ============================================
  // 新增：微波炉
  // ============================================
  private drawMicrowave(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 机身
    c.fillStyle = '#b0b0b0'; c.fillRect(x + 3, y + 4, ts - 6, ts - 8);
    c.fillStyle = '#c0c0c0'; c.fillRect(x + 4, y + 5, ts - 8, ts - 10);
    // 门
    c.fillStyle = '#333'; c.fillRect(x + 4, y + 6, ts / 2 - 2, ts - 12);
    // 门内食物（随机颜色）
    const foodColors = ['#e74c3c', '#f39c12', '#2ecc71'];
    c.fillStyle = foodColors[Math.floor(t * 0.3) % foodColors.length];
    c.fillRect(x + 6, y + ts / 2, 4, 3);
    // 转盘旋转
    c.fillStyle = 'rgba(255,255,255,0.2)';
    const turnAngle = t * 2;
    c.fillRect(x + 5 + Math.cos(turnAngle) * 1, y + ts / 2, 2, 2);
    // 控制面板
    c.fillStyle = '#222'; c.fillRect(x + ts / 2 + 2, y + 6, ts / 2 - 6, ts - 12);
    // 按钮
    c.fillStyle = '#e74c3c'; c.fillRect(x + ts / 2 + 4, y + 8, 3, 2);
    c.fillStyle = '#3498db'; c.fillRect(x + ts / 2 + 4, y + 12, 3, 2);
    c.fillStyle = '#2ecc71'; c.fillRect(x + ts / 2 + 4, y + 16, 3, 2);
    // 运行中灯光
    if (Math.sin(t * 1.5) > 0) {
      c.fillStyle = 'rgba(255,200,50,0.3)';
      c.fillRect(x + 5, y + 7, ts / 2 - 4, ts - 14);
    }
  }

  // ============================================
  // 新增：零食柜
  // ============================================
  private drawSnackBar(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 柜体
    c.fillStyle = '#6b4423'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#7a5530'; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 隔板
    c.fillStyle = '#5a3a18';
    c.fillRect(x + 3, y + ts / 3, ts - 6, 2);
    c.fillRect(x + 3, y + ts * 2 / 3, ts - 6, 2);
    // 第一层：零食袋
    const snackColors = ['#e74c3c', '#f39c12', '#e67e22'];
    snackColors.forEach((cl, i) => {
      c.fillStyle = cl;
      c.fillRect(x + 5 + i * 6, y + 5, 4, ts / 3 - 4);
      // 零食包装上的小标签
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(x + 6 + i * 6, y + 7, 2, 2);
    });
    // 第二层：杯子/碗
    c.fillStyle = '#3498db'; c.fillRect(x + 5, y + ts / 3 + 4, 4, 4);
    c.fillStyle = '#e74c3c'; c.fillRect(x + 11, y + ts / 3 + 4, 4, 4);
    c.fillStyle = '#2ecc71'; c.fillRect(x + 17, y + ts / 3 + 4, 4, 4);
    // 第三层：饮料瓶
    c.fillStyle = '#f39c12'; c.fillRect(x + 5, y + ts * 2 / 3 + 3, 3, ts / 3 - 6);
    c.fillStyle = '#e74c3c'; c.fillRect(x + 10, y + ts * 2 / 3 + 3, 3, ts / 3 - 6);
    c.fillStyle = '#9b59b6'; c.fillRect(x + 15, y + ts * 2 / 3 + 3, 3, ts / 3 - 6);
    c.fillStyle = '#2ecc71'; c.fillRect(x + 20, y + ts * 2 / 3 + 3, 3, ts / 3 - 6);
    // 柜门把手
    c.fillStyle = '#aaa'; c.fillRect(x + ts - 7, y + ts / 2 - 2, 2, 6);
  }

  // ============================================
  // 电梯
  // ============================================
  private drawElevator(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 电梯门框
    c.fillStyle = '#4a4a5e'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#5a5a6e'; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 电梯门 — 双开
    c.fillStyle = '#7a7a8e';
    c.fillRect(x + 4, y + 4, ts / 2 - 5, ts - 8);
    c.fillRect(x + ts / 2 + 1, y + 4, ts / 2 - 5, ts - 8);
    // 门缝
    c.fillStyle = '#3a3a4e'; c.fillRect(x + ts / 2 - 1, y + 3, 2, ts - 6);
    // 楼层显示屏
    c.fillStyle = '#2a2a3e'; c.fillRect(x + ts / 2 - 5, y + 5, 10, 6);
    c.fillStyle = '#4ade80'; c.font = 'bold 6px monospace'; c.textAlign = 'center';
    const floor = Math.floor(t * 0.2) % 20 + 1;
    c.fillText(`${floor}F`, x + ts / 2, y + 10);
    // 上下按钮
    c.fillStyle = Math.sin(t * 1.5) > 0 ? '#fbbf24' : '#888';
    c.fillRect(x + ts - 10, y + 6, 4, 4);
    c.fillStyle = Math.sin(t * 1.5 + 1) > 0 ? '#fbbf24' : '#888';
    c.fillRect(x + ts - 10, y + 12, 4, 4);
  }

  // ============================================
  // 前台
  // ============================================
  private drawReceptionDesk(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 前台台面
    c.fillStyle = '#8b5a3b'; c.fillRect(x + 2, y + 4, ts - 4, ts - 8);
    c.fillStyle = '#6b3a2a'; c.fillRect(x + 3, y + 5, ts - 6, ts - 10);
    // 前台面板
    c.fillStyle = '#a07050'; c.fillRect(x + 4, y + 6, ts - 8, 3);
    // 电脑
    c.fillStyle = '#333'; c.fillRect(x + ts / 2 - 4, y + 3, 8, 5);
    c.fillStyle = '#5599cc'; c.fillRect(x + ts / 2 - 3, y + 4, 6, 3);
    // 访客登记簿
    c.fillStyle = '#f0f0f0'; c.fillRect(x + ts - 10, y + ts - 8, 6, 4);
    c.fillStyle = '#e94560'; c.fillRect(x + ts - 9, y + ts - 7, 4, 1);
  }

  // ============================================
  // 🚻 卫生间
  // ============================================
  private drawRestroom(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 卫生间门
    c.fillStyle = '#4a7a8a'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#5a8a9a'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    // 男女标识 — 简笔小人
    c.fillStyle = '#fff';
    // 男性小人 (左)
    c.beginPath(); c.arc(x + ts / 3, y + ts / 3 - 2, 3, 0, Math.PI * 2); c.fill();
    c.fillRect(x + ts / 3 - 1, y + ts / 3 + 1, 2, 5);
    c.fillRect(x + ts / 3 - 3, y + ts / 3 + 2, 6, 1);
    c.fillRect(x + ts / 3 - 1, y + ts / 3 + 6, 1, 3);
    c.fillRect(x + ts / 3 + 1, y + ts / 3 + 6, 1, 3);
    // 女性小人 (右)
    c.beginPath(); c.arc(x + ts * 2 / 3, y + ts / 3 - 2, 3, 0, Math.PI * 2); c.fill();
    c.fillRect(x + ts * 2 / 3 - 1, y + ts / 3 + 1, 2, 4);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(x + ts * 2 / 3 - 3, y + ts * 2 / 3 + 2);
    c.lineTo(x + ts * 2 / 3, y + ts / 3 + 5);
    c.lineTo(x + ts * 2 / 3 + 3, y + ts * 2 / 3 + 2); c.fill();
    c.fillRect(x + ts * 2 / 3 - 2, y + ts * 2 / 3 + 2, 1, 3);
    c.fillRect(x + ts * 2 / 3 + 1, y + ts * 2 / 3 + 2, 1, 3);
    // 门框
    c.strokeStyle = '#7ab8c8'; c.lineWidth = 1;
    c.strokeRect(x + 1.5, y + 1.5, ts - 3, ts - 3);
  }

  // ============================================
  // 🪧 导向标识 — 真实的多方向指示牌
  // ============================================
  private drawSignpost(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 标识杆
    c.fillStyle = '#888'; c.fillRect(x + ts / 2 - 1, y + ts / 2, 2, ts / 2 - 2);
    // 底座
    c.fillStyle = '#777'; c.fillRect(x + ts / 2 - 3, y + ts - 5, 6, 3);

    // 多方向指示牌 — 三层叠加，像真实的路牌
    const signs = [
      { label: '→ 会议室', yOff: y + 1, w: ts - 4, bg: '#3b82f6', fg: '#fff', dir: 'right' },
      { label: '← 茶水间', yOff: y + ts / 3 - 1, w: ts - 4, bg: '#22c55e', fg: '#fff', dir: 'left' },
      { label: '↓ 电梯口', yOff: y + ts * 2 / 3 - 3, w: ts - 4, bg: '#f59e0b', fg: '#fff', dir: 'down' },
    ];

    for (const sign of signs) {
      const sh = ts / 3 - 1;
      // 箭头形状 — 根据方向偏移
      c.fillStyle = sign.bg;
      if (sign.dir === 'right') {
        c.fillRect(x + 1, sign.yOff, sign.w - 4, sh);
        c.beginPath();
        c.moveTo(x + sign.w - 3, sign.yOff + sh / 2);
        c.lineTo(x + sign.w + 1, sign.yOff);
        c.lineTo(x + sign.w + 1, sign.yOff + sh);
        c.fill();
      } else if (sign.dir === 'left') {
        c.fillRect(x + 3, sign.yOff, sign.w - 4, sh);
        c.beginPath();
        c.moveTo(x + 3, sign.yOff + sh / 2);
        c.lineTo(x - 1, sign.yOff);
        c.lineTo(x - 1, sign.yOff + sh);
        c.fill();
      } else {
        c.fillRect(x + 1, sign.yOff, sign.w - 2, sh);
      }
      // 文字
      c.fillStyle = sign.fg;
      c.font = `bold ${Math.max(6, sh - 6)}px monospace`;
      c.textAlign = 'center';
      c.fillText(sign.label, x + ts / 2, sign.yOff + sh - 2);
    }

    // 标识杆连接处
    c.fillStyle = '#999';
    c.fillRect(x + ts / 2 - 2, y + 1, 4, ts - 4);
  }

  // ============================================
  // 📦 快递柜
  // ============================================
  private drawPackageLocker(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 柜体
    c.fillStyle = '#d35400'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#e67e22'; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 格子 — 3x2 布局
    const gw = (ts - 10) / 3, gh = (ts - 10) / 2;
    const colors = ['#f39c12', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6', '#1abc9c'];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const gx = x + 5 + col * gw, gy = y + 5 + row * gh;
        c.fillStyle = colors[row * 3 + col];
        c.fillRect(gx, gy, gw - 2, gh - 2);
        // 小锁/指示灯
        c.fillStyle = Math.sin(t * 2 + row * 3 + col) > 0 ? '#2ecc71' : '#555';
        c.fillRect(gx + gw / 2 - 1, gy + gh / 2 - 1, 3, 3);
      }
    }
    // 顶部标识
    c.fillStyle = '#fff'; c.font = 'bold 6px monospace'; c.textAlign = 'center';
    c.fillText('📦 快递柜', x + ts / 2, y + ts - 1);
  }

  // ============================================
  // 🧑‍💻 工位个人物品
  // ============================================

  // ☕ 桌面水杯 — 颜色各异，偶尔冒热气
  private drawDeskCup(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 杯子颜色（用位置哈希模拟不同人的杯子）
    const cupColors = ['#e94560', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
    const colorIdx = ((x * 7 + y * 13) | 0) % cupColors.length;
    c.fillStyle = cupColors[colorIdx];
    // 杯身
    c.fillRect(x + ts / 2 - 5, y + ts / 2 - 2, 10, ts / 2 - 4);
    // 杯口
    c.fillStyle = '#f0f0f0';
    c.fillRect(x + ts / 2 - 6, y + ts / 2 - 4, 12, 3);
    // 杯内液体
    c.fillStyle = '#8b6914';
    c.fillRect(x + ts / 2 - 4, y + ts / 2 - 1, 8, 3);
    // 杯把
    c.fillStyle = cupColors[colorIdx];
    c.fillRect(x + ts / 2 + 5, y + ts / 2, 3, 6);
    c.fillStyle = '#4a4a6a';
    c.fillRect(x + ts / 2 + 6, y + ts / 2 + 1, 2, 4);
    // 偶尔冒热气
    if (Math.sin(t * 1.5 + x) > 0.6) {
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(x + ts / 2 - 1, y + ts / 2 - 8, 2, 4);
      c.fillRect(x + ts / 2 + 2, y + ts / 2 - 6, 1, 3);
    }
  }

  // 🌿 桌面小盆栽 — 打工人最爱的桌面装饰
  private drawDeskPlant(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    const sw = Math.sin(t * 1.5 + x * 0.5) * 1;
    // 花盆
    c.fillStyle = '#8b6914';
    c.fillRect(x + ts / 2 - 5, y + ts / 2 + 2, 10, 6);
    c.fillStyle = '#a07820';
    c.fillRect(x + ts / 2 - 6, y + ts / 2 + 1, 12, 2);
    // 植物主体
    c.fillStyle = '#4aaa3a';
    c.fillRect(x + ts / 2 - 1 + sw * 0.3, y + ts / 4, 3, ts / 2 - 2);
    // 叶子
    c.fillStyle = '#5abb4a';
    c.fillRect(x + ts / 2 - 6 + sw, y + ts / 3, 4, 3);
    c.fillRect(x + ts / 2 + 3 + sw * 0.5, y + ts / 3 + 4, 4, 3);
    c.fillRect(x + ts / 2 - 4 + sw * 0.8, y + ts / 3 + 7, 3, 2);
    // 顶端新芽
    c.fillStyle = '#7acc5a';
    c.fillRect(x + ts / 2 + sw * 0.5, y + ts / 4 - 3, 3, 4);
  }

  // 🖼️ 桌面相框 — 每个人的私人角落
  private drawDeskPhoto(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 相框外框
    c.fillStyle = '#6b4423';
    c.fillRect(x + ts / 2 - 6, y + ts / 3 - 1, 12, ts / 3 + 2);
    // 相框内框
    c.fillStyle = '#d4a83a';
    c.fillRect(x + ts / 2 - 5, y + ts / 3, 10, ts / 3);
    // 照片内容（模拟风景：蓝天 + 绿地）
    c.fillStyle = '#87ceeb';
    c.fillRect(x + ts / 2 - 4, y + ts / 3 + 1, 8, ts / 6 - 1);
    c.fillStyle = '#90ee90';
    c.fillRect(x + ts / 2 - 4, y + ts / 2, 8, ts / 6 - 2);
    // 小太阳
    c.fillStyle = '#ffd700';
    c.fillRect(x + ts / 2 + 1, y + ts / 3 + 2, 2, 2);
    // 相框支架
    c.fillStyle = '#5c3a1e';
    c.fillRect(x + ts / 2 - 2, y + ts * 2 / 3, 4, 2);
  }

  // ============================================
  // ☂️ 雨伞架 — 入口必备，下雨天满满当当
  // ============================================
  private drawUmbrellaStand(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 金属桶身
    c.fillStyle = '#666';
    c.fillRect(x + ts / 2 - 5, y + ts / 3, 10, ts * 2 / 3 - 4);
    c.fillStyle = '#777';
    c.fillRect(x + ts / 2 - 6, y + ts / 3, 12, 3);
    // 桶内阴影
    c.fillStyle = '#444';
    c.fillRect(x + ts / 2 - 4, y + ts / 3 + 3, 8, 4);
    // 雨伞 — 不同颜色，像真实办公室一样各种各样
    const umbrellaColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    const umbrellaPositions = [
      { ox: -4, angle: -0.3 },
      { ox: -1, angle: -0.1 },
      { ox: 2, angle: 0.1 },
      { ox: 5, angle: 0.3 },
    ];
    for (let i = 0; i < umbrellaPositions.length; i++) {
      const pos = umbrellaPositions[i];
      const color = umbrellaColors[(i * 3 + 1) % umbrellaColors.length];
      const sway = Math.sin(t * 0.8 + i) * 0.5;
      // 伞柄
      c.fillStyle = '#555';
      c.fillRect(x + ts / 2 + pos.ox - 0.5, y + ts / 3 - 2, 1, ts / 3 + 2);
      // 伞把（J 形钩）
      c.fillStyle = '#555';
      c.fillRect(x + ts / 2 + pos.ox - 1, y + ts / 3 - 3, 3, 2);
      // 伞面（折叠状）
      c.fillStyle = color;
      c.save();
      c.translate(x + ts / 2 + pos.ox + sway, y + ts / 3 - 2);
      c.rotate(pos.angle + sway * 0.05);
      c.fillRect(-3, -ts / 4, 6, ts / 4);
      // 伞面折痕
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(-1, -ts / 4, 1, ts / 4);
      c.fillRect(2, -ts / 4, 1, ts / 4);
      c.restore();
    }
    // 底部水滴（偶尔出现，像刚下雨回来）
    if (Math.sin(t * 0.3) > 0.3) {
      c.fillStyle = 'rgba(52,152,219,0.5)';
      c.fillRect(x + ts / 2 - 3, y + ts - 4, 2, 2);
      c.fillRect(x + ts / 2 + 2, y + ts - 5, 1, 1);
    }
  }

  // ============================================
  // 📱 打卡机 — 每天最不想面对的东西
  // ============================================
  private drawAttendanceMachine(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 机身（壁挂式）
    c.fillStyle = '#2c3e50';
    c.fillRect(x + ts / 2 - 7, y + 2, 14, ts - 4);
    c.fillStyle = '#34495e';
    c.fillRect(x + ts / 2 - 6, y + 3, 12, ts - 6);
    // 屏幕
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + ts / 2 - 5, y + 5, 10, 8);
    // 屏幕内容 — 交替显示时间和状态
    c.fillStyle = '#3498db';
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    c.fillText(timeStr, x + ts / 2, y + 11);
    // 状态文字 — 闪烁
    c.fillStyle = Math.sin(t * 2) > 0 ? '#2ecc71' : '#1abc9c';
    c.font = '4px monospace';
    c.fillText('打卡', x + ts / 2, y + 16);
    // 刷卡区域
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + ts / 2 - 4, y + ts / 2 + 2, 8, 5);
    // 刷卡感应图标（WiFi 波纹）
    c.strokeStyle = '#3498db';
    c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const r = 2 + i * 2 + Math.sin(t * 3) * 1;
      c.globalAlpha = 0.6 - i * 0.2;
      c.beginPath();
      c.arc(x + ts / 2, y + ts / 2 + 4, r, -Math.PI * 0.8, -Math.PI * 0.2);
      c.stroke();
    }
    c.globalAlpha = 1;
    // LED 指示灯
    c.fillStyle = '#2ecc71';
    c.fillRect(x + ts / 2 + 4, y + 4, 2, 2);
    // 指纹识别区域
    c.fillStyle = '#444';
    c.fillRect(x + ts / 2 - 3, y + ts - 9, 6, 4);
    c.fillStyle = '#555';
    c.beginPath();
    c.ellipse(x + ts / 2, y + ts - 7, 2, 1.5, 0, 0, Math.PI * 2);
    c.fill();
    // 顶部"考勤"标识
    c.fillStyle = '#e94560';
    c.fillRect(x + ts / 2 - 4, y + 1, 8, 2);
  }

  // ============================================
  // Cat Drawing
  // ============================================
  private drawCat(cat: OfficeCat, ts: number, time: number): void {
    const c = this.ctx;
    const px = cat.x * ts + ts / 2, py = cat.y * ts + ts / 2 + cat.bobOffset;
    const s = ts * 0.6;
    // Body
    c.fillStyle = '#f4a460';
    if (cat.state === CatState.Sleeping) {
      // Lying down
      c.fillRect(px - s / 2, py - s / 4, s, s / 2);
      c.fillRect(px - s / 2 + 2, py - s / 4 - 2, s - 4, 3); // head bump
      // Zzz
      c.fillStyle = '#94a3b8'; c.font = '8px monospace'; c.textAlign = 'center';
      const zzOff = Math.sin(time * 2) * 2;
      c.fillText('💤', px + s / 2, py - s / 2 + zzOff);
    } else {
      // Standing
      c.fillRect(px - s / 3, py - s / 3, s * 2 / 3, s * 2 / 3);
      // Head
      c.fillRect(px - s / 3 - 2, py - s / 2 - 2, s / 2, s / 3);
      // Ears
      c.fillStyle = '#e8963a';
      c.fillRect(px - s / 3, py - s / 2 - 5, 3, 4);
      c.fillRect(px + s / 6, py - s / 2 - 5, 3, 4);
      // Eyes
      c.fillStyle = '#333';
      if (cat.state === CatState.BeingPet) {
        // Happy closed eyes
        c.fillRect(px - s / 5, py - s / 3, 2, 1);
        c.fillRect(px + s / 8, py - s / 3, 2, 1);
      } else {
        c.fillRect(px - s / 5, py - s / 3, 2, 2);
        c.fillRect(px + s / 8, py - s / 3, 2, 2);
      }
      // Tail
      c.fillStyle = '#f4a460';
      const tailWag = Math.sin(time * 4) * 3;
      if (cat.facing === 'right') {
        c.fillRect(px - s / 3 - 3 + tailWag, py - s / 6, 3, s / 4);
      } else {
        c.fillRect(px + s / 3 + tailWag, py - s / 6, 3, s / 4);
      }
      // Legs
      c.fillRect(px - s / 3, py + s / 6, 3, s / 4);
      c.fillRect(px + s / 6, py + s / 6, 3, s / 4);
    }
    // Name/speech
    if (cat.speechBubble) {
      c.font = '8px monospace'; c.textAlign = 'center';
      const tw = c.measureText(cat.speechBubble).width + 8;
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(px - tw / 2, py - s - 12, tw, 14, 3); c.fill();
      c.fillStyle = '#333'; c.fillText(cat.speechBubble, px, py - s - 2);
    }
  }

  // ============================================
  // 👔 Boss Drawing (领导巡查)
  // ============================================
  private drawBoss(boss: Boss, ts: number, time: number): void {
    const c = this.ctx;
    const px = boss.x * ts + ts / 2, py = boss.y * ts + ts / 2 + boss.bobOffset;
    const s = ts * 0.7;

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(px, py + s * 0.5, s * 0.4, s * 0.12, 0, 0, Math.PI * 2);
    c.fill();

    // Legs (walking animation)
    const walkOff = boss.state === BossState.Walking || boss.state === BossState.Leaving || boss.state === BossState.Patrolling
      ? Math.sin(time * 6) * 2 : 0;
    c.fillStyle = '#2c2c2c';
    c.fillRect(px - s * 0.15, py + s * 0.15, s * 0.12, s * 0.3 + walkOff);
    c.fillRect(px + s * 0.05, py + s * 0.15, s * 0.12, s * 0.3 - walkOff);
    // Shoes
    c.fillStyle = '#1a1a1a';
    c.fillRect(px - s * 0.18, py + s * 0.4 + walkOff, s * 0.18, s * 0.06);
    c.fillRect(px + s * 0.02, py + s * 0.4 - walkOff, s * 0.18, s * 0.06);

    // Body (suit)
    c.fillStyle = '#1a1a2e';
    c.fillRect(px - s * 0.25, py - s * 0.15, s * 0.5, s * 0.35);
    // Tie
    c.fillStyle = '#e94560';
    c.fillRect(px - s * 0.03, py - s * 0.12, s * 0.06, s * 0.25);
    // Shirt collar
    c.fillStyle = '#e0e0e0';
    c.fillRect(px - s * 0.1, py - s * 0.18, s * 0.2, s * 0.06);
    // Arms
    c.fillStyle = '#1a1a2e';
    const armSwing = boss.state !== BossState.Hidden ? Math.sin(time * 3) * 1.5 : 0;
    c.fillRect(px - s * 0.35, py - s * 0.1 + armSwing, s * 0.12, s * 0.25);
    c.fillRect(px + s * 0.23, py - s * 0.1 - armSwing, s * 0.12, s * 0.25);
    // Hands
    c.fillStyle = '#e8c39e';
    c.fillRect(px - s * 0.33, py + s * 0.12 + armSwing, s * 0.08, s * 0.08);
    c.fillRect(px + s * 0.25, py + s * 0.12 - armSwing, s * 0.08, s * 0.08);

    // Briefcase
    c.fillStyle = '#5c3a1e';
    c.fillRect(px + s * 0.2, py + s * 0.05 - armSwing, s * 0.15, s * 0.1);
    c.fillStyle = '#fbbf24';
    c.fillRect(px + s * 0.26, py + s * 0.03 - armSwing, s * 0.04, s * 0.04);

    // Head
    c.fillStyle = '#e8c39e';
    c.fillRect(px - s * 0.18, py - s * 0.45, s * 0.36, s * 0.32);
    // Hair (slicked back)
    c.fillStyle = '#2c2c2c';
    c.fillRect(px - s * 0.2, py - s * 0.5, s * 0.4, s * 0.12);
    c.fillRect(px - s * 0.18, py - s * 0.48, s * 0.06, s * 0.08);
    c.fillRect(px + s * 0.12, py - s * 0.48, s * 0.06, s * 0.08);
    // Eyes (stern look)
    c.fillStyle = '#1a1a2e';
    c.fillRect(px - s * 0.1, py - s * 0.35, s * 0.06, s * 0.06);
    c.fillRect(px + s * 0.04, py - s * 0.35, s * 0.06, s * 0.06);
    // Eyebrows (stern)
    c.fillStyle = '#2c2c2c';
    c.fillRect(px - s * 0.12, py - s * 0.39, s * 0.08, s * 0.03);
    c.fillRect(px + s * 0.04, py - s * 0.39, s * 0.08, s * 0.03);
    // Mouth (serious)
    c.fillStyle = '#8b4513';
    c.fillRect(px - s * 0.06, py - s * 0.2, s * 0.12, s * 0.03);

    // Name tag
    c.fillStyle = '#fff';
    c.font = 'bold 7px monospace';
    c.textAlign = 'center';
    c.fillText('👔 老板', px, py - s * 0.55);

    // Speech bubble
    if (boss.speechBubble) {
      c.font = '9px monospace';
      const tw = c.measureText(boss.speechBubble).width + 14;
      const th = 18;
      c.fillStyle = '#fff';
      c.beginPath();
      c.roundRect(px - tw / 2, py - s - 20, tw, th, 4);
      c.fill();
      c.beginPath();
      c.moveTo(px - 4, py - s - 2);
      c.lineTo(px, py - s + 4);
      c.lineTo(px + 4, py - s - 2);
      c.fill();
      c.fillStyle = '#333';
      c.textAlign = 'center';
      c.fillText(boss.speechBubble, px, py - s - 8);
    }
  }

  // ============================================
  // Agent Drawing
  // ============================================
  private drawAgent(a: Agent, ts: number, time: number): void {
    const ctx = this.ctx;
    const px = a.x * ts + ts / 2, py = a.y * ts + ts / 2 + a.bobOffset;
    SpriteRenderer.drawAgent(ctx, px, py, a.config.role, a.state, a.animFrame, a.facing, time);
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.config.name, px, py + ts / 2 + 10);
    const emoji: Record<string, string> = { idle: '😴', walking: '🚶', typing: '⌨️', reading: '📖', waiting: '⏳', error: '❌', fetching_task: '📋', '摸鱼中': '🐟' };
    ctx.font = '10px sans-serif';
    ctx.fillText(emoji[a.state] || '', px, py - ts / 2 - 8);
    if (a.currentTask) {
      const te = a.taskWorkflow === 'working_on_task' ? '💻' : a.taskWorkflow === 'walking_to_complete' ? '✅' : '📋';
      ctx.font = '8px monospace'; ctx.fillStyle = '#a5b4fc'; ctx.textAlign = 'center';
      ctx.fillText(`${te} ${a.currentTask.title}`, px, py - ts / 2 - 20);
    }
    if (a.speechBubble) this.drawSpeechBubble(px, py - ts / 2 - 12, a.speechBubble);
  }

  private drawSpeechBubble(x: number, y: number, text: string): void {
    const ctx = this.ctx; ctx.font = '10px monospace';
    const tw = ctx.measureText(text).width + 12, th = 18;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - th, tw, th, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x + 4, y); ctx.fill();
    ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 6);
  }

  // ============================================
  // Particle Effects
  // ============================================
  private emitAmbientParticles(ts: number, time: number, atm: AtmosphereState): void {
    // Coffee steam
    if (Math.random() < 0.08) {
      this.particles.emit({ x: 7 * ts + ts / 2, y: 5 * ts + ts / 4, count: 1, type: 'steam', color: '#ffffff', speed: 0.4, size: 3, life: 2, direction: 'up' });
    }
    // Sunbeam particles (daytime clear)
    if (atm.weather === 'clear' && atm.ambientBrightness > 0.7 && Math.random() < 0.05) {
      this.particles.emit({ x: Math.random() * ts * 12, y: ts, count: 1, type: 'float', color: '#fbbf24', speed: 0.2, size: 1.5, life: 3, direction: 'down' });
    }
  }

  private emitStateParticles(agent: Agent, ts: number, _time: number): void {
    const px = agent.x * ts + ts / 2, py = agent.y * ts + ts / 2;
    switch (agent.state) {
      case AgentState.Typing:
        if (Math.random() < 0.3) this.particles.emit({ x: px, y: py + ts / 4, count: 1, type: 'code', colors: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'], speed: 0.5, life: 1.5, direction: 'up' });
        if (Math.random() < 0.2) this.particles.emit({ x: px, y: py + ts / 3, count: 2, type: 'spark', color: ROLE_COLORS[agent.config.role].accent, speed: 0.8, size: 1.5, life: 0.6, spread: Math.PI * 0.5, direction: 'up' });
        break;
      case AgentState.Walking:
        if (agent.animFrame % 2 === 0 && Math.random() < 0.3) this.particles.emit({ x: px, y: py + ts / 2, count: 1, type: 'float', color: '#94a3b8', speed: 0.3, size: 2, life: 0.8, direction: 'up' });
        break;
      case AgentState.Error:
        if (Math.random() < 0.15) this.particles.emit({ x: px, y: py, count: 3, type: 'burst', color: '#ef4444', speed: 1.5, size: 2, life: 0.8 });
        break;
      case AgentState.FetchingTask:
        if (Math.random() < 0.2) this.particles.emit({ x: px, y: py - ts / 2, count: 2, type: 'burst', colors: ['#fbbf24', '#fde68a', '#f59e0b'], speed: 1, size: 2, life: 1 });
        break;
    }
  }

  // ============================================
  // Weather
  // ============================================
  private drawWeather(ts: number, _time: number, atm: AtmosphereState): void {
    const c = this.ctx;
    if (atm.weather === 'rain') {
      c.strokeStyle = 'rgba(174,194,224,0.4)'; c.lineWidth = 1;
      for (const d of this.rainDrops) {
        c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - 1, d.y + d.length); c.stroke();
        d.y += d.speed; d.x -= 0.5;
        if (d.y > ts * this.tileMap.height) { d.y = -d.length; d.x = Math.random() * ts * this.tileMap.width; }
      }
    } else if (atm.weather === 'snow') {
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (const f of this.snowFlakes) {
        c.beginPath(); c.arc(f.x, f.y, f.size, 0, Math.PI * 2); c.fill();
        f.y += f.speed; f.x += f.drift + Math.sin(f.y * 0.01) * 0.3;
        if (f.y > ts * this.tileMap.height) { f.y = -f.size; f.x = Math.random() * ts * this.tileMap.width; }
      }
    }
  }

  // ============================================
  // Lighting Overlay
  // ============================================
  private drawLighting(time: number, atm: AtmosphereState): void {
    const ctx = this.ctx, ts = this.tileSize;
    // Night overlay
    if (atm.overlayAlpha > 0) {
      ctx.fillStyle = atm.overlayColor;
      ctx.globalAlpha = atm.overlayAlpha;
      ctx.fillRect(0, 0, this.tileMap.width * ts, this.tileMap.height * ts);
      ctx.globalAlpha = 1;
    }
    // Lamp glows (stronger at night)
    const lampIntensity = atm.ambientBrightness < 0.5 ? 0.12 : 0.04;
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const t = this.tileMap.tiles[y][x];
        if (t === TileType.Lamp) {
          const cx = x * ts + ts / 2, cy = y * ts + ts, r = ts * 3;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(255,220,100,${lampIntensity + Math.sin(time * 2 + x) * 0.02})`);
          g.addColorStop(1, 'rgba(255,220,100,0)');
          ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
      }
    }
  }

  // ============================================
  // Disco Mode
  // ============================================
  private drawDisco(time: number): void {
    const c = this.ctx, w = this.tileMap.width * this.tileSize, h = this.tileMap.height * this.tileSize;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#88ff00'];
    // Flashing background tint
    const ci = Math.floor(time * 4) % colors.length;
    c.fillStyle = colors[ci] + '15';
    c.fillRect(0, 0, w, h);
    // Disco ball (center top)
    const bx = w / 2, by = this.tileSize * 0.8;
    c.fillStyle = '#ccc';
    c.beginPath(); c.arc(bx, by, 8, 0, Math.PI * 2); c.fill();
    // Rotating light beams
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 2;
      c.strokeStyle = colors[(ci + i) % colors.length] + '30';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(bx, by);
      c.lineTo(bx + Math.cos(angle) * w, by + Math.sin(angle) * h); c.stroke();
    }
  }

  // ============================================
  // Confetti
  // ============================================
  private updateAndDrawConfetti(): void {
    const c = this.ctx;
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const p = this.confetti[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rotation += p.rotSpeed;
      p.life -= 0.01;
      if (p.life <= 0) { this.confetti.splice(i, 1); continue; }
      c.save(); c.globalAlpha = p.life; c.translate(p.x, p.y); c.rotate(p.rotation);
      c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      c.restore();
    }
  }

  // ============================================
  // Event Banner
  // ============================================
  private drawEventBanner(time: number): void {
    if (this.activeEvents.length === 0) return;
    const c = this.ctx;
    const evt = this.activeEvents[this.activeEvents.length - 1];
    const flash = Math.sin(evt.flashTimer * 8) * 0.15 + 0.85;
    const bw = this.tileMap.width * this.tileSize;
    // Banner background
    c.fillStyle = evt.color + 'cc';
    c.fillRect(0, 0, bw, 28);
    // Flashing border
    c.strokeStyle = `rgba(255,255,255,${flash * 0.5})`;
    c.lineWidth = 2;
    c.strokeRect(0, 0, bw, 28);
    // Text
    c.fillStyle = '#fff'; c.font = 'bold 12px monospace'; c.textAlign = 'center';
    c.fillText(evt.message, bw / 2, 19);
  }
}