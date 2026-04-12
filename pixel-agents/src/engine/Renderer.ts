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
interface ProjectorBeam { x: number; y: number; targetX: number; targetY: number; active: boolean; timer: number; }
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
  private deliveryPerson: { x: number; y: number; timer: number; bags: number } | null = null;
  private umbrellasRemaining: number = 6; // ☂️ 雨伞架剩余伞数
  private dayNight: DayNightCycle;
  tileSize: number = 32;
  private activeEvents: OfficeEvent[] = [];
  private discoMode: boolean = false;
  private confetti: ConfettiParticle[] = [];
  private rainDrops: RainDrop[] = [];
  private snowFlakes: SnowFlake[] = [];
  private meetingRoomActive: boolean = false;
  private meetingAgentCount: number = 0;
  private meetingStartTime: number = 0; // ⏱️ 会议开始时间（秒），用于计时
  private activityLevel: number = 0.5; // 📊 办公室活跃度 0-1
  private activeAgentCount: number = 0;
  // ☕ 咖啡机排队可视化
  private coffeeMachineBusy = false;
  private coffeeQueueLength = 0;
  // 🍱 微波炉排队可视化
  private microwaveBusy = false;
  private microwaveQueueLength = 0;
  private typingDesks: Set<string> = new Set(); // 💻 正在打字的工位 "x,y"
  private idleDesks: Set<string> = new Set(); // 🖥️ 无人使用的工位 — 显示器关闭/待机状态
  private weekendOvertimeDesks: Set<string> = new Set(); // 🌙 周末加班工位 — 非加班工位显示器关闭，办公室灯光调暗
  // 🛗 电梯状态可视化
  private elevatorDoorOpen = false; // 电梯门是否打开
  private elevatorOverload = false; // 电梯是否超载报警
  private elevatorOverloadAgent: string | null = null; // 被挤出电梯的人

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
  setDeliveryPerson(dp: { x: number; y: number; timer: number; bags: number } | null): void { this.deliveryPerson = dp; }
  setUmbrellasRemaining(n: number): void { this.umbrellasRemaining = Math.max(0, n); }
  setHoverTile(x: number, y: number): void { this.hoverTile = { x, y }; }
  getSoundSystem(): SoundSystem { return this.sounds; }
  getDayNight(): DayNightCycle { return this.dayNight; }
  setMeetingRoomActive(active: boolean, agentCount: number): void {
    this.meetingRoomActive = active;
    this.meetingAgentCount = agentCount;
    // ⏱️ 会议开始时记录时间，用于白板计时器
    if (active && agentCount >= 2 && this.meetingStartTime === 0) {
      this.meetingStartTime = performance.now() / 1000;
    }
    if (!active) {
      this.meetingStartTime = 0;
    }
  }
  setActivityLevel(level: number, count: number): void { this.activityLevel = Math.max(0, Math.min(1, level)); this.activeAgentCount = count; }
  setTypingDesks(desks: Set<string>): void { this.typingDesks = desks; }
  setIdleDesks(desks: Set<string>): void { this.idleDesks = desks; }
  setWeekendOvertimeDesks(desks: Set<string>): void { this.weekendOvertimeDesks = desks; }
  // ☕ 咖啡机排队状态
  setCoffeeQueueState(busy: boolean, queueLen: number): void { this.coffeeMachineBusy = busy; this.coffeeQueueLength = queueLen; }
  setMicrowaveQueueState(busy: boolean, queueLen: number): void { this.microwaveBusy = busy; this.microwaveQueueLength = queueLen; }
  // 🛗 电梯状态
  setElevatorState(doorOpen: boolean, overload: boolean, overloadAgent: string | null): void {
    this.elevatorDoorOpen = doorOpen;
    this.elevatorOverload = overload;
    this.elevatorOverloadAgent = overloadAgent;
  }

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
          this.drawWall(px, py, ts, x, y, time);
        } else if (type === TileType.Floor) {
          this.drawFloor(px, py, ts, x, y, time);
        }
        if (type === TileType.Desk) this.drawDesk(px, py, ts, x, y);
        else if (type === TileType.Plant) this.drawPlant(px, py, ts, time);
        else if (type === TileType.Couch) this.drawCouch(px, py, ts);
        else if (type === TileType.Whiteboard) this.drawWhiteboard(px, py, ts, time);
        else if (type === TileType.Bookshelf) this.drawBookshelf(px, py, ts);
        else if (type === TileType.Printer) this.drawPrinter(px, py, ts, time);
        else if (type === TileType.PrinterJam) this.drawPrinterJam(px, py, ts, time);
        else if (type === TileType.Window) this.drawWindow(px, py, ts, time, atm);
        else if (type === TileType.Clock) this.drawClock(px, py, ts, time);
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
        else if (type === TileType.BulletinBoard) this.drawBulletinBoard(px, py, ts, time);
        else if (type === TileType.VendingMachine) this.drawVendingMachine(px, py, ts, time);
      else if (type === TileType.PhoneBooth) this.drawPhoneBooth(px, py, ts, time);
        else if (type === TileType.ServerRack) this.drawServerRack(px, py, ts, time, x, y);
        else if (type === TileType.ServerRoomGlass) this.drawServerRoomGlass(px, py, ts, time, x, y);
        else if (type === TileType.ZoneLabel) this.drawZoneLabel(px, py, ts, time, x, y);
        else if (type === TileType.AbsentSign) this.drawAbsentSign(px, py, ts, time);
        else if (type === TileType.LunchTable) this.drawLunchTable(px, py, ts, time, x, y);
        else if (type === TileType.WindowPlant) this.drawWindowPlant(px, py, ts, time);
        else if (type === TileType.PingPong) this.drawPingPong(px, py, ts, time);
        else if (type === TileType.BirthdayCake) this.drawBirthdayCake(px, py, ts, time);
        else if (type === TileType.WelcomeMat) this.drawWelcomeMat(px, py, ts, time);
        else if (type === TileType.GameConsole) this.drawGameConsole(px, py, ts, time, x, y);
        else if (type === TileType.MeetingGlass) this.drawMeetingGlass(px, py, ts, time, x, y);
        else if (type === TileType.MeetingDoor) this.drawMeetingDoor(px, py, ts, time, x, y);
        else if (type === TileType.MeetingWhiteboard) this.drawMeetingWhiteboard(px, py, ts, time);
        else if (type === TileType.BarStool) this.drawBarStool(px, py, ts, time);
        else if (type === TileType.VisitorSofa) this.drawVisitorSofa(px, py, ts, time);
        else if (type === TileType.CompanyLogo) this.drawCompanyLogo(px, py, ts, time);
        else if (type === TileType.MagazineRack) this.drawMagazineRack(px, py, ts, time);
        else if (type === TileType.AirConditioner) this.drawAirConditioner(px, py, ts, time);
        else if (type === TileType.CeilingLight) this.drawCeilingLight(px, py, ts, time, atm, x, y);
        else if (type === TileType.FireExtinguisher) this.drawFireExtinguisher(px, py, ts, time);
        else if (type === TileType.FloorArrow) this.drawFloorArrow(px, py, ts, time, x, y);
        else if (type === TileType.WallTV) this.drawWallTV(px, py, ts, time);
        else if (type === TileType.KPIBoard) this.drawKPIBoard(px, py, ts, time, x, y);
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

    // 📽️ 会议室投影仪光束
    this.drawProjectorBeam(ts, time);

    // Office cat
    if (this.officeCat) this.drawCat(this.officeCat, ts, time);

    // 🛵 外卖员 — 前台等外卖来拿
    if (this.deliveryPerson) this.drawDeliveryPerson(this.deliveryPerson, ts, time);

    // ☕ 咖啡机排队指示器 — 有人在排队时显示排队人数
    if (this.coffeeMachineBusy || this.coffeeQueueLength > 0) {
      this.drawCoffeeQueueIndicator(ts, time);
    }

    // 🍱 微波炉排队指示器 — 午休时间热饭排队时显示
    if (this.microwaveBusy || this.microwaveQueueLength > 0) {
      this.drawMicrowaveQueueIndicator(ts, time);
    }

    // Kanban overlay
    if (this.kanbanBoard) this.drawKanbanOverlay(ts, time);

    // Ambient particles
    this.emitAmbientParticles(ts, time, atm);

    // Agents (sorted by Y for depth) — skip agents who've left
    [...agents].filter(a => !a.hasLeftOffice && !a.isAbsent).sort((a, b) => a.y - b.y).forEach(a => {
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
    // 🏗️ 区域检测 — 根据位置判断地面材质
    const isLeftRoom = tx < 10;
    const isRightRoom = tx >= 11;
    const isCorridor = tx >= 8 && tx <= 10 && ty >= 7;
    // 茶水间区域（右下方，y>=7 的右房间）— 瓷砖地面
    const isTeaRoom = tx >= 11 && ty >= 7;
    // 卫生间区域 — 蓝色瓷砖
    const isRestroomArea = tx >= 17 && ty >= 8;
    // 入口区域（y=10）— 大理石地面
    const isEntrance = ty >= 10;

    let base1: string, base2: string, edgeColor: string;
    if (isRestroomArea) {
      // 🚻 卫生间 — 浅蓝防滑瓷砖
      base1 = '#a8c8d8'; base2 = '#98b8c8'; edgeColor = 'rgba(120,170,200,0.3)';
    } else if (isTeaRoom) {
      // ☕ 茶水间 — 米白瓷砖（易清洁）
      base1 = '#d8c8a8'; base2 = '#ccb898'; edgeColor = 'rgba(160,140,110,0.25)';
    } else if (isEntrance) {
      // 🚪 入口 — 灰色大理石
      base1 = '#7a7a8a'; base2 = '#6e6e7e'; edgeColor = 'rgba(100,100,120,0.2)';
    } else if (isLeftRoom) {
      // 🪵 左房间办公区 — 暖色木地板
      base1 = '#c8b090'; base2 = '#bca484'; edgeColor = 'rgba(140,120,90,0.15)';
    } else if (isRightRoom) {
      // 🪵 右房间办公区 — 深色木地板
      base1 = '#8a7058'; base2 = '#7e664e'; edgeColor = 'rgba(90,70,50,0.15)';
    } else if (isCorridor) {
      // 🟫 走廊 — 深色地毯
      base1 = '#5a5068'; base2 = '#524860'; edgeColor = 'rgba(70,60,80,0.15)';
    } else {
      base1 = '#4e4e72'; base2 = '#48486a'; edgeColor = 'rgba(0,0,0,0.1)';
    }

    // 基础色块
    c.fillStyle = (tx + ty) % 2 === 0 ? base1 : base2;
    c.fillRect(x, y, ts, ts);

    // 🏗️ 根据材质绘制不同纹理
    if (isTeaRoom || isRestroomArea) {
      // ☕🚻 瓷砖地面 — 方格瓷砖 + 勾缝线
      // 每块瓷砖内部的浅色渐变
      const tileGrad = c.createLinearGradient(x, y, x + ts, y + ts);
      tileGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
      tileGrad.addColorStop(1, 'rgba(0,0,0,0.03)');
      c.fillStyle = tileGrad;
      c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
      // 勾缝线 — 明显的十字缝
      c.strokeStyle = edgeColor;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + ts / 2, y + 1); c.lineTo(x + ts / 2, y + ts - 1);
      c.moveTo(x + 1, y + ts / 2); c.lineTo(x + ts - 1, y + ts / 2);
      c.stroke();
      // 瓷砖表面的细微反光点
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(x + ts * 0.2, y + ts * 0.15, 3, 2);
      c.fillRect(x + ts * 0.6, y + ts * 0.4, 2, 2);
    } else if (isRestroomArea) {
      // 🚻 卫生间防滑瓷砖 — 额外加点防滑纹
      c.strokeStyle = 'rgba(80,120,150,0.15)';
      c.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        const ly = y + 4 + i * 5;
        c.beginPath();
        c.moveTo(x + 3, ly); c.lineTo(x + ts - 3, ly);
        c.stroke();
      }
    } else if (isLeftRoom || isRightRoom) {
      // 🪵 木地板 — 长条木板纹理，模拟真实木地板拼接
      c.strokeStyle = 'rgba(0,0,0,0.06)';
      c.lineWidth = 0.5;
      // 纵向木纹线
      const plankCount = 3;
      for (let i = 1; i < plankCount; i++) {
        const px2 = x + (ts / plankCount) * i;
        c.beginPath(); c.moveTo(px2, y); c.lineTo(px2, y + ts); c.stroke();
      }
      // 横向拼接缝 — 错开排列，模拟真实木地板
      if (ty % 2 === 0) {
        c.beginPath();
        c.moveTo(x + ts * 0.3, y); c.lineTo(x + ts * 0.3, y + ts);
        c.moveTo(x + ts * 0.7, y); c.lineTo(x + ts * 0.7, y + ts);
      } else {
        c.beginPath();
        c.moveTo(x + ts * 0.5, y); c.lineTo(x + ts * 0.5, y + ts);
      }
      c.strokeStyle = 'rgba(0,0,0,0.04)';
      c.stroke();
      // 木纹 — 细微波浪线
      c.strokeStyle = 'rgba(0,0,0,0.03)';
      c.lineWidth = 0.5;
      for (let i = 0; i < plankCount; i++) {
        const startX = x + (ts / plankCount) * i + 2;
        const plankW = ts / plankCount - 4;
        for (let j = 0; j < 2; j++) {
          const wy = y + 4 + j * (ts / 3);
          c.beginPath();
          c.moveTo(startX, wy);
          c.quadraticCurveTo(startX + plankW * 0.5, wy + 1, startX + plankW, wy);
          c.stroke();
        }
      }
    } else if (isEntrance) {
      // 🚪 大理石地面 —  subtle 石纹
      c.strokeStyle = 'rgba(255,255,255,0.04)';
      c.lineWidth = 0.5;
      // 大理石纹理 — 不规则曲线
      for (let i = 0; i < 3; i++) {
        const sy = y + 4 + i * (ts / 3);
        c.beginPath();
        c.moveTo(x + 2, sy);
        c.quadraticCurveTo(x + ts * 0.3, sy - 2, x + ts * 0.5, sy + 1);
        c.quadraticCurveTo(x + ts * 0.7, sy + 3, x + ts - 2, sy);
        c.stroke();
      }
    } else if (isCorridor) {
      // 🟫 地毯 — 细微纤维纹理
      c.fillStyle = 'rgba(255,255,255,0.02)';
      for (let i = 0; i < 6; i++) {
        const fx = x + 3 + ((i * 7 + tx * 3) % (ts - 6));
        const fy = y + 3 + ((i * 11 + ty * 5) % (ts - 6));
        c.fillRect(fx, fy, 1, 2);
      }
    }

    // 🪩 瓷砖地板反射 — 茶水间/卫生间的亮面瓷砖在灯下有反光效果
    if (isTeaRoom || isRestroomArea) {
      const lampPositions = [
        { lx: 14, ly: 1 }, { lx: 14, ly: 4 }, // 右房间灯
        { lx: 4, ly: 1 }, { lx: 4, ly: 4 },   // 左房间灯
      ];
      for (const lamp of lampPositions) {
        const dx = tx - lamp.lx;
        const dy = ty - lamp.ly;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6 && dist > 0) {
          // 灯光在瓷砖上的反射 — 越近越亮，模拟光滑瓷砖表面
          const reflectionStrength = Math.max(0, 0.18 - dist * 0.03);
          const shimmer = Math.sin(_t * 1.5 + tx * 2 + ty * 3) * 0.02;
          const alpha = Math.max(0, reflectionStrength + shimmer);
          if (alpha > 0.01) {
            // 反射光斑 — 椭圆形高光，模拟灯光在光滑瓷砖上的漫反射
            const grad = c.createRadialGradient(
              x + ts / 2, y + ts / 2, 0,
              x + ts / 2, y + ts / 2, ts * 0.6
            );
            grad.addColorStop(0, `rgba(255,240,200,${alpha})`);
            grad.addColorStop(0.5, `rgba(255,240,200,${alpha * 0.4})`);
            grad.addColorStop(1, 'rgba(255,240,200,0)');
            c.fillStyle = grad;
            c.fillRect(x, y, ts, ts);
          }
        }
      }
    }

    // 通用：tile 边框
    c.strokeStyle = edgeColor;
    c.lineWidth = 0.5;
    c.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
  }

  private drawWall(x: number, y: number, ts: number, tx: number, ty: number, t: number): void {
    const c = this.ctx;
    // 墙体 — 深色砖墙 (参考 pablodelucca/pixel-agents 风格)
    c.fillStyle = '#3a3a52';
    c.fillRect(x, y, ts, ts);
    // Top highlight (天花板/踢脚线边缘)
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x, y, ts, 2);
    // Bottom shadow
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(x, y + ts - 2, ts, 2);
    // 砖纹 — 交错排列 (参考项目的砖块拼接效果)
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    c.lineWidth = 0.5;
    c.beginPath();
    // 水平中线
    c.moveTo(x, y + ts / 2);
    c.lineTo(x + ts, y + ts / 2);
    if (ty % 2 === 0) {
      c.moveTo(x + ts / 2, y); c.lineTo(x + ts / 2, y + ts / 2);
    } else {
      c.moveTo(x + ts / 4, y); c.lineTo(x + ts / 4, y + ts / 2);
      c.moveTo(x + ts * 3 / 4, y); c.lineTo(x + ts * 3 / 4, y + ts / 2);
    }
    if (ty % 2 === 0) {
      c.moveTo(x + ts / 4, y + ts / 2); c.lineTo(x + ts / 4, y + ts);
      c.moveTo(x + ts * 3 / 4, y + ts / 2); c.lineTo(x + ts * 3 / 4, y + ts);
    } else {
      c.moveTo(x + ts / 2, y + ts / 2); c.lineTo(x + ts / 2, y + ts);
    }
    c.stroke();
    // 表面纹理
    c.fillStyle = 'rgba(255,255,255,0.02)';
    c.fillRect(x + 3, y + 3, ts - 6, 1);

    // 🧯 消防栓 — 每隔一段距离出现一个
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 0 && tx % 6 === 3) {
      this.drawFireExtinguisher(x, y, ts);
    }
    // 🚪 紧急出口标识 — 在墙的特定位置
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 0 && tx % 8 === 5) {
      this.drawExitSign(x, y, ts);
    }
    // 📢 励志标语 — 偶尔出现在墙壁上
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 0 && tx % 10 === 7) {
      this.drawMotivationPoster(x, y, ts);
    }
    // 🏆 公司荣誉墙 — 顶部墙壁上的公司照片/奖杯
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 0 && tx === 2) {
      this.drawCorporatePhoto(x, y, ts, t);
    }
    // 🏅 团队成就奖 — 走廊隔墙上的团队奖项展示
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 7 && (tx === 8 || tx === 9)) {
      this.drawTeamAward(x, y, ts, t, tx);
    }
    // 📜 公司发展历程 — 底部走廊墙上的公司时间线
    if (tx > 0 && tx < this.tileMap.width - 1 && ty === 10 && tx === 12) {
      this.drawCompanyTimeline(x, y, ts, t);
    }
  }

  // 🧯 消防栓
  private drawFireExtinguisher(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 红色箱体
    c.fillStyle = '#c0392b';
    c.fillRect(x + ts / 2 - 5, y + 4, 10, ts - 6);
    c.fillStyle = '#e74c3c';
    c.fillRect(x + ts / 2 - 4, y + 5, 8, ts - 8);
    // 灭火器图标
    c.fillStyle = '#fff';
    c.font = `${Math.max(8, ts - 16)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('🧯', x + ts / 2, y + ts / 2 + 3);
  }

  // 🚪 紧急出口标识
  private drawExitSign(x: number, y: number, ts: number): void {
    const c = this.ctx;
    // 绿色背景
    c.fillStyle = '#1a5c2a';
    c.fillRect(x + 2, y + ts / 2 - 4, ts - 4, 8);
    c.fillStyle = '#2ecc71';
    c.fillRect(x + 3, y + ts / 2 - 3, ts - 6, 6);
    // 文字
    c.fillStyle = '#fff';
    c.font = `bold ${Math.max(6, ts - 18)}px monospace`;
    c.textAlign = 'center';
    c.fillText('EXIT →', x + ts / 2, y + ts / 2 + 2);
  }

  // 📢 励志标语海报
  private drawMotivationPoster(x: number, y: number, ts: number): void {
    const c = this.ctx;
    const posters = [
      { bg: '#2980b9', text: '加油!', sub: 'FIGHTING' },
      { bg: '#8e44ad', text: '创新', sub: 'INNOVATE' },
      { bg: '#d35400', text: '拼搏', sub: 'WORK HARD' },
      { bg: '#16a085', text: '团队', sub: 'TEAM WORK' },
    ];
    const p = posters[Math.floor(x / ts + y) % posters.length];
    // 海报边框
    c.fillStyle = '#f5f0e0';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    // 海报内容
    c.fillStyle = p.bg;
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 文字
    c.fillStyle = '#fff';
    c.font = `bold ${Math.max(7, ts - 16)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText(p.text, x + ts / 2, y + ts / 2);
    c.font = `${Math.max(4, ts - 22)}px monospace`;
    c.fillText(p.sub, x + ts / 2, y + ts / 2 + 7);
  }

  // 🏆 公司荣誉照片墙 — 像真实办公室墙上的团队合影/公司荣誉
  private drawCorporatePhoto(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 木质相框
    c.fillStyle = '#5c3a1e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#8b6914';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    // 照片内容 — 模拟团队合影（彩色方块小人）
    c.fillStyle = '#e8e0d0';
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 天空背景
    c.fillStyle = '#87ceeb';
    c.fillRect(x + 4, y + 3, ts - 8, ts / 3);
    // 地面
    c.fillStyle = '#90ee90';
    c.fillRect(x + 4, y + ts * 2 / 3, ts - 8, ts / 3 - 3);
    // 团队成员 — 彩色小方块
    const teamColors = ['#e94560', '#4a90d9', '#4ad97a', '#d9a94a', '#a94ad9'];
    for (let i = 0; i < 5; i++) {
      const px = x + 5 + i * 5;
      const py = y + ts * 2 / 3 - 6;
      // 身体
      c.fillStyle = teamColors[i];
      c.fillRect(px, py + 2, 4, 4);
      // 头
      c.fillStyle = '#e8c39e';
      c.fillRect(px + 1, py, 2, 2);
    }
    // 照片标签
    c.fillStyle = '#333';
    c.font = `bold ${Math.max(5, ts - 20)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('TEAM', x + ts / 2, y + ts - 2);
  }

  // 🏅 团队奖项展示 — 隔墙上的团队成就/奖杯展示
  private drawTeamAward(x: number, y: number, ts: number, t: number, tx: number): void {
    const c = this.ctx;
    const isFrontend = tx === 8;
    // 展示柜底色
    c.fillStyle = '#1a2a3e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    // 玻璃面板
    c.fillStyle = 'rgba(90,184,232,0.15)';
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 边框
    c.strokeStyle = '#8ab4d8';
    c.lineWidth = 1;
    c.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
    if (isFrontend) {
      // 🎨 前端团队奖项 — "最佳 UI 设计奖"
      // 奖杯
      c.fillStyle = '#fbbf24';
      c.fillRect(x + ts / 2 - 4, y + ts / 3 - 2, 8, 6);
      c.fillStyle = '#f59e0b';
      c.fillRect(x + ts / 2 - 2, y + ts / 3 + 4, 4, 3);
      c.fillRect(x + ts / 2 - 5, y + ts / 3 + 7, 10, 2);
      // 奖杯闪光
      if (Math.sin(t * 3) > 0) {
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fillRect(x + ts / 2 - 1, y + ts / 3, 2, 2);
      }
      // 奖项标签
      c.fillStyle = '#60a5fa';
      c.font = `bold ${Math.max(5, ts - 18)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('🎨 前端团队', x + ts / 2, y + ts - 3);
    } else {
      // ⚙️ 后端团队奖项 — "最佳架构奖"
      // 奖牌
      c.fillStyle = '#c0c0c0';
      c.beginPath();
      c.arc(x + ts / 2, y + ts / 2 - 1, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.arc(x + ts / 2, y + ts / 2 - 1, 4, 0, Math.PI * 2);
      c.fill();
      // 绶带
      c.fillStyle = '#e94560';
      c.fillRect(x + ts / 2 - 1, y + ts / 2 - 8, 2, 7);
      // 奖牌文字
      c.fillStyle = '#333';
      c.font = `bold ${Math.max(4, ts - 20)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('⭐', x + ts / 2, y + ts / 2 + 1);
      // 奖项标签
      c.fillStyle = '#4ade80';
      c.font = `bold ${Math.max(5, ts - 18)}px sans-serif`;
      c.fillText('⚙️ 后端团队', x + ts / 2, y + ts - 3);
    }
  }

  // 📜 公司发展历程时间线 — 走廊墙上的里程碑展示
  private drawCompanyTimeline(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 时间线背景板
    c.fillStyle = '#2a2a3e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#333350';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    // 时间线轴线
    c.strokeStyle = '#6366f1';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 4, y + ts / 2);
    c.lineTo(x + ts - 4, y + ts / 2);
    c.stroke();
    // 里程碑节点
    const milestones = [
      { x: 0.2, label: '2024', color: '#e94560', sub: '成立' },
      { x: 0.5, label: '2025', color: '#4ade80', sub: 'A轮' },
      { x: 0.8, label: '2026', color: '#fbbf24', sub: '扩张' },
    ];
    for (const m of milestones) {
      const mx = x + ts * m.x;
      const my = y + ts / 2;
      // 节点圆点
      c.fillStyle = m.color;
      c.beginPath();
      c.arc(mx, my, 3, 0, Math.PI * 2);
      c.fill();
      // 发光效果
      c.fillStyle = m.color + '40';
      c.beginPath();
      c.arc(mx, my, 5, 0, Math.PI * 2);
      c.fill();
      // 年份标签
      c.fillStyle = '#e0e0e0';
      c.font = `bold ${Math.max(5, ts - 20)}px monospace`;
      c.textAlign = 'center';
      c.fillText(m.label, mx, my - 5);
      c.fillStyle = '#94a3b8';
      c.font = `${Math.max(4, ts - 22)}px sans-serif`;
      c.fillText(m.sub, mx, my + 9);
    }
  }

  private drawDesk(x: number, y: number, ts: number, tx: number, ty: number): void {
    const c = this.ctx;
    // 桌面 — 深色木纹
    c.fillStyle = '#7a5a2a';
    c.fillRect(x + 1, y + 3, ts - 2, ts - 5);
    c.fillStyle = '#8b6914';
    c.fillRect(x + 2, y + 4, ts - 4, ts - 6);
    // 桌腿
    c.fillStyle = '#5a4010';
    c.fillRect(x + 2, y + ts - 5, 3, 3);
    c.fillRect(x + ts - 5, y + ts - 5, 3, 3);

    // 🖥️ 双显示器 — 程序员标配
    // 左显示器
    c.fillStyle = '#1a1a1a';
    c.fillRect(x + 3, y + 2, ts / 2 - 4, ts / 2 - 1);
    c.fillStyle = '#222';
    c.fillRect(x + 4, y + 3, ts / 2 - 6, ts / 2 - 3);
    // 左屏幕内容 — 代码编辑器（深色主题）
    c.fillStyle = '#1e1e2e';
    c.fillRect(x + 5, y + 4, ts / 2 - 8, ts / 2 - 5);
    // 代码行
    const codeColors = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#e06c75', '#56b6c2'];
    for (let i = 0; i < 4; i++) {
      c.fillStyle = codeColors[(i + x * 3 + y * 7) % codeColors.length];
      const lineW = 3 + ((i * 5 + x * 2) % 6);
      c.fillRect(x + 6, y + 5 + i * 3, lineW, 2);
    }
    // 显示器支架
    c.fillStyle = '#333';
    c.fillRect(x + ts / 4 - 1, y + ts / 2, 2, 4);
    c.fillRect(x + ts / 4 - 3, y + ts / 2 + 3, 6, 1);

    // 右显示器
    c.fillStyle = '#1a1a1a';
    c.fillRect(x + ts / 2 + 1, y + 2, ts / 2 - 4, ts / 2 - 1);
    c.fillStyle = '#222';
    c.fillRect(x + ts / 2 + 2, y + 3, ts / 2 - 6, ts / 2 - 3);
    // 右屏幕内容 — 浏览器/终端
    c.fillStyle = '#0a0a14';
    c.fillRect(x + ts / 2 + 3, y + 4, ts / 2 - 8, ts / 2 - 5);
    // 终端提示符
    c.fillStyle = '#4ade80';
    c.fillRect(x + ts / 2 + 4, y + 6, 2, 2);
    c.fillStyle = '#888';
    c.fillRect(x + ts / 2 + 7, y + 6, 4, 2);
    // 光标闪烁
    if (Math.sin(Date.now() * 0.005) > 0) {
      c.fillStyle = '#4ade80';
      c.fillRect(x + ts / 2 + 12, y + 6, 2, 2);
    }
    // 第二行
    c.fillStyle = '#61afef';
    c.fillRect(x + ts / 2 + 4, y + 9, 5, 2);
    c.fillStyle = '#c678dd';
    c.fillRect(x + ts / 2 + 10, y + 9, 3, 2);
    // 显示器支架
    c.fillStyle = '#333';
    c.fillRect(x + ts * 3 / 4 - 1, y + ts / 2, 2, 4);
    c.fillRect(x + ts * 3 / 4 - 3, y + ts / 2 + 3, 6, 1);

    // ⌨️ 键盘托盘 — 双显示器下方的小键盘，程序员标配三件套
    // 键盘主体 — 深灰色薄矩形
    c.fillStyle = '#2a2a2a';
    c.fillRect(x + ts * 0.15, y + ts * 0.52, ts * 0.7, ts * 0.15);
    // 键盘面 — 稍浅灰色
    c.fillStyle = '#3a3a3a';
    c.fillRect(x + ts * 0.17, y + ts * 0.53, ts * 0.66, ts * 0.12);
    // 键帽行 — 模拟键盘按键排列
    const keyColors = ['#555', '#5a5a5a', '#505050', '#585858'];
    for (let row = 0; row < 3; row++) {
      const keysPerRow = 10;
      const keyW = (ts * 0.62) / keysPerRow;
      const keyH = ts * 0.03;
      const rowY = y + ts * (0.54 + row * 0.035);
      // 每行偏移模拟真实键盘错列
      const rowOffset = row === 1 ? keyW * 0.3 : row === 2 ? keyW * 0.5 : 0;
      for (let k = 0; k < keysPerRow; k++) {
        c.fillStyle = keyColors[(row + k) % keyColors.length];
        c.fillRect(x + ts * 0.18 + rowOffset + k * keyW, rowY, keyW - 0.5, keyH);
      }
    }
    // 空格键 — 底部中央长条
    c.fillStyle = '#4a4a4a';
    c.fillRect(x + ts * 0.35, y + ts * 0.64, ts * 0.3, ts * 0.025);
    // 键盘边缘高光
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(x + ts * 0.17, y + ts * 0.53, ts * 0.66, 1);

    // ⌨️ 机械键盘 — 桌面中央
    c.fillStyle = '#2a2a2a';
    c.fillRect(x + ts / 2 - 7, y + ts / 2 + 1, 14, 5);
    c.fillStyle = '#333';
    c.fillRect(x + ts / 2 - 6, y + ts / 2 + 2, 12, 3);
    // 键帽
    c.fillStyle = '#444';
    for (let kx = 0; kx < 4; kx++) {
      for (let ky = 0; ky < 1; ky++) {
        c.fillRect(x + ts / 2 - 5 + kx * 3, y + ts / 2 + 2 + ky * 2, 2, 1);
      }
    }
    // WASD 高亮 — 暗示偶尔摸鱼打游戏
    c.fillStyle = '#e94560';
    c.fillRect(x + ts / 2 - 2, y + ts / 2 + 2, 2, 1);
    c.fillRect(x + ts / 2 - 5, y + ts / 2 + 3, 2, 1);
    c.fillRect(x + ts / 2 - 2, y + ts / 2 + 3, 2, 1);
    c.fillRect(x + ts / 2 + 1, y + ts / 2 + 3, 2, 1);

    // 🖱️ 鼠标 — 键盘右侧
    c.fillStyle = '#333';
    c.fillRect(x + ts / 2 + 8, y + ts / 2 + 1, 4, 5);
    c.fillStyle = '#444';
    c.fillRect(x + ts / 2 + 9, y + ts / 2 + 2, 2, 3);
    // 鼠标滚轮
    c.fillStyle = '#555';
    c.fillRect(x + ts / 2 + 9, y + ts / 2 + 1, 1, 1);

    // 🪑 办公椅 — 人体工学椅，带靠背、扶手、轮子
    const chairY = y + ts - 4;
    // 五星底座 + 轮子
    c.fillStyle = '#2a2a3e';
    // 轮子（5 个，分布在底部）
    const wheelPositions = [
      [x + ts / 2 - 6, chairY + 1],
      [x + ts / 2 - 3, chairY + 2],
      [x + ts / 2, chairY + 3],
      [x + ts / 2 + 3, chairY + 2],
      [x + ts / 2 + 6, chairY + 1],
    ];
    for (const [wx, wy] of wheelPositions) {
      c.beginPath();
      c.arc(wx, wy, 1.5, 0, Math.PI * 2);
      c.fill();
    }
    // 底座横杆
    c.strokeStyle = '#3a3a4e';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + ts / 2 - 5, chairY + 1);
    c.lineTo(x + ts / 2 + 5, chairY + 1);
    c.stroke();
    // 气压杆
    c.fillStyle = '#555';
    c.fillRect(x + ts / 2 - 1, chairY - 3, 2, 5);
    // 坐垫 — 网面材质
    c.fillStyle = '#3a3a52';
    c.fillRect(x + ts / 2 - 5, chairY - 5, 10, 4);
    c.fillStyle = '#4a4a62';
    c.fillRect(x + ts / 2 - 4, chairY - 4, 8, 2);
    // 靠背 — 高靠背人体工学设计
    c.fillStyle = '#3a3a4e';
    c.fillRect(x + ts / 2 - 4, chairY - 9, 8, 5);
    c.fillStyle = '#4a4a62';
    c.fillRect(x + ts / 2 - 3, chairY - 8, 6, 3);
    // 头枕
    c.fillStyle = '#505068';
    c.fillRect(x + ts / 2 - 2, chairY - 11, 4, 3);
    // 扶手（左右各一个）
    c.fillStyle = '#2a2a3e';
    c.fillRect(x + ts / 2 - 6, chairY - 6, 2, 4);
    c.fillRect(x + ts / 2 + 4, chairY - 6, 2, 4);
    // 扶手顶部软垫
    c.fillStyle = '#4a4a62';
    c.fillRect(x + ts / 2 - 6, chairY - 7, 2, 2);
    c.fillRect(x + ts / 2 + 4, chairY - 7, 2, 2);

    // 💻 打字中 — 显示器发光效果！有人在工作，屏幕亮起来
    const deskKey = `${tx},${ty}`;
    if (this.typingDesks.has(deskKey)) {
      // 屏幕发光 — 蓝色/绿色代码编辑器光
      const glowIntensity = 0.2 + Math.sin(time * 3) * 0.08;
      // 左显示器发光
      const leftGlow = c.createRadialGradient(
        x + ts / 4, y + ts / 4, 0,
        x + ts / 4, y + ts / 4, ts / 2
      );
      leftGlow.addColorStop(0, `rgba(59,130,246,${glowIntensity})`);
      leftGlow.addColorStop(1, 'rgba(59,130,246,0)');
      c.fillStyle = leftGlow;
      c.fillRect(x, y, ts / 2, ts / 2);
      // 右显示器发光
      const rightGlow = c.createRadialGradient(
        x + ts * 3 / 4, y + ts / 4, 0,
        x + ts * 3 / 4, y + ts / 4, ts / 2
      );
      rightGlow.addColorStop(0, `rgba(34,197,94,${glowIntensity * 0.8})`);
      rightGlow.addColorStop(1, 'rgba(34,197,94,0)');
      c.fillStyle = rightGlow;
      c.fillRect(x + ts / 2, y, ts / 2, ts / 2);
      // 代码行闪烁 — 模拟代码在屏幕上滚动
      const codeLines = 5;
      for (let i = 0; i < codeLines; i++) {
        const linePhase = (time * 2 + i * 1.3) % 3;
        if (linePhase < 2) {
          const alpha = (1 - linePhase / 2) * 0.15;
          const lineY = y + 4 + i * 5 + Math.sin(time + i) * 1;
          // 左屏幕代码行
          c.fillStyle = `rgba(59,130,246,${alpha})`;
          c.fillRect(x + 5, lineY, 4 + Math.sin(i * 2) * 2, 1);
          // 右屏幕代码行
          c.fillStyle = `rgba(34,197,94,${alpha})`;
          c.fillRect(x + ts / 2 + 5, lineY + 1, 3 + Math.cos(i * 3) * 2, 1);
        }
      }
    } else if (this.idleDesks.has(deskKey)) {
      // 🖥️ 无人工位 — 显示器关闭，屏幕变暗，只有待机 LED 灯
      // 左显示器暗屏
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(x + 5, y + 4, ts / 2 - 8, ts / 2 - 5);
      // 左显示器待机 LED — 橙色闪烁
      const ledBlink = Math.sin(time * 1.5 + tx * 3 + ty * 7) > 0 ? 1 : 0.3;
      c.fillStyle = `rgba(255,165,0,${ledBlink})`;
      c.fillRect(x + ts / 4 + 4, y + ts / 4 - 1, 2, 2);
      // 右显示器暗屏
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(x + ts / 2 + 3, y + 4, ts / 2 - 8, ts / 2 - 5);
      // 右显示器待机 LED
      c.fillStyle = `rgba(255,165,0,${ledBlink * 0.8})`;
      c.fillRect(x + ts * 3 / 4 + 4, y + ts / 4 - 1, 2, 2);
    }
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

  // 🌿 窗台绿植 — 窗户旁的小盆栽，像真实办公室里每个窗台上都有的那种
  private drawWindowPlant(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    const sw = Math.sin(t * 1.5 + x) * 0.5;
    // 窗台（白色，像真实的窗台板）
    c.fillStyle = '#e8e0d0';
    c.fillRect(x + 1, y + ts - 8, ts - 2, 4);
    c.fillStyle = '#d4c8b0';
    c.fillRect(x + 1, y + ts - 5, ts - 2, 2);
    // 小花盆 — 比桌面盆栽更小巧
    c.fillStyle = '#c0392b'; // 红色陶土花盆
    c.fillRect(x + ts / 2 - 4, y + ts - 14, 8, 7);
    c.fillStyle = '#e74c3c';
    c.fillRect(x + ts / 2 - 5, y + ts - 15, 10, 2);
    // 泥土
    c.fillStyle = '#5c3a1e';
    c.fillRect(x + ts / 2 - 3, y + ts - 13, 6, 2);
    // 藤蔓植物 — 垂吊下来，像真实的窗台绿萝/常春藤
    c.fillStyle = '#4aaa3a';
    c.fillRect(x + ts / 2 - 1 + sw * 0.3, y + ts - 16, 3, 4);
    // 垂吊的藤蔓
    c.fillStyle = '#3a8a2a';
    c.fillRect(x + ts / 2 - 3 + sw, y + ts - 13, 2, 5 + Math.floor(Math.sin(t) * 2));
    c.fillRect(x + ts / 2 + 2 + sw * 0.5, y + ts - 12, 2, 4 + Math.floor(Math.cos(t * 0.7) * 2));
    // 叶子 — 小而圆
    c.fillStyle = '#5abb4a';
    c.fillRect(x + ts / 2 - 5 + sw, y + ts - 14, 3, 3);
    c.fillRect(x + ts / 2 + 3 + sw * 0.7, y + ts - 13, 3, 3);
    c.fillRect(x + ts / 2 - 2 + sw * 0.5, y + ts - 18, 4, 3);
    // 新芽 — 顶部嫩绿
    c.fillStyle = '#7acc5a';
    c.fillRect(x + ts / 2 + sw * 0.4, y + ts - 20, 2, 3);
  }

  // ============================================
  // 🏓 乒乓球桌 — 休息区的快乐源泉，绿色桌面+球网+乒乓球
  // ============================================
  private drawPingPong(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 桌腿
    c.fillStyle = '#555';
    c.fillRect(x + 4, y + ts - 6, 3, 5);
    c.fillRect(x + ts - 7, y + ts - 6, 3, 5);
    // 桌面 — 经典绿色乒乓球桌
    c.fillStyle = '#1a6b3a';
    c.fillRect(x + 2, y + 4, ts - 4, ts - 10);
    c.fillStyle = '#1e7a42';
    c.fillRect(x + 3, y + 5, ts - 6, ts - 12);
    // 白线 — 边线
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 1;
    c.strokeRect(x + 3, y + 5, ts - 6, ts - 12);
    // 中线
    c.beginPath();
    c.moveTo(x + ts / 2, y + 5);
    c.lineTo(x + ts / 2, y + ts - 7);
    c.stroke();
    // 球网 — 横跨中间
    c.fillStyle = '#ddd';
    c.fillRect(x + 1, y + ts / 2 - 1, ts - 2, 2);
    // 网柱
    c.fillStyle = '#999';
    c.fillRect(x, y + ts / 2 - 3, 2, 6);
    c.fillRect(x + ts - 2, y + ts / 2 - 3, 2, 6);
    // 🏓 乒乓球 — 弹跳动画
    const ballX = x + ts / 2 + Math.sin(t * 4) * (ts / 4);
    const ballBounce = Math.abs(Math.sin(t * 6)) * 4;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ballX, y + ts / 2 - ballBounce, 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.arc(ballX, y + ts / 2 - ballBounce - 1, 1, 0, Math.PI * 2);
    c.fill();
  }

  // ============================================
  // 🎮 复古游戏机 — 休息区的 CRT 显示器 + 游戏手柄 + 闪烁屏幕
  // ============================================
  private drawGameConsole(x: number, y: number, ts: number, t: number, _tx: number, _ty: number): void {
    const c = this.ctx;

    // 📺 CRT 显示器机身 — 米白色复古外壳，像90年代街机厅的机器
    c.fillStyle = '#d8d0c0';
    c.fillRect(x + 3, y + 3, ts - 6, ts - 8);
    c.fillStyle = '#e8e0d0';
    c.fillRect(x + 4, y + 4, ts - 8, ts - 10);

    // 屏幕边框 — 深灰色
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 6, y + 6, ts - 12, ts - 16);

    // 🎮 屏幕内容 — 复古像素游戏画面，不断闪烁变化
    // 模拟经典太空入侵者游戏
    const gamePhase = Math.floor(t * 0.5) % 4; // 每2秒切换一个游戏画面

    if (gamePhase === 0) {
      // 画面1: 太空入侵者 — 像素外星人
      c.fillStyle = '#00ff00';
      // 外星人（像素风格）
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const ax = x + 8 + col * 5;
          const ay = y + 7 + row * 3;
          c.fillRect(ax, ay, 3, 2);
          // 外星人眼睛
          c.fillStyle = '#000';
          c.fillRect(ax + 1, ay, 1, 1);
          c.fillStyle = '#00ff00';
        }
      }
      // 玩家飞船
      c.fillStyle = '#00aaff';
      c.fillRect(x + ts / 2 - 3, y + ts - 14, 6, 3);
      c.fillRect(x + ts / 2 - 1, y + ts - 15, 2, 1);
      // 子弹
      if (Math.sin(t * 6) > 0) {
        c.fillStyle = '#ffff00';
        c.fillRect(x + ts / 2, y + ts - 18 - (Math.floor(t * 3) % 6), 1, 2);
      }
    } else if (gamePhase === 1) {
      // 画面2: 贪吃蛇 — 经典绿色蛇身
      c.fillStyle = '#00cc00';
      const snakeSegs = [
        { sx: 0, sy: 0 }, { sx: 1, sy: 0 }, { sx: 2, sy: 0 },
        { sx: 2, sy: 1 }, { sx: 2, sy: 2 }, { sx: 1, sy: 2 },
        { sx: 0, sy: 2 }, { sx: 0, sy: 1 },
      ];
      for (const seg of snakeSegs) {
        c.fillRect(x + 8 + seg.sx * 4, y + 7 + seg.sy * 3, 3, 2);
      }
      // 食物
      c.fillStyle = '#ff0000';
      c.fillRect(x + 16, y + 13, 2, 2);
      // 分数
      c.fillStyle = '#00ff00';
      c.font = '4px monospace';
      c.textAlign = 'left';
      c.fillText('999', x + 7, y + ts - 9);
    } else if (gamePhase === 2) {
      // 画面3: 打砖块 — 彩色砖块 + 弹球
      const brickColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff'];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          if (!((row === 2 && col === 3))) { // 缺一块表示被打掉
            c.fillStyle = brickColors[row];
            c.fillRect(x + 8 + col * 4, y + 7 + row * 2, 3, 2);
          }
        }
      }
      // 挡板
      c.fillStyle = '#ffffff';
      c.fillRect(x + ts / 2 - 4, y + ts - 13, 8, 2);
      // 弹球
      const ballX2 = x + ts / 2 + Math.sin(t * 4) * 6;
      const ballY2 = y + ts - 16 - Math.abs(Math.sin(t * 3)) * 5;
      c.fillStyle = '#ffffff';
      c.fillRect(ballX2, ballY2, 2, 2);
    } else {
      // 画面4: GAME OVER 闪烁
      const blink = Math.sin(t * 8) > 0;
      if (blink) {
        c.fillStyle = '#ff0000';
        c.font = 'bold 6px monospace';
        c.textAlign = 'center';
        c.fillText('GAME', x + ts / 2, y + ts / 2 - 1);
        c.fillText('OVER', x + ts / 2, y + ts / 2 + 5);
      } else {
        c.fillStyle = '#00ff00';
        c.font = 'bold 5px monospace';
        c.textAlign = 'center';
        c.fillText('INSERT', x + ts / 2, y + ts / 2 - 1);
        c.fillText('COIN', x + ts / 2, y + ts / 2 + 5);
      }
    }

    // 屏幕反光 — CRT 玻璃的弧形高光
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath();
    c.ellipse(x + ts / 2 - 2, y + ts / 3, ts / 5, ts / 6, -0.3, 0, Math.PI * 2);
    c.fill();

    // 🎮 手柄 — 放在显示器前面，两个复古手柄
    // 左手柄
    c.fillStyle = '#222';
    c.fillRect(x + 6, y + ts - 7, 8, 4);
    c.fillStyle = '#333';
    c.fillRect(x + 7, y + ts - 6, 6, 2);
    // 十字方向键
    c.fillStyle = '#555';
    c.fillRect(x + 8, y + ts - 6, 1, 2);
    c.fillRect(x + 7, y + ts - 5, 3, 1);
    // AB按钮
    c.fillStyle = '#e94560';
    c.fillRect(x + 11, y + ts - 6, 2, 1);
    c.fillStyle = '#3498db';
    c.fillRect(x + 11, y + ts - 5, 2, 1);
    // 手柄线
    c.strokeStyle = '#333';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + 10, y + ts - 7);
    c.quadraticCurveTo(x + 10, y + ts - 9, x + ts / 2, y + ts - 10);
    c.stroke();

    // 右手柄（简化，放在右边）
    c.fillStyle = '#222';
    c.fillRect(x + ts - 14, y + ts - 7, 8, 4);
    c.fillStyle = '#333';
    c.fillRect(x + ts - 13, y + ts - 6, 6, 2);
    c.fillStyle = '#e94560';
    c.fillRect(x + ts - 11, y + ts - 6, 2, 1);
    c.fillStyle = '#3498db';
    c.fillRect(x + ts - 11, y + ts - 5, 2, 1);
    // 手柄线
    c.strokeStyle = '#333';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + ts - 10, y + ts - 7);
    c.quadraticCurveTo(x + ts - 10, y + ts - 9, x + ts / 2, y + ts - 10);
    c.stroke();

    // 投币口 — 街机风格，闪烁的"INSERT COIN"灯
    const coinBlink = Math.sin(t * 3) > 0;
    c.fillStyle = coinBlink ? '#fbbf24' : '#886600';
    c.fillRect(x + ts / 2 - 3, y + ts - 3, 6, 2);
    c.fillStyle = '#333';
    c.fillRect(x + ts / 2 - 1, y + ts - 3, 2, 2);

    // 散热孔 — 机器侧面
    c.fillStyle = '#aaa';
    for (let i = 0; i < 3; i++) {
      c.fillRect(x + 2, y + 8 + i * 4, 2, 1);
      c.fillRect(x + ts - 4, y + 8 + i * 4, 2, 1);
    }

    // 🌟 屏幕发光效果 — CRT 显示器的蓝色光晕，模拟真实CRT的电子枪发光
    const screenGlow = 0.15 + Math.sin(t * 2) * 0.05;
    const glowGrad = c.createRadialGradient(
      x + ts / 2, y + ts / 2, 0,
      x + ts / 2, y + ts / 2, ts * 0.8
    );
    glowGrad.addColorStop(0, `rgba(0,255,136,${screenGlow.toFixed(2)})`);
    glowGrad.addColorStop(0.5, `rgba(0,170,255,${(screenGlow * 0.3).toFixed(2)})`);
    glowGrad.addColorStop(1, 'rgba(0,100,200,0)');
    c.fillStyle = glowGrad;
    c.fillRect(x - ts / 4, y - ts / 4, ts * 1.5, ts * 1.5);

    // CRT 扫描线效果 — 细水平线模拟 CRT 显示器的扫描线
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let line = 0; line < ts - 16; line += 2) {
      c.fillRect(x + 6, y + 6 + line, ts - 12, 1);
    }

    // 🕹️ 游戏机标签 — "ARCADE" 贴纸
    c.fillStyle = '#e94560';
    c.fillRect(x + ts / 2 - 8, y + 1, 16, 3);
    c.fillStyle = '#fff';
    c.font = `bold ${Math.max(5, ts - 20)}px monospace`;
    c.textAlign = 'center';
    c.fillText('ARCADE', x + ts / 2, y + 3);
  }

  // ============================================
  // 🎂 生日蛋糕 — 工位上的生日庆祝，蛋糕+蜡烛+气球
  // ============================================
  private drawBirthdayCake(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 蛋糕底座 — 圆形
    c.fillStyle = '#f5e6d0';
    c.beginPath();
    c.ellipse(x + ts / 2, y + ts / 2 + 3, ts / 3, ts / 5, 0, 0, Math.PI * 2);
    c.fill();
    // 蛋糕层 — 粉色奶油
    c.fillStyle = '#ff9bb3';
    c.fillRect(x + ts / 2 - 6, y + ts / 2 - 4, 12, 8);
    // 奶油花边
    c.fillStyle = '#ffb8d0';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(x + ts / 2 - 4 + i * 3, y + ts / 2 - 4, 2, 0, Math.PI * 2);
      c.fill();
    }
    // 巧克力层
    c.fillStyle = '#5c3a1e';
    c.fillRect(x + ts / 2 - 5, y + ts / 2 + 1, 10, 3);
    // 🕯️ 蜡烛 — 3 根彩色蜡烛
    const candleColors = ['#e74c3c', '#3498db', '#f1c40f'];
    for (let i = 0; i < 3; i++) {
      const cx = x + ts / 2 - 4 + i * 4;
      c.fillStyle = candleColors[i];
      c.fillRect(cx, y + ts / 2 - 9, 2, 6);
      // 蜡烛芯
      c.fillStyle = '#333';
      c.fillRect(cx, y + ts / 2 - 10, 2, 1);
    }
    // 🔥 火焰 — 闪烁效果
    const flicker = Math.sin(t * 8) * 1;
    c.fillStyle = '#ffa500';
    c.beginPath();
    c.ellipse(x + ts / 2 - 3 + flicker, y + ts / 2 - 12, 1.5, 2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff6600';
    c.beginPath();
    c.ellipse(x + ts / 2 + flicker * 0.5, y + ts / 2 - 13, 1, 1.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffa500';
    c.beginPath();
    c.ellipse(x + ts / 2 + 3 - flicker, y + ts / 2 - 12, 1.5, 2, 0, 0, Math.PI * 2);
    c.fill();
    // 🎈 气球 — 飘在蛋糕旁边
    const balloonBob = Math.sin(t * 2) * 2;
    // 左气球
    c.fillStyle = '#e74c3c';
    c.beginPath();
    c.ellipse(x + ts / 2 - 8, y + ts / 2 - 14 + balloonBob, 4, 5, -0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.ellipse(x + ts / 2 - 9, y + ts / 2 - 15 + balloonBob, 1.5, 2, -0.2, 0, Math.PI * 2);
    c.fill();
    // 气球线
    c.strokeStyle = '#999';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + ts / 2 - 8, y + ts / 2 - 9 + balloonBob);
    c.quadraticCurveTo(x + ts / 2 - 6, y + ts / 2 - 5, x + ts / 2 - 5, y + ts / 2 - 2);
    c.stroke();
    // 右气球
    c.fillStyle = '#3498db';
    c.beginPath();
    c.ellipse(x + ts / 2 + 8, y + ts / 2 - 14 - balloonBob, 4, 5, 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.ellipse(x + ts / 2 + 7, y + ts / 2 - 15 - balloonBob, 1.5, 2, 0.2, 0, Math.PI * 2);
    c.fill();
    // 气球线
    c.strokeStyle = '#999';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + ts / 2 + 8, y + ts / 2 - 9 - balloonBob);
    c.quadraticCurveTo(x + ts / 2 + 6, y + ts / 2 - 5, x + ts / 2 + 5, y + ts / 2 - 2);
    c.stroke();
    // ✨ 闪闪发光粒子
    if (Math.sin(t * 5) > 0.5) {
      c.fillStyle = '#ffd700';
      c.fillRect(x + ts / 2 - 10, y + ts / 2 - 16, 1, 1);
      c.fillRect(x + ts / 2 + 10, y + ts / 2 - 10, 1, 1);
      c.fillRect(x + ts / 2 + 5, y + ts / 2 - 18, 1, 1);
    }
  }

  // 🚪 入口迎宾地垫 — 电梯口的 "Welcome" 地垫，真实办公室标配
  private drawWelcomeMat(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 地垫底色 — 深灰色橡胶材质
    c.fillStyle = '#3a3a4a';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 地垫边框 — 红色包边
    c.strokeStyle = '#e94560';
    c.lineWidth = 2;
    c.strokeRect(x + 2, y + 2, ts - 4, ts - 4);

    // 橡胶纹理 — 细密斜线
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    c.lineWidth = 0.5;
    for (let i = -ts; i < ts * 2; i += 3) {
      c.beginPath();
      c.moveTo(x + i, y + 1);
      c.lineTo(x + i + ts / 2, y + ts - 1);
      c.stroke();
    }

    // "WELCOME" 文字
    c.fillStyle = '#e94560';
    c.font = `bold ${Math.max(6, ts - 16)}px monospace`;
    c.textAlign = 'center';
    c.fillText('WELCOME', x + ts / 2, y + ts / 2 + 3);

    // 地垫磨损效果 — 偶尔有几处颜色稍浅（用久了）
    const wear = Math.sin(t * 0.1) * 0.5 + 0.5;
    if (wear > 0.8) {
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(x + ts / 3, y + ts / 2, ts / 4, 2);
    }
  }

  // ============================================
  // 🏢 会议室玻璃隔断 — 半透明玻璃墙，能看到里面开会
  // ============================================
  private drawMeetingGlass(x: number, y: number, ts: number, t: number, _tx: number, _ty: number): void {
    const c = this.ctx;
    // 玻璃底色 — 半透明蓝灰色
    const glassAlpha = 0.15 + Math.sin(t * 0.3) * 0.03;
    c.fillStyle = `rgba(42,74,106,${glassAlpha})`;
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 玻璃高光 — 模拟真实玻璃的反光
    const glare = Math.sin(t * 0.7 + _tx * 0.2) * 0.5 + 0.5;
    if (glare > 0.6) {
      c.fillStyle = `rgba(255,255,255,${(glare - 0.6) * 0.4})`;
      c.fillRect(x + 3, y + 3, ts / 3, ts / 4);
    }

    // 金属边框 — 银色铝合金框架
    c.strokeStyle = '#8ab4d8';
    c.lineWidth = 1.5;
    c.strokeRect(x + 1.5, y + 1.5, ts - 3, ts - 3);

    // 金属立柱 — 模拟框架的垂直支撑
    c.fillStyle = '#9ab8d0';
    c.fillRect(x + ts / 2 - 1, y + 1, 2, ts - 2);

    // "MEETING" 磨砂文字 — 像真实办公室的玻璃门上印的那种
    c.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(t * 0.5) * 0.05})`;
    c.font = `bold ${Math.max(6, ts - 18)}px monospace`;
    c.textAlign = 'center';
    c.fillText('MEETING', x + ts / 2, y + ts / 2 + 3);

    // 门把手 — 右侧小圆点，像真实的玻璃门
    c.fillStyle = '#bbb';
    c.beginPath();
    c.arc(x + ts - 5, y + ts / 2, 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#999';
    c.beginPath();
    c.arc(x + ts - 5, y + ts / 2, 1, 0, Math.PI * 2);
    c.fill();

    // 磨砂条纹 — 中间一条水平的磨砂带，像真实玻璃隔断
    c.fillStyle = 'rgba(200,220,240,0.12)';
    c.fillRect(x + 2, y + ts / 2 - 2, ts - 4, 4);

    // 如果会议室有人在开会，玻璃上会有模糊的人影
    if (this.meetingRoomActive && this.meetingAgentCount >= 2) {
      // 模糊人影剪影
      c.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(t * 0.5) * 0.02})`;
      const silhouetteCount = Math.min(this.meetingAgentCount, 4);
      for (let i = 0; i < silhouetteCount; i++) {
        const sx = x + 4 + i * ((ts - 8) / silhouetteCount);
        const sway = Math.sin(t * 0.8 + i) * 1;
        // 头部
        c.beginPath();
        c.arc(sx + 3 + sway, y + ts / 3, 3, 0, Math.PI * 2);
        c.fill();
        // 身体
        c.fillRect(sx + sway, y + ts / 3 + 3, 6, ts / 3 - 3);
      }
    }
  }

  // 🚪 会议室玻璃门 — 区别于普通玻璃隔断，有门把手+PUSH标识+开关动画
  private drawMeetingDoor(x: number, y: number, ts: number, t: number, _tx: number, _ty: number): void {
    const c = this.ctx;

    // 玻璃底色 — 和普通玻璃一致
    const glassAlpha = 0.15 + Math.sin(t * 0.3) * 0.03;
    c.fillStyle = `rgba(42,74,106,${glassAlpha})`;
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 玻璃高光
    const glare = Math.sin(t * 0.7 + _tx * 0.2) * 0.5 + 0.5;
    if (glare > 0.6) {
      c.fillStyle = `rgba(255,255,255,${(glare - 0.6) * 0.4})`;
      c.fillRect(x + 3, y + 3, ts / 3, ts / 4);
    }

    // 门框 — 比普通玻璃更粗的金属边框，区分门和隔断
    c.strokeStyle = '#7aa0c0';
    c.lineWidth = 2.5;
    c.strokeRect(x + 1.5, y + 1.5, ts - 3, ts - 3);

    // 铰链 — 左侧（门是向右开的）
    c.fillStyle = '#888';
    c.fillRect(x + 1, y + 3, 3, 4);
    c.fillRect(x + 1, y + ts - 7, 3, 4);

    // 门把手 — 右侧圆形不锈钢把手
    const handleX = x + ts - 7;
    const handleY = y + ts / 2;
    // 把手底座
    c.fillStyle = '#c0c0c0';
    c.beginPath();
    c.arc(handleX, handleY, 3, 0, Math.PI * 2);
    c.fill();
    // 把手中心
    c.fillStyle = '#e8e8e8';
    c.beginPath();
    c.arc(handleX, handleY, 2, 0, Math.PI * 2);
    c.fill();
    // 把手高光
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.arc(handleX - 0.5, handleY - 0.5, 1, 0, Math.PI * 2);
    c.fill();

    // PUSH 标识 — 门上金色小字，真实办公室标配
    c.fillStyle = `rgba(251,191,36,${0.5 + Math.sin(t * 1.2) * 0.1})`;
    c.font = `bold ${Math.max(5, ts - 20)}px monospace`;
    c.textAlign = 'center';
    c.fillText('PUSH', x + ts / 2, y + ts / 3 + 2);

    // 磨砂条纹 — 和普通玻璃一致的高度
    c.fillStyle = 'rgba(200,220,240,0.12)';
    c.fillRect(x + 2, y + ts / 2 - 2, ts - 4, 4);

    // 开会中指示灯 — 门上方小圆点，有人在时亮红
    if (this.meetingRoomActive && this.meetingAgentCount >= 2) {
      const indicatorY = y + 5;
      const indicatorX = x + ts / 2;
      // 红灯
      const redPulse = 0.5 + Math.sin(t * 2) * 0.3;
      c.fillStyle = `rgba(239,68,68,${redPulse})`;
      c.beginPath();
      c.arc(indicatorX, indicatorY, 2.5, 0, Math.PI * 2);
      c.fill();
      // 光晕
      c.fillStyle = `rgba(239,68,68,${redPulse * 0.2})`;
      c.beginPath();
      c.arc(indicatorX, indicatorY, 5, 0, Math.PI * 2);
      c.fill();
    } else {
      // 空闲绿灯
      c.fillStyle = 'rgba(34,197,94,0.4)';
      c.beginPath();
      c.arc(x + ts / 2, y + 5, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // 会议室有人时，玻璃上有模糊人影
    if (this.meetingRoomActive && this.meetingAgentCount >= 2) {
      c.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(t * 0.5) * 0.02})`;
      const silhouetteCount = Math.min(this.meetingAgentCount, 4);
      for (let i = 0; i < silhouetteCount; i++) {
        const sx = x + 4 + i * ((ts - 8) / silhouetteCount);
        const sway = Math.sin(t * 0.8 + i) * 1;
        c.beginPath();
        c.arc(sx + 3 + sway, y + ts / 3, 3, 0, Math.PI * 2);
        c.fill();
        c.fillRect(sx + sway, y + ts / 3 + 3, 6, ts / 3 - 3);
      }
    }
  }

  // 📋 会议室白板 — 带议程和便利贴，开会时显示会议主题
  private drawMeetingWhiteboard(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 白板底色 + 金属边框
    c.fillStyle = '#f0f0f5'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#e8e8f0'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.strokeStyle = '#888'; c.lineWidth = 1; c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 白板笔槽（底部）
    c.fillStyle = '#666'; c.fillRect(x + 4, y + ts - 5, ts - 8, 2);
    // 笔（红、蓝、黑）
    c.fillStyle = '#e74c3c'; c.fillRect(x + 5, y + ts - 5, 3, 1);
    c.fillStyle = '#3498db'; c.fillRect(x + 9, y + ts - 5, 3, 1);
    c.fillStyle = '#333'; c.fillRect(x + 13, y + ts - 5, 3, 1);

    // 📌 会议议程标题
    c.fillStyle = '#2c3e50';
    c.font = 'bold 4px monospace';
    c.textAlign = 'center';
    c.fillText('AGENDA', x + ts / 2, y + 7);

    // 议程条目 — 带颜色的线条
    const agendaItems = ['需求评审', '技术方案', '排期确认'];
    const agendaColors = ['#e74c3c', '#3498db', '#2ecc71'];
    agendaItems.forEach((item, i) => {
      const iy = y + 10 + i * 5;
      // checkbox
      c.fillStyle = agendaColors[i];
      c.fillRect(x + 4, iy - 2, 3, 3);
      // 文字
      c.fillStyle = '#2c3e50';
      c.font = '3px monospace';
      c.textAlign = 'left';
      c.fillText(item, x + 8, iy + 1);
    });

    // 🟡 黄色便利贴 — "别忘了！"
    const noteX = x + ts - 8;
    const noteY = y + 10;
    c.fillStyle = '#fbbf24';
    c.fillRect(noteX, noteY, 6, 5);
    c.fillStyle = '#92400e';
    c.font = '2px sans-serif';
    c.textAlign = 'center';
    c.fillText('别忘', noteX + 3, noteY + 3);
    // 便利贴折角
    c.fillStyle = '#e8a820';
    c.fillRect(noteX + 4, noteY + 3, 2, 2);

    // 开会时：白板高亮 + 当前议题闪烁 + ⏱️ 会议计时器
    if (this.meetingRoomActive && this.meetingAgentCount >= 2) {
      // 白板边缘微光
      c.fillStyle = `rgba(74,144,217,${0.1 + Math.sin(t * 2) * 0.05})`;
      c.fillRect(x + 1, y + 1, ts - 2, 1);
      // 当前议题高亮闪烁
      const currentItem = Math.floor(t * 0.3) % agendaItems.length;
      c.fillStyle = `rgba(231,76,60,${0.3 + Math.sin(t * 3) * 0.15})`;
      c.fillRect(x + 3, y + 8 + currentItem * 5, ts - 6, 4);

      // ⏱️ 会议计时器 — 显示已开会时长，颜色随时间变红（真实打工人痛点！）
      if (this.meetingStartTime > 0) {
        const elapsed = t - this.meetingStartTime;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 紧急度颜色：<10min 绿色，10-30min 黄色，>30min 红色
        let timerColor: string;
        if (minutes < 10) timerColor = '#2ecc71';
        else if (minutes < 30) timerColor = '#f1c40f';
        else timerColor = '#e74c3c';

        // 计时器背景
        const timerY = y + ts - 10;
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(x + 2, timerY, ts - 4, 6);

        // 计时文字
        c.fillStyle = timerColor;
        c.font = 'bold 4px monospace';
        c.textAlign = 'center';
        c.fillText(`⏱️ ${timeStr}`, x + ts / 2, timerY + 5);

        // 超时警告 — 超过 20 分钟闪烁
        if (minutes >= 20) {
          const flash = Math.sin(t * 4) > 0;
          if (flash) {
            c.fillStyle = 'rgba(231,76,60,0.15)';
            c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
          }
        }

        // 超长会议吐槽 — 超过 45 分钟显示吐槽文字
        if (minutes >= 45) {
          const complaints = [
            '这会还没完？！',
            '我想回工位...',
            '已经超时了...',
            '能结束了吗？',
          ];
          const complaint = complaints[Math.floor(t * 0.5) % complaints.length];
          c.fillStyle = '#e74c3c';
          c.font = '2px sans-serif';
          c.textAlign = 'center';
          c.fillText(complaint, x + ts / 2, timerY - 2);
        }
      }
    }
  }

  // 🪑 茶水间吧台椅 — 高脚凳，打工人最爱的短暂休息点
  private drawBarStool(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    const cx = x + ts / 2;
    // 五星脚底座
    c.fillStyle = '#555';
    c.fillRect(cx - 1, y + ts - 6, 2, 2);
    // 5 条辐条 + 轮子
    const spokeLen = 6;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const ex = cx + Math.cos(angle) * spokeLen;
      const ey = y + ts - 5 + Math.sin(angle) * spokeLen * 0.4;
      c.strokeStyle = '#666';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx, y + ts - 5);
      c.lineTo(ex, ey);
      c.stroke();
      // 小轮子
      c.fillStyle = '#444';
      c.beginPath();
      c.arc(ex, ey, 1.5, 0, Math.PI * 2);
      c.fill();
    }
    // 气压杆 — 银色金属
    c.fillStyle = '#999';
    c.fillRect(cx - 1.5, y + ts / 2 - 2, 3, ts / 2 - 3);
    c.fillStyle = '#bbb';
    c.fillRect(cx - 1, y + ts / 2 - 1, 2, ts / 2 - 4);
    // 调节杆（侧面小突起）
    c.fillStyle = '#888';
    c.fillRect(cx + 2, y + ts * 3 / 4, 3, 2);
    // 坐垫 — 圆形皮革，高脚凳比普通椅子高
    c.fillStyle = '#5c3a1e';
    c.beginPath();
    c.ellipse(cx, y + ts / 2 - 2, 7, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6b4423';
    c.beginPath();
    c.ellipse(cx, y + ts / 2 - 3, 6, 3, 0, 0, Math.PI * 2);
    c.fill();
    // 坐垫高光 — 模拟皮革光泽
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath();
    c.ellipse(cx - 2, y + ts / 2 - 4, 3, 1.5, -0.3, 0, Math.PI * 2);
    c.fill();
    // 脚踏环 — 高脚凳的标志性特征，坐在上面脚可以踩着的金属环
    const ringY = y + ts * 2 / 3;
    c.strokeStyle = '#888';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(cx, ringY, 5, 2, 0, 0, Math.PI * 2);
    c.stroke();
    // 脚踏环高光
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.beginPath();
    c.ellipse(cx - 1, ringY - 0.5, 3, 1, -0.2, -Math.PI * 0.6, -Math.PI * 0.2);
    c.stroke();
  }

  // 🛋️ 访客等候区沙发 — 比工位沙发更正式，带扶手和公司色
  private drawVisitorSofa(x: number, y: number, ts: number, _t: number): void {
    const c = this.ctx;
    const cx = x + ts / 2;
    // 沙发底座
    c.fillStyle = '#3a5a7a';
    c.fillRect(x + 2, y + ts - 10, ts - 4, 6);
    // 靠背
    c.fillStyle = '#4a6a8a';
    c.fillRect(x + 2, y + 4, ts - 4, ts / 2 - 2);
    c.fillStyle = '#5a7a9a';
    c.fillRect(x + 3, y + 5, ts - 6, ts / 2 - 4);
    // 坐垫 — 更厚实，显得正式
    c.fillStyle = '#4a6a8a';
    c.fillRect(x + 3, y + ts / 2 - 2, ts / 2 - 4, ts / 2 - 5);
    c.fillRect(x + ts / 2 + 1, y + ts / 2 - 2, ts / 2 - 4, ts / 2 - 5);
    // 坐垫高光
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x + 4, y + ts / 2 - 1, ts / 2 - 6, 2);
    c.fillRect(x + ts / 2 + 2, y + ts / 2 - 1, ts / 2 - 6, 2);
    // 扶手 — 左右各一个，比工位沙发更高更正式
    c.fillStyle = '#3a5070';
    c.fillRect(x + 1, y + 6, 4, ts - 12);
    c.fillRect(x + ts - 5, y + 6, 4, ts - 12);
    // 扶手顶部圆角效果
    c.fillStyle = '#4a6080';
    c.fillRect(x + 2, y + 5, 2, 2);
    c.fillRect(x + ts - 4, y + 5, 2, 2);
    // 公司色小抱枕
    c.fillStyle = '#e94560';
    c.beginPath();
    c.arc(cx, y + ts / 2 + 1, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff6b6b';
    c.beginPath();
    c.arc(cx, y + ts / 2, 2, 0, Math.PI * 2);
    c.fill();
  }

  // 🏢 公司Logo墙 — 前台背景上的发光logo，访客第一眼看到的
  private drawCompanyLogo(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    const cx = x + ts / 2;
    // 背景墙 — 深色面板
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    // 边框 — 金属质感
    c.strokeStyle = '#3a3a5e';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
    // 发光logo — 呼吸灯效果
    const glowIntensity = 0.5 + 0.3 * Math.sin(t * 2);
    c.fillStyle = `rgba(0, 255, 136, ${glowIntensity * 0.15})`;
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // Logo文字
    c.fillStyle = `rgba(0, 255, 136, ${0.6 + glowIntensity * 0.4})`;
    c.font = `bold ${Math.max(8, ts - 12)}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('PIXEL', cx, y + ts / 2 - 3);
    c.font = `${Math.max(6, ts - 16)}px monospace`;
    c.fillStyle = `rgba(100, 200, 255, ${0.5 + glowIntensity * 0.3})`;
    c.fillText('AGENTS', cx, y + ts / 2 + 6);
    c.textBaseline = 'alphabetic';
    // 发光边框效果
    c.shadowColor = 'rgba(0, 255, 136, 0.5)';
    c.shadowBlur = 4 * glowIntensity;
    c.strokeStyle = `rgba(0, 255, 136, ${glowIntensity * 0.6})`;
    c.lineWidth = 0.5;
    c.strokeRect(x + 3, y + 3, ts - 6, ts - 6);
    c.shadowBlur = 0;
  }

  // 🧾 杂志架 — 访客等候区的阅读材料
  private drawMagazineRack(x: number, y: number, ts: number, _t: number): void {
    const c = this.ctx;
    // 架子主体
    c.fillStyle = '#6b5010';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#8b6914';
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 隔板 — 三层
    c.fillStyle = '#5c3a1e';
    c.fillRect(x + 3, y + ts / 3, ts - 6, 1);
    c.fillRect(x + 3, y + ts * 2 / 3, ts - 6, 1);
    // 杂志/读物 — 不同颜色表示不同内容
    const mags = [
      { y: 0.12, color: '#3498db', w: 5 }, // 科技杂志
      { y: 0.12, color: '#2ecc71', w: 4 }, // 健康杂志
      { y: 0.12, color: '#e74c3c', w: 3 }, // 商业杂志
      { y: 0.45, color: '#f39c12', w: 5 }, // 设计杂志
      { y: 0.45, color: '#9b59b6', w: 4 }, // 生活杂志
      { y: 0.78, color: '#1abc9c', w: 4 }, // 旅游杂志
      { y: 0.78, color: '#e67e22', w: 3 }, // 美食杂志
    ];
    for (const mag of mags) {
      const my = y + ts * mag.y;
      c.fillStyle = mag.color;
      c.fillRect(x + ts / 2 - mag.w / 2, my + 1, mag.w, ts / 3 - 3);
      // 杂志标题线
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(x + ts / 2 - mag.w / 2 + 1, my + 3, mag.w - 2, 1);
      c.fillRect(x + ts / 2 - mag.w / 2 + 1, my + 5, mag.w - 4, 1);
    }
    // 架子顶部装饰
    c.fillStyle = '#a07820';
    c.fillRect(x + 1, y + 1, ts - 2, 2);
  }

  // ============================================
  // 🌀 天花板空调出风口 — 每个办公室都有的中央空调，带动态出风效果
  // ============================================
  private drawAirConditioner(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 出风口外框 — 银白色金属面板
    c.fillStyle = '#e0e0e8';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#d0d0d8';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);

    // 出风格栅 — 多条横向百叶
    const slatCount = 5;
    const slatH = 2;
    const gapH = (ts - 8 - slatCount * slatH) / (slatCount + 1);
    for (let i = 0; i < slatCount; i++) {
      const sy = y + 4 + i * (slatH + gapH);
      // 百叶片 — 微微倾斜的角度
      c.fillStyle = '#b0b0c0';
      c.fillRect(x + 4, sy, ts - 8, slatH);
      // 百叶阴影
      c.fillStyle = 'rgba(0,0,0,0.1)';
      c.fillRect(x + 4, sy + slatH, ts - 8, 1);
    }

    // 🌀 动态出风粒子 — 模拟冷风/暖风从空调吹出
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      // 每个粒子有不同相位，形成连续的气流感
      const phase = (t * 0.8 + i * 0.7) % 3;
      if (phase < 2) {
        // 粒子从格栅中飘出，向下移动
        const progress = phase / 2; // 0 → 1
        const px = x + 4 + ((i * 3.7 + t * 2) % (ts - 12));
        const py = y + ts + progress * 12;
        const alpha = (1 - progress) * 0.35;

        // 风粒子 — 小椭圆形
        c.fillStyle = `rgba(200,220,255,${alpha.toFixed(2)})`;
        c.beginPath();
        c.ellipse(px, py, 2, 1.5, 0, 0, Math.PI * 2);
        c.fill();

        // 大颗粒水滴感（偶尔出现，像冷凝水）
        if (i % 3 === 0) {
          c.fillStyle = `rgba(180,210,240,${(alpha * 0.6).toFixed(2)})`;
          c.beginPath();
          c.ellipse(px + 1, py + 2, 1, 2.5, 0.2, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    // 边框
    c.strokeStyle = '#c0c0d0';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 指示灯 — 运行时绿色闪烁
    const ledOn = Math.sin(t * 2) > -0.3;
    c.fillStyle = ledOn ? '#4ade80' : '#2a3a2a';
    c.fillRect(x + ts - 6, y + 3, 3, 3);
    if (ledOn) {
      c.fillStyle = 'rgba(74,222,128,0.3)';
      c.beginPath();
      c.arc(x + ts - 4.5, y + 4.5, 4, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ============================================
  // 💡 天花板 LED 灯盘 — 嵌入式办公室照明，随昼夜自动开关
  private drawCeilingLight(x: number, y: number, ts: number, t: number, atm: AtmosphereState, tx: number, ty: number): void {
    const c = this.ctx;

    // 灯盘外壳 — 嵌入式白色铝制面板
    c.fillStyle = '#e8e8f0';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#dcdce4';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);

    // 灯盘边框 — 银色金属质感
    c.strokeStyle = '#c0c0d0';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 💡 灯光亮度计算 — 根据昼夜自动调节
    const isDark = atm.ambientBrightness < 0.6;
    const isDim = atm.ambientBrightness < 0.8;
    const baseBrightness = isDark ? 0.9 : isDim ? 0.5 : 0.15;
    const breathe = Math.sin(t * 1.2 + tx * 0.5 + ty * 0.3) * 0.05; // 微弱呼吸效果
    const brightness = Math.max(0, Math.min(1, baseBrightness + breathe));

    // 发光面 — LED 漫射面板
    const panelGrad = c.createLinearGradient(x + 4, y + 4, x + ts - 4, y + ts - 4);
    panelGrad.addColorStop(0, `rgba(255,248,220,${(brightness * 0.95).toFixed(2)})`);
    panelGrad.addColorStop(0.5, `rgba(255,250,235,${brightness.toFixed(2)})`);
    panelGrad.addColorStop(1, `rgba(255,245,210,${(brightness * 0.9).toFixed(2)})`);
    c.fillStyle = panelGrad;
    c.fillRect(x + 4, y + 4, ts - 8, ts - 8);

    // 🌟 灯光光晕 — 向下的锥形光照效果
    if (brightness > 0.3) {
      const glowAlpha = brightness * 0.12;
      const glowH = ts * 2.5; // 光晕向下延伸的高度
      const glowGrad = c.createLinearGradient(x, y + ts, x, y + ts + glowH);
      glowGrad.addColorStop(0, `rgba(255,245,200,${glowAlpha.toFixed(3)})`);
      glowGrad.addColorStop(0.4, `rgba(255,240,180,${(glowAlpha * 0.4).toFixed(3)})`);
      glowGrad.addColorStop(1, 'rgba(255,235,160,0)');
      c.fillStyle = glowGrad;
      // 锥形光 — 越往下越宽
      c.beginPath();
      c.moveTo(x + 4, y + ts);
      c.lineTo(x + ts - 4, y + ts);
      c.lineTo(x + ts + 8, y + ts + glowH);
      c.lineTo(x - 8, y + ts + glowH);
      c.closePath();
      c.fill();
    }

    // 💡 LED 灯珠 — 面板上可见的小亮点（模拟 LED 阵列）
    const ledCount = 3;
    for (let i = 0; i < ledCount; i++) {
      const lx = x + 6 + (i * (ts - 12)) / (ledCount - 1);
      const ly = y + ts / 2;
      const ledAlpha = brightness * 0.7;
      c.fillStyle = `rgba(255,255,240,${ledAlpha.toFixed(2)})`;
      c.fillRect(lx - 1, ly - 1, 2, 2);
      // 每个 LED 的微小光晕
      if (brightness > 0.4) {
        c.fillStyle = `rgba(255,250,220,${(brightness * 0.15).toFixed(2)})`;
        c.beginPath();
        c.arc(lx, ly, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // ============================================
  // 🧯 灭火器 — 墙上必备的消防设备，红色醒目
  // ============================================
  private drawFireExtinguisher(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;

    // 墙上固定支架
    c.fillStyle = '#888';
    c.fillRect(x + 4, y + 2, ts - 8, 2);
    c.fillStyle = '#999';
    c.fillRect(x + 6, y + 1, ts - 12, 2);

    // 灭火器瓶身 — 红色圆柱体
    const bx = x + ts / 2;
    const bodyW = ts / 3;
    const bodyH = ts * 0.55;
    const bodyTop = y + ts * 0.3;

    // 瓶身渐变 — 从鲜红到深红
    const bodyGrad = c.createLinearGradient(bx - bodyW / 2, 0, bx + bodyW / 2, 0);
    bodyGrad.addColorStop(0, '#a02020');
    bodyGrad.addColorStop(0.3, '#e03030');
    bodyGrad.addColorStop(0.5, '#f04040');
    bodyGrad.addColorStop(0.7, '#e03030');
    bodyGrad.addColorStop(1, '#a02020');
    c.fillStyle = bodyGrad;

    // 圆柱形瓶身（矩形 + 圆角）
    const r = 3;
    c.beginPath();
    c.moveTo(bx - bodyW / 2 + r, bodyTop);
    c.lineTo(bx + bodyW / 2 - r, bodyTop);
    c.arcTo(bx + bodyW / 2, bodyTop, bx + bodyW / 2, bodyTop + r, r);
    c.lineTo(bx + bodyW / 2, bodyTop + bodyH - r);
    c.arcTo(bx + bodyW / 2, bodyTop + bodyH, bx + bodyW / 2 - r, bodyTop + bodyH, r);
    c.lineTo(bx - bodyW / 2 + r, bodyTop + bodyH);
    c.arcTo(bx - bodyW / 2, bodyTop + bodyH, bx - bodyW / 2, bodyTop + bodyH - r, r);
    c.lineTo(bx - bodyW / 2, bodyTop + r);
    c.arcTo(bx - bodyW / 2, bodyTop, bx - bodyW / 2 + r, bodyTop, r);
    c.fill();

    // 瓶身高光 — 左侧反光条
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillRect(bx - bodyW / 2 + 2, bodyTop + 2, 2, bodyH - 4);

    // 白色标签区域 — "灭火器" 字样
    c.fillStyle = '#fff';
    c.fillRect(bx - bodyW / 2 + 2, bodyTop + 4, bodyW - 4, bodyH * 0.35);
    c.fillStyle = '#c0392b';
    c.font = `bold ${Math.max(5, ts * 0.22)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('消防', bx, bodyTop + bodyH * 0.22);
    c.fillText('灭火器', bx, bodyTop + bodyH * 0.42);

    // 顶部阀门/喷嘴 — 银色
    c.fillStyle = '#bbb';
    c.fillRect(bx - 2, bodyTop - 4, 4, 5);
    c.fillStyle = '#ccc';
    c.fillRect(bx - 1, bodyTop - 5, 2, 2);

    // 喷嘴软管 — 黑色弯曲管
    c.strokeStyle = '#333';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(bx + 2, bodyTop - 3);
    c.quadraticCurveTo(bx + bodyW / 2 + 2, bodyTop - 2, bx + bodyW / 2 + 1, bodyTop + 6);
    c.stroke();

    // 喷嘴头 — 锥形
    c.fillStyle = '#444';
    c.beginPath();
    c.moveTo(bx + bodyW / 2, bodyTop + 4);
    c.lineTo(bx + bodyW / 2 + 4, bodyTop + 8);
    c.lineTo(bx + bodyW / 2, bodyTop + 8);
    c.fill();

    // 压力表 — 小圆形，带指针
    const gaugeX = bx - bodyW / 2 + 3;
    const gaugeY = bodyTop + bodyH * 0.15;
    const gaugeR = 3;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#666';
    c.lineWidth = 0.5;
    c.stroke();
    // 指针 — 指向绿色区域（正常）
    c.strokeStyle = '#333';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(gaugeX, gaugeY);
    const needleAngle = -0.3 + Math.sin(t * 0.5) * 0.05; // 微微抖动，像真实压力表
    c.lineTo(gaugeX + Math.cos(needleAngle) * 2, gaugeY + Math.sin(needleAngle) * 2);
    c.stroke();
    // 绿色区域
    c.fillStyle = 'rgba(34,197,94,0.4)';
    c.beginPath();
    c.arc(gaugeX, gaugeY, gaugeR - 0.5, -0.8, 0.3);
    c.lineTo(gaugeX, gaugeY);
    c.fill();

    // 安全插销 — 黄色小环
    c.strokeStyle = '#fbbf24';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(bx - 1, bodyTop - 5, 1.5, 0, Math.PI * 2);
    c.stroke();
  }

  private drawCouch(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a04040'; c.fillRect(x + 2, y + ts / 2 - 4, ts - 4, ts / 2 - 2);
    c.fillStyle = '#8b3a3a'; c.fillRect(x + 2, y + ts / 2 + 2, ts - 4, 4);
    c.fillStyle = '#b05050';
    c.fillRect(x + 4, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
    c.fillRect(x + ts / 2 + 2, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
  }

  private drawWhiteboard(x: number, y: number, ts: number, _t: number): void {
    const c = this.ctx;
    // 白板底色 + 边框
    c.fillStyle = '#e0e0e8'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#f0f0f8'; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 金属边框
    c.strokeStyle = '#bbb'; c.lineWidth = 1; c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 📌 Sprint 看板 — 三列迷你版
    const cols = [
      { label: 'TODO', tasks: ['登录', 'API'], color: '#fbbf24' },
      { label: 'DOING', tasks: ['设计'], color: '#3b82f6' },
      { label: 'DONE', tasks: ['部署'], color: '#22c55e' },
    ];
    const colW = (ts - 10) / 3;
    for (let ci = 0; ci < 3; ci++) {
      const col = cols[ci];
      const cx = x + 4 + ci * colW;
      // 列标题
      c.fillStyle = col.color;
      c.fillRect(cx, y + 5, colW - 2, 5);
      c.fillStyle = '#fff'; c.font = 'bold 4px monospace'; c.textAlign = 'center';
      c.fillText(col.label, cx + colW / 2 - 1, y + 9);
      // 任务便利贴
      for (let ti = 0; ti < col.tasks.length; ti++) {
        const noteColors = ['#fef08a', '#fca5a5', '#93c5fd', '#86efac', '#fdba74'];
        c.fillStyle = noteColors[(ci * 2 + ti) % noteColors.length];
        const ny = y + 12 + ti * 6;
        c.fillRect(cx + 1, ny, colW - 4, 5);
        // 便利贴阴影
        c.fillStyle = 'rgba(0,0,0,0.1)';
        c.fillRect(cx + 2, ny + 5, colW - 5, 1);
        c.fillStyle = '#333'; c.font = '3px monospace'; c.textAlign = 'left';
        c.fillText(col.tasks[ti], cx + 2, ny + 4);
      }
    }
    // 🎨 右下角涂鸦 — 无聊时的杰作
    c.fillStyle = '#94a3b8'; c.font = '4px sans-serif'; c.textAlign = 'right';
    c.fillText('✏️', x + ts - 5, y + ts - 4);
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

  // 🖨️ 打印机卡纸 — 打印机故障，亮红灯，吐纸，打工人崩溃
  private drawPrinterJam(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;

    // 打印机机身 — 灰色
    c.fillStyle = '#555';
    c.fillRect(x + 4, y + 8, ts - 8, ts - 12);
    c.fillStyle = '#666';
    c.fillRect(x + 6, y + 10, ts - 12, 6);

    // 🔴 错误指示灯 — 红色闪烁，像心跳报警一样
    const errFlash = Math.sin(t * 6) > 0;
    c.fillStyle = errFlash ? '#ff2222' : '#660000';
    c.fillRect(x + 5, y + 9, 3, 3);
    if (errFlash) {
      c.fillStyle = 'rgba(255,34,34,0.25)';
      c.beginPath();
      c.arc(x + 6.5, y + 10.5, 5, 0, Math.PI * 2);
      c.fill();
    }

    // 📄 卡住的纸 — 从出纸口吐出半截，微微颤动
    const paperWobble = Math.sin(t * 4) * 1.5;
    c.fillStyle = '#f5f5f0';
    c.save();
    c.translate(x + ts / 2 + paperWobble, y + ts - 6);
    c.rotate(paperWobble * 0.05);
    c.fillRect(-4, -2, 8, 10);
    // 纸上的文字线（模拟打印了一半的文件）
    c.fillStyle = '#999';
    c.fillRect(-3, 0, 6, 1);
    c.fillRect(-3, 2, 4, 1);
    c.fillRect(-3, 4, 5, 1);
    c.restore();

    // ⚠️ 错误提示 — 小屏幕上显示 "ERR"
    c.fillStyle = '#222';
    c.fillRect(x + ts / 2 - 5, y + 10, 10, 5);
    c.fillStyle = errFlash ? '#ff4444' : '#ff8888';
    c.font = 'bold 4px monospace';
    c.textAlign = 'center';
    c.fillText('ERR', x + ts / 2, y + 14);

    // 💥 散落的碎纸片 — 卡纸时掉在地上的碎屑
    c.fillStyle = '#e8e8e0';
    const scraps = [
      { sx: x + 2, sy: y + ts - 2, sw: 3, sh: 2, rot: 0.3 },
      { sx: x + ts - 6, sy: y + ts - 3, sw: 4, sh: 2, rot: -0.2 },
      { sx: x + ts / 2 + 6, sy: y + ts - 1, sw: 2, sh: 2, rot: 0.5 },
    ];
    for (const s of scraps) {
      c.save();
      c.translate(s.x + s.sw / 2, s.y + s.sh / 2);
      c.rotate(s.rot);
      c.fillRect(-s.sw / 2, -s.sh / 2, s.sw, s.sh);
      c.restore();
    }
  }

  private drawCoffee(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // ☕ 咖啡吧台升级 — 真实咖啡站
    // 吧台台面（深色木纹）
    c.fillStyle = '#6b4423';
    c.fillRect(x + 2, y + ts - 8, ts - 4, 6);
    c.fillStyle = '#7a5530';
    c.fillRect(x + 3, y + ts - 7, ts - 6, 2);
    // 意式咖啡机机身
    c.fillStyle = '#2c2c2c';
    c.fillRect(x + 4, y + 4, ts - 12, ts - 12);
    c.fillStyle = '#3a3a3a';
    c.fillRect(x + 5, y + 5, ts - 14, ts - 14);
    // 咖啡机顶部（水箱）
    c.fillStyle = '#444';
    c.fillRect(x + 6, y + 3, ts - 16, 4);
    c.fillStyle = 'rgba(100,180,255,0.3)'; // 水箱里的水
    c.fillRect(x + 7, y + 4, ts - 20, 2);
    // 冲煮头 + 手柄
    c.fillStyle = '#888';
    c.fillRect(x + ts / 2 - 2, y + ts / 2 + 2, 4, 6);
    c.fillStyle = '#555';
    c.fillRect(x + ts / 2 - 5, y + ts / 2 + 4, 10, 3); // 手柄
    // 杯温器（顶部暖灯效果）
    c.fillStyle = '#555';
    c.fillRect(x + 6, y + 7, ts - 16, 2);
    c.fillStyle = `rgba(255,180,50,${0.2 + Math.sin(t * 2) * 0.1})`; // 暖光
    c.fillRect(x + 7, y + 8, ts - 18, 1);
    // 吧台杯子
    const mugColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
    for (let i = 0; i < 3; i++) {
      const mx = x + 6 + i * 7;
      c.fillStyle = mugColors[i];
      c.fillRect(mx, y + ts - 14, 5, 6); // 杯身
      c.fillStyle = mugColors[i];
      c.fillRect(mx + 5, y + ts - 13, 2, 4); // 杯把
    }
    // 动态蒸汽
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 3; i++) {
      const sx = x + ts / 2 - 2 + Math.sin(t * 2 + i * 1.5) * 3;
      const sy = y + 2 - i * 3 + Math.sin(t * 3 + i) * 1;
      const size = 2 + i;
      c.globalAlpha = 0.12 - i * 0.03;
      c.fillRect(sx, sy, size, size);
    }
    c.globalAlpha = 1;
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
    // 🌧️ 雨天窗户特效 — 雨滴顺着玻璃滑落
    if (atm.weather === 'rain') {
      this.drawWindowRainDrops(x, y, ts, t);
    }
  }

  // 🌧️ 雨天窗户水滴 — 动态雨滴顺着玻璃流下，打工人最爱的看雨发呆效果
  private drawWindowRainDrops(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 多层雨滴效果
    const dropCount = 5 + Math.floor(ts / 8);
    for (let i = 0; i < dropCount; i++) {
      // 每个雨滴有不同的起始位置和速度
      const dropX = x + 4 + ((i * 7 + 3) % (ts - 8));
      const speed = 0.3 + (i % 3) * 0.15;
      const dropY = y + 4 + ((t * speed * 10 + i * 13) % (ts - 10));
      const dropLen = 3 + (i % 3) * 2;
      // 雨滴主体 — 半透明白色条纹
      c.fillStyle = 'rgba(200,220,255,0.25)';
      c.fillRect(dropX, dropY, 1, dropLen);
      // 雨滴头部 — 稍亮的水珠
      c.fillStyle = 'rgba(220,240,255,0.4)';
      c.fillRect(dropX, dropY, 1, 1);
      // 尾迹 — 淡淡的水痕
      c.fillStyle = 'rgba(200,220,255,0.08)';
      c.fillRect(dropX, dropY - 2, 1, 2);
    }
    // 大颗水珠 — 偶尔出现在窗玻璃上，慢慢往下滑
    const beadCount = 2;
    for (let i = 0; i < beadCount; i++) {
      const beadX = x + 5 + ((i * 11 + 5) % (ts - 10));
      const beadSpeed = 0.15 + i * 0.05;
      const beadY = y + 4 + ((t * beadSpeed * 8 + i * 17) % (ts - 12));
      const beadSize = 2 + (i % 2);
      // 水珠高光
      c.fillStyle = 'rgba(220,240,255,0.35)';
      c.fillRect(beadX, beadY, beadSize, beadSize);
      // 水珠阴影（模拟折射）
      c.fillStyle = 'rgba(150,180,220,0.15)';
      c.fillRect(beadX + 1, beadY + 1, beadSize, beadSize);
      // 水珠上方的水痕
      c.fillStyle = 'rgba(200,220,255,0.06)';
      c.fillRect(beadX, beadY - 3, 1, 3);
    }
    // 窗框底部积水 — 像真实窗台积水一样
    const puddleAlpha = 0.1 + Math.sin(t * 0.5) * 0.03;
    c.fillStyle = `rgba(150,180,220,${puddleAlpha})`;
    c.fillRect(x + 3, y + ts - 5, ts - 6, 3);
    // 窗框上的水渍
    c.strokeStyle = 'rgba(180,200,230,0.15)';
    c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const dripX = x + 6 + i * (ts - 12) / 2;
      const dripLen = 2 + Math.sin(t * 0.7 + i * 2) * 1;
      c.beginPath();
      c.moveTo(dripX, y + ts - 6);
      c.lineTo(dripX, y + ts - 6 + dripLen);
      c.stroke();
    }
    // 窗外模糊的雨景效果 — 灰色条纹
    c.globalAlpha = 0.04;
    c.fillStyle = '#8a9aae';
    for (let i = 0; i < 4; i++) {
      const rx = x + 4 + ((i * 9 + t * 3) % (ts - 8));
      const ry = y + 4 + ((t * 5 + i * 11) % (ts - 8));
      c.fillRect(rx, ry, 2, 1);
    }
    c.globalAlpha = 1;
  }

  private drawClock(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx, cx = x + ts / 2, cy = y + ts / 2;
    const r = ts / 2 - 3;

    // 表盘外圈 — 银色金属边框
    c.fillStyle = '#c0c0c0'; c.beginPath(); c.arc(cx, cy, r + 2, 0, Math.PI * 2); c.fill();
    // 表盘底色 — 白色
    c.fillStyle = '#f8f8f8'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    // 表盘内圈 — 微妙的渐变效果
    c.fillStyle = '#f0f0f5'; c.beginPath(); c.arc(cx, cy, r - 1, 0, Math.PI * 2); c.fill();

    // 12 小时刻度 — 3/6/9/12 加粗
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 3 === 0;
      const tickLen = isMajor ? 4 : 2;
      const tickW = isMajor ? 2 : 1;
      const outerR = r - 3;
      const innerR = outerR - tickLen;
      const cos = Math.cos(a), sin = Math.sin(a);
      c.fillStyle = isMajor ? '#2a2a3e' : '#888';
      c.save();
      c.translate(cx + cos * (outerR + innerR) / 2, cy + sin * (outerR + innerR) / 2);
      c.rotate(a + Math.PI / 2);
      c.fillRect(-tickW / 2, -tickLen / 2, tickW, tickLen);
      c.restore();
    }

    // 获取中国时间 (UTC+8)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const chinaTime = new Date(utcMs + 8 * 3600000);
    const h = chinaTime.getHours() % 12;
    const m = chinaTime.getMinutes();
    const s = chinaTime.getSeconds();
    const ms = chinaTime.getMilliseconds();

    // 时针
    const hA = (h + (m + s / 60) / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const hLen = r * 0.45;
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hA) * hLen, cy + Math.sin(hA) * hLen); c.stroke();

    // 分针
    const mA = (m + s / 60) / 60 * Math.PI * 2 - Math.PI / 2;
    const mLen = r * 0.65;
    c.strokeStyle = '#333'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(mA) * mLen, cy + Math.sin(mA) * mLen); c.stroke();

    // 秒针 — 红色，流畅移动（含毫秒）
    const sA = (s + ms / 1000) / 60 * Math.PI * 2 - Math.PI / 2;
    const sLen = r * 0.78;
    c.strokeStyle = '#e94560'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sA) * sLen, cy + Math.sin(sA) * sLen); c.stroke();

    // 中心圆点 — 红色
    c.fillStyle = '#e94560'; c.beginPath(); c.arc(cx, cy, 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 0.8, 0, Math.PI * 2); c.fill();
  }
  private drawPoster(x: number, y: number, ts: number, tx: number, ty: number): void {
    const c = this.ctx; c.fillStyle = '#2a2a3e'; c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    c.fillStyle = colors[(tx + ty) % colors.length]; c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(x + 5, y + 6, ts - 10, 2); c.fillRect(x + 5, y + 10, ts - 14, 2); c.fillRect(x + 5, y + 14, ts - 12, 2);
  }
  private drawCarpet(x: number, y: number, ts: number, tx: number, ty: number): void {
    const c = this.ctx;
    // 办公地毯 — 深蓝色调，与地板形成明显对比
    c.fillStyle = '#2e2e4e';
    c.fillRect(x, y, ts, ts);

    // 地毯编织纹理 — 交叉线条模拟真实地毯
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    c.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const offset = i * (ts / 4);
      c.beginPath();
      c.moveTo(x + offset, y);
      c.lineTo(x + offset, y + ts);
      c.stroke();
      c.beginPath();
      c.moveTo(x, y + offset);
      c.lineTo(x + ts, y + offset);
      c.stroke();
    }

    // 地毯边缘 — 略深的阴影，模拟地毯厚度
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(x, y + ts - 2, ts, 2);
    c.fillRect(x + ts - 2, y, 2, ts);

    // 地毯接缝 — 如果旁边也是地毯，显示接缝线
    const map = this.tileMap;
    const isCarpet = (dx: number, dy: number) => {
      const nx = tx + dx, ny = ty + dy;
      return ny >= 0 && ny < map.height && nx >= 0 && nx < map.width && map.tiles[ny][nx] === TileType.Carpet;
    };
    if (!isCarpet(-1, 0)) {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x, y, 2, ts);
    }
    if (!isCarpet(1, 0)) {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x + ts - 2, y, 2, ts);
    }
    if (!isCarpet(0, -1)) {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x, y, ts, 2);
    }
    if (!isCarpet(0, 1)) {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x, y + ts - 2, ts, 2);
    }
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
    // 📌 冰箱门上的行政通知 — 打工人最烦看到的
    // 黄色便利贴：「请勿存放过夜外卖」
    c.fillStyle = '#fbbf24';
    c.fillRect(x + 5, y + 8, 10, 6);
    c.fillStyle = '#92400e';
    c.font = '3px sans-serif';
    c.textAlign = 'center';
    c.fillText('勿放过', x + 10, y + 11);
    c.fillText('夜外卖！', x + 10, y + 14);
    // 粉色便利贴：「行政部提醒」
    c.fillStyle = '#f9a8d4';
    c.fillRect(x + 6, y + 16, 8, 4);
    c.fillStyle = '#831843';
    c.font = '3px sans-serif';
    c.fillText('记得带饭', x + 10, y + 19);
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
    // 🪑 办公椅升级 — 靠背 + 坐垫 + 五星轮子底座
    const isNeighbor = (dx: number, dy: number): boolean => {
      const nx = tx + dx, ny = ty + dy;
      return ny >= 0 && ny < map.height && nx >= 0 && nx < map.width && map.tiles[ny][nx] === TileType.MeetingTable;
    };
    const drawOfficeChair = (cx: number, cy: number, facing: 'up' | 'down' | 'left' | 'right') => {
      // 五星轮子底座（中心点 + 5 条辐条）
      c.fillStyle = '#555';
      c.fillRect(cx - 1, cy - 1, 2, 2);
      const spokeLen = 4;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const sx = Math.cos(angle) * spokeLen;
        const sy = Math.sin(angle) * spokeLen;
        c.fillRect(cx + sx - 0.5, cy + sy - 0.5, 1, 1);
      }
      // 气压杆
      c.fillStyle = '#888';
      c.fillRect(cx - 1, cy - 1, 2, 2);
      // 坐垫
      c.fillStyle = '#2c3e50';
      c.fillRect(cx - 4, cy - 3, 8, 6);
      c.fillStyle = '#34495e';
      c.fillRect(cx - 3, cy - 2, 6, 4);
      // 靠背 — 根据朝向放在不同位置
      c.fillStyle = '#1a252f';
      if (facing === 'down') {
        c.fillRect(cx - 4, cy - 5, 8, 3); // 靠背在上方
      } else if (facing === 'up') {
        c.fillRect(cx - 4, cy + 3, 8, 3); // 靠背在下方
      } else if (facing === 'left') {
        c.fillRect(cx + 3, cy - 4, 3, 8); // 靠背在右侧
      } else {
        c.fillRect(cx - 6, cy - 4, 3, 8); // 靠背在左侧
      }
      // 扶手（两侧小突起）
      c.fillStyle = '#555';
      if (facing === 'down' || facing === 'up') {
        c.fillRect(cx - 5, cy - 1, 2, 2);
        c.fillRect(cx + 3, cy - 1, 2, 2);
      } else {
        c.fillRect(cx - 1, cy - 5, 2, 2);
        c.fillRect(cx - 1, cy + 3, 2, 2);
      }
    };
    // 四把椅子，靠背朝外（远离桌子中心）
    if (!isNeighbor(0, -1)) drawOfficeChair(x + ts / 2, y + 2, 'up');
    if (!isNeighbor(0, 1)) drawOfficeChair(x + ts / 2, y + ts - 3, 'down');
    if (!isNeighbor(-1, 0)) drawOfficeChair(x + 3, y + ts / 2, 'left');
    if (!isNeighbor(1, 0)) drawOfficeChair(x + ts - 3, y + ts / 2, 'right');
    // 💻 桌上的笔记本电脑（放在桌子中央，微微打开）
    const laptopX = x + ts / 2 - 5, laptopY = y + ts / 2 - 3;
    // 屏幕（半开状态，显示蓝色PPT）
    c.fillStyle = '#2c3e50'; c.fillRect(laptopX + 1, laptopY, 8, 1); // 屏幕顶部
    c.fillStyle = '#3498db'; c.fillRect(laptopX + 2, laptopY + 1, 6, 3); // 屏幕内容
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(laptopX + 3, laptopY + 1, 2, 1); // 高光
    // 键盘底座
    c.fillStyle = '#7f8c8d'; c.fillRect(laptopX, laptopY + 4, 10, 3);
    c.fillStyle = '#95a5a6'; c.fillRect(laptopX + 1, laptopY + 5, 8, 1);
    // 触摸板
    c.fillStyle = '#bdc3c7'; c.fillRect(laptopX + 3, laptopY + 6, 4, 1);
    // 投影仪光效（从桌子一端投出光束）
    if (Math.sin(t * 0.7) > 0.5) {
      const beamAlpha = 0.05 + Math.sin(t * 0.7) * 0.05;
      c.fillStyle = `rgba(100,180,255,${beamAlpha})`;
      c.beginPath();
      c.moveTo(x + ts / 2, y + 2);
      c.lineTo(x + ts / 2 - 6, y - 2);
      c.lineTo(x + ts / 2 + 6, y - 2);
      c.closePath();
      c.fill();
    }
  }

  // ============================================
  // 📽️ 会议室投影仪光束 — agents 开会时的视觉效果
  // ============================================
  private drawProjectorBeam(ts: number, t: number): void {
    if (!this.meetingRoomActive || this.meetingAgentCount < 2) return;

    const c = this.ctx;
    const map = this.tileMap;

    // 会议室区域 (13-18, 1-4)，投影仪在 (17,1) 白板上方的墙上
    const projX = 17 * ts + ts / 2;
    const projY = 1 * ts + ts / 2;

    // 投影范围 — 覆盖会议桌区域 (14-16, 2-3)
    const targetLeft = 13.5 * ts;
    const targetRight = 16.5 * ts;
    const targetTop = 1.5 * ts;
    const targetBottom = 4.5 * ts;

    // 投影仪机身 — 墙上的小方盒
    c.fillStyle = '#2c3e50';
    c.fillRect(projX - 4, projY - 3, 8, 6);
    c.fillStyle = '#34495e';
    c.fillRect(projX - 3, projY - 2, 6, 4);
    // 镜头
    c.fillStyle = '#1a1a2e';
    c.beginPath();
    c.arc(projX - 3, projY, 2, 0, Math.PI * 2);
    c.fill();
    // 镜头光点
    c.fillStyle = `rgba(100,180,255,${0.6 + Math.sin(t * 3) * 0.3})`;
    c.beginPath();
    c.arc(projX - 4, projY, 1, 0, Math.PI * 2);
    c.fill();

    // 投影仪光束 — 锥形半透明光
    const beamAlpha = 0.06 + Math.sin(t * 1.5) * 0.02;
    const slideHue = (t * 10) % 360; // PPT 颜色缓慢变化

    // 主光束
    c.fillStyle = `hsla(${slideHue}, 60%, 70%, ${beamAlpha})`;
    c.beginPath();
    c.moveTo(projX - 2, projY);
    c.lineTo(targetLeft, targetTop);
    c.lineTo(targetRight, targetTop);
    c.lineTo(targetRight, targetBottom);
    c.lineTo(targetLeft, targetBottom);
    c.closePath();
    c.fill();

    // 光束边缘 — 更明显的边界
    c.strokeStyle = `hsla(${slideHue}, 60%, 70%, ${beamAlpha * 2})`;
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(projX - 2, projY);
    c.lineTo(targetLeft, targetTop);
    c.stroke();
    c.beginPath();
    c.moveTo(projX - 2, projY);
    c.lineTo(targetLeft, targetBottom);
    c.stroke();
    c.setLineDash([]);

    // 投影画面内容 — 模拟 PPT 幻灯片
    const slideW = targetRight - targetLeft;
    const slideH = targetBottom - targetTop;
    const slideX = targetLeft + 2;
    const slideY = targetTop + 2;

    // PPT 背景
    c.fillStyle = `hsla(${slideHue}, 40%, 85%, 0.15)`;
    c.fillRect(slideX, slideY, slideW - 4, slideH - 4);

    // PPT 标题栏
    c.fillStyle = `hsla(${slideHue}, 50%, 40%, 0.25)`;
    c.fillRect(slideX, slideY, slideW - 4, slideH * 0.2);

    // 标题文字（模拟）
    c.fillStyle = `hsla(${slideHue}, 60%, 30%, 0.3)`;
    c.font = `bold ${Math.max(5, slideH * 0.15)}px monospace`;
    c.textAlign = 'center';
    const slides = ['Q2 目标', '技术方案', '排期讨论', 'Bug 回顾', '下周计划'];
    const slideIdx = Math.floor(t * 0.05) % slides.length;
    c.fillText(slides[slideIdx], targetLeft + slideW / 2, slideY + slideH * 0.15);

    // PPT 内容行（模拟文字行）
    c.fillStyle = `hsla(${slideHue}, 40%, 30%, 0.2)`;
    const lineCount = 3 + Math.floor(t * 0.1) % 3;
    for (let i = 0; i < lineCount; i++) {
      const lineY = slideY + slideH * 0.25 + i * slideH * 0.18;
      const lineWidth = slideW * (0.4 + Math.sin(i * 2.3) * 0.3);
      c.fillRect(slideX + 4, lineY, lineWidth, 3);
    }

    // 投影仪运行指示灯
    c.fillStyle = Math.sin(t * 4) > 0 ? '#2ecc71' : '#27ae60';
    c.fillRect(projX + 3, projY - 2, 2, 2);

    // 会议中人数提示
    if (this.meetingAgentCount >= 2) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.font = 'bold 7px monospace';
      c.textAlign = 'center';
      c.fillText(`📽️ 会议中 ×${this.meetingAgentCount}`, projX, projY - 8);
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
    // 🥡 微波炉顶上堆着外卖盒 — 打工人真实写照
    const takeoutColors = ['#e74c3c', '#f39c12', '#e67e22'];
    for (let i = 0; i < 3; i++) {
      const bx = x + 5 + i * 5;
      const by = y + 1 - i * 1;
      c.fillStyle = takeoutColors[i];
      c.fillRect(bx, by, 5, 3);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(bx + 1, by + 1, 3, 1); // 盖子反光
    }
    // 偶尔冒热气 — 有人在热饭
    if (Math.sin(t * 0.8) > 0.3) {
      c.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 2; i++) {
        const sx = x + ts / 2 - 2 + Math.sin(t * 2 + i) * 2;
        const sy = y + 2 - i * 3 + Math.sin(t * 1.5 + i) * 1;
        c.fillRect(sx, sy, 2, 2);
      }
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

    // 🚪 电梯门动画 — 门打开时两扇门向两侧滑动
    if (this.elevatorDoorOpen) {
      const doorOpenAmount = 0.8; // 门打开程度
      const doorWidth = (ts / 2 - 5) * (1 - doorOpenAmount);
      // 左门
      c.fillStyle = '#7a7a8e';
      c.fillRect(x + 4, y + 4, doorWidth, ts - 8);
      // 右门
      c.fillRect(x + ts - 4 - doorWidth, y + 4, doorWidth, ts - 8);
      // 电梯内部（门打开后看到的空间）
      c.fillStyle = '#3a3a4e';
      c.fillRect(x + 4 + doorWidth, y + 4, ts - 8 - doorWidth * 2, ts - 8);
      // 电梯内部灯光
      c.fillStyle = 'rgba(255, 255, 200, 0.3)';
      c.fillRect(x + 4 + doorWidth, y + 4, ts - 8 - doorWidth * 2, ts - 8);
    } else {
      // 电梯门关闭
      c.fillStyle = '#7a7a8e';
      c.fillRect(x + 4, y + 4, ts / 2 - 5, ts - 8);
      c.fillRect(x + ts / 2 + 1, y + 4, ts / 2 - 5, ts - 8);
      // 门缝
      c.fillStyle = '#3a3a4e'; c.fillRect(x + ts / 2 - 1, y + 3, 2, ts - 6);
    }

    // 楼层显示屏
    c.fillStyle = '#2a2a3e'; c.fillRect(x + ts / 2 - 5, y + 5, 10, 6);
    c.fillStyle = '#4ade80'; c.font = 'bold 6px monospace'; c.textAlign = 'center';
    const floor = Math.floor(t * 0.2) % 20 + 1;
    c.fillText(`${floor}F`, x + ts / 2, y + 10);

    // 🚨 超载报警 — 红色闪烁边框
    if (this.elevatorOverload) {
      const flash = Math.sin(t * 8) > 0;
      if (flash) {
        c.strokeStyle = '#ff4444';
        c.lineWidth = 3;
        c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
        // ⚠️ 超载标识
        c.fillStyle = '#ff4444';
        c.font = 'bold 8px sans-serif';
        c.fillText('⚠️', x + ts / 2, y - 2);
      }
    }

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
    // 雨伞 — 动态数量，随拿取减少，像真实办公室一样
    const umbrellaColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    const umbrellaPositions = [
      { ox: -4, angle: -0.3 },
      { ox: -1, angle: -0.1 },
      { ox: 2, angle: 0.1 },
      { ox: 5, angle: 0.3 },
    ];
    const count = Math.min(this.umbrellasRemaining, umbrellaPositions.length);
    for (let i = 0; i < count; i++) {
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
    // 伞空了 — 空桶提示
    if (this.umbrellasRemaining <= 0) {
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.font = '5px monospace';
      c.textAlign = 'center';
      c.fillText('空', x + ts / 2, y + ts / 2);
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
  // 📌 软木公告栏 — 真实办公室必备
  // ============================================
  private drawBulletinBoard(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 软木板底色（棕黄色）
    c.fillStyle = '#8b6914';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#a07820';
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 软木纹理 — 细小随机斑点
    c.fillStyle = 'rgba(139,105,20,0.5)';
    for (let i = 0; i < 8; i++) {
      const dx = 4 + ((i * 7 + 3) % (ts - 10));
      const dy = 4 + ((i * 11 + 5) % (ts - 10));
      c.fillRect(x + dx, y + dy, 1, 1);
    }
    // 木质边框
    c.strokeStyle = '#5c3a1e';
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 📢 动态公告内容 — 每 20 秒轮换一次，像真实办公室公告栏
    // 获取中国时间决定显示什么
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const chinaHour = new Date(utcMs + 8 * 3600000).getHours();
    const chinaDay = new Date(utcMs + 8 * 3600000).getDay(); // 0=周日
    // 轮换周期 20 秒
    const cycleIndex = Math.floor(t / 20) % 6;

    // 便利贴数据：[标题, 内容, 颜色, 文字色, 图钉色, 位置偏移]
    const noticeSets: Array<{
      title: string; content: string; noteColor: string; textColor: string; pinColor: string;
      title2?: string; content2?: string; noteColor2?: string; textColor2?: string; pinColor2?: string;
    }> = [
      // 套装 0: 行政通知 + 生日提醒
      { title: '通知', content: '下周体检', noteColor: '#fbbf24', textColor: '#92400e', pinColor: '#e94560',
        title2: '🎂', content2: '4/15', noteColor2: '#f9a8d4', textColor2: '#9d174d', pinColor2: '#3b82f6' },
      // 套装 1: 团建活动
      { title: '🎉 团建', content: '周五聚餐', noteColor: '#86efac', textColor: '#166534', pinColor: '#f59e0b',
        title2: 'KTV', content2: '晚7点', noteColor2: '#fde68a', textColor2: '#92400e', pinColor2: '#ef4444' },
      // 套装 2: 节假日通知
      { title: '🏖️ 放假', content: '五一休5天', noteColor: '#bfdbfe', textColor: '#1e40af', pinColor: '#22c55e',
        title2: '值班', content2: '轮流来', noteColor2: '#fecaca', textColor2: '#991b1b', pinColor2: '#a855f7' },
      // 套装 3: 办公区守则
      { title: '🔇 安静', content: '轻声细语', noteColor: '#e9d5ff', textColor: '#6b21a8', pinColor: '#06b6d4',
        title2: '🍱 冰箱', content2: '写名字!', noteColor2: '#fed7aa', textColor2: '#9a3412', pinColor2: '#84cc16' },
      // 套装 4: 技术分享
      { title: '📚 分享', content: '周三Rust', noteColor: '#cffafe', textColor: '#155e75', pinColor: '#f97316',
        title2: '报名', content2: '找行政', noteColor2: '#fde68a', textColor2: '#92400e', pinColor2: '#ec4899' },
      // 套装 5: 健康提醒（根据时间段变化）
      { title: chinaHour >= 12 && chinaHour < 14 ? '😴 午休' : '💧 喝水',
        content: chinaHour >= 12 && chinaHour < 14 ? '别吵Zzz' : '每天8杯',
        noteColor: '#bbf7d0', textColor: '#166534', pinColor: '#3b82f6',
        title2: chinaDay === 5 ? '🎉 周五' : '💪 运动',
        content2: chinaDay === 5 ? '快放假!' : '多走动',
        noteColor2: chinaDay === 5 ? '#fef08a' : '#fecaca',
        textColor2: chinaDay === 5 ? '#854d0e' : '#991b1b',
        pinColor2: '#eab308' },
    ];

    const set = noticeSets[cycleIndex];

    // 便利贴微微晃动动画 — 模拟被风吹的感觉
    const wobble1 = Math.sin(t * 1.2) * 0.5;
    const wobble2 = Math.cos(t * 0.9) * 0.5;

    // 📝 便利贴1
    c.fillStyle = set.noteColor;
    c.fillRect(x + 4 + wobble1, y + 5, 8, 6);
    c.fillStyle = set.textColor;
    c.font = '3px monospace';
    c.textAlign = 'left';
    c.fillText(set.title, x + 5 + wobble1, y + 8);
    c.font = '2px monospace';
    c.fillText(set.content, x + 5 + wobble1, y + 10);
    // 图钉
    c.fillStyle = set.pinColor;
    c.beginPath();
    c.arc(x + 8, y + 4, 1.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.arc(x + 8, y + 4, 0.8, 0, Math.PI * 2);
    c.fill();

    // 📝 便利贴2
    c.fillStyle = set.noteColor2;
    c.fillRect(x + 16 + wobble2, y + 5, 8, 6);
    c.fillStyle = set.textColor2;
    c.font = '3px monospace';
    c.fillText(set.title2, x + 17 + wobble2, y + 8);
    c.font = '2px monospace';
    c.fillText(set.content2, x + 17 + wobble2, y + 10);
    // 图钉
    c.fillStyle = set.pinColor2;
    c.beginPath();
    c.arc(x + 20, y + 4, 1.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.3)';

    // 📝 便利贴3：绿色 — 外卖拼单
    c.fillStyle = '#86efac';
    c.fillRect(x + 6, y + 18, 10, 7);
    c.fillStyle = '#166534';
    c.font = '3px monospace';
    c.fillText('拼奶茶!', x + 7, y + 21);
    c.font = '2px monospace';
    c.fillText('满30减15', x + 7, y + 24);
    // 图钉
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.arc(x + 11, y + 17, 1.5, 0, Math.PI * 2);
    c.fill();

    // 📝 便利贴4：蓝色 — WiFi密码
    c.fillStyle = '#93c5fd';
    c.fillRect(x + 20, y + 16, 8, 8);
    c.fillStyle = '#1e3a5f';
    c.font = '2px monospace';
    c.fillText('WiFi:', x + 21, y + 19);
    c.fillText('office', x + 21, y + 21);
    c.fillText('5G', x + 21, y + 23);
    // 图钉
    c.fillStyle = '#a855f7';
    c.beginPath();
    c.arc(x + 24, y + 15, 1.5, 0, Math.PI * 2);
    c.fill();

    // 📋 打印的A4纸 — 公司制度（白色，比便利贴大）
    c.fillStyle = '#f0f0f0';
    c.fillRect(x + 14, y + 14, 12, 10);
    c.strokeStyle = '#ddd';
    c.lineWidth = 0.5;
    c.strokeRect(x + 14, y + 14, 12, 10);
    c.fillStyle = '#333';
    c.font = 'bold 2.5px monospace';
    c.fillText('考勤制度', x + 15, y + 17);
    c.fillStyle = '#666';
    c.font = '2px monospace';
    c.fillText('9:00-18:00', x + 15, y + 19.5);
    c.fillText('弹性±30min', x + 15, y + 21.5);
    c.fillText('迟到扣50💰', x + 15, y + 23.5);
    // 胶带固定效果
    c.fillStyle = 'rgba(200,200,200,0.6)';
    c.fillRect(x + 18, y + 13, 4, 2);
  }

  // ============================================
  // 🥤 自动售货机 — 打工人的续命补给站
  // ============================================
  private drawVendingMachine(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 机身 — 深蓝金属外壳
    c.fillStyle = '#1a3a5e';
    c.fillRect(x + 2, y + 1, ts - 4, ts - 2);
    c.fillStyle = '#1e4472';
    c.fillRect(x + 3, y + 2, ts - 6, ts - 4);

    // 顶部品牌标识
    c.fillStyle = '#e94560';
    c.fillRect(x + 4, y + 3, ts - 8, 4);
    c.fillStyle = '#fff';
    c.font = `bold ${Math.max(5, ts - 18)}px monospace`;
    c.textAlign = 'center';
    c.fillText('VEND', x + ts / 2, y + 7);

    // 🪟 展示玻璃窗 — 看到里面满满的饮料零食
    c.fillStyle = '#0a1628';
    c.fillRect(x + 4, y + 9, ts - 8, ts - 18);
    // 玻璃反光效果
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(x + 5, y + 10, ts / 3 - 2, ts - 20);

    // 螺旋货架 — 3 层，每层 3 个商品
    const shelfColors = [
      // 第一层：饮料（瓶状）
      ['#3498db', '#2ecc71', '#e74c3c'],
      // 第二层：能量饮料/咖啡（罐状）
      ['#f39c12', '#e74c3c', '#9b59b6'],
      // 第三层：零食（袋状）
      ['#e67e22', '#1abc9c', '#f1c40f'],
    ];
    for (let row = 0; row < 3; row++) {
      const shelfY = y + 10 + row * 5;
      // 货架隔板
      c.fillStyle = '#555';
      c.fillRect(x + 5, shelfY + 4, ts - 10, 1);
      for (let col = 0; col < 3; col++) {
        const itemX = x + 6 + col * 7;
        const color = shelfColors[row][col];
        // 商品闪烁灯光效果
        const glow = 0.7 + Math.sin(t * 2 + row * 3 + col * 7) * 0.3;
        c.fillStyle = color;
        if (row === 0) {
          // 瓶装饮料
          c.fillRect(itemX, shelfY, 3, 4);
          c.fillStyle = `rgba(255,255,255,${glow * 0.3})`;
          c.fillRect(itemX, shelfY, 1, 4); // 瓶身高光
        } else if (row === 1) {
          // 罐装饮料
          c.fillRect(itemX, shelfY + 1, 4, 3);
          c.fillStyle = `rgba(255,255,255,${glow * 0.3})`;
          c.fillRect(itemX + 1, shelfY + 1, 1, 3);
        } else {
          // 袋装零食
          c.fillRect(itemX, shelfY, 5, 4);
          // 包装标签
          c.fillStyle = `rgba(255,255,255,${glow * 0.4})`;
          c.fillRect(itemX + 1, shelfY + 1, 3, 1);
        }
      }
    }

    // 🎛️ 操作面板 — 按钮 + 投币口
    const panelY = y + ts - 10;
    c.fillStyle = '#2c3e50';
    c.fillRect(x + 4, panelY, ts - 8, 7);
    // 选择按钮 — 3x2 排列
    for (let r = 0; r < 2; r++) {
      for (let cl = 0; cl < 3; cl++) {
        const bx = x + 5 + cl * 6;
        const by = panelY + 1 + r * 3;
        c.fillStyle = '#34495e';
        c.fillRect(bx, by, 4, 2);
        // 按钮 LED 指示灯
        c.fillStyle = Math.sin(t * 3 + r * 5 + cl * 3) > 0 ? '#2ecc71' : '#27ae60';
        c.fillRect(bx + 1, by, 1, 1);
      }
    }
    // 投币口
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + ts - 10, panelY + 1, 3, 4);
    c.fillStyle = '#555';
    c.fillRect(x + ts - 9, panelY + 2, 1, 2);

    // 取货口
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 4, y + ts - 4, ts - 8, 3);
    // 取货口挡板（微微晃动，像被风吹动）
    const flapSway = Math.sin(t * 1.5) * 0.5;
    c.fillStyle = '#333';
    c.fillRect(x + 5 + flapSway, y + ts - 4, ts - 10, 1);

    // LED 运行灯 — 底部灯带
    const ledHue = (t * 30) % 360;
    c.fillStyle = `hsla(${ledHue}, 80%, 60%, 0.15)`;
    c.fillRect(x + 2, y + 1, ts - 4, 2);
  }

  // ============================================
  // 📞 电话亭 — 透明玻璃小隔间，接私人电话/面试专用
  // ============================================
  private drawPhoneBooth(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 底座 — 深色地板
    c.fillStyle = '#1e2e3e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    c.fillStyle = '#2a3a4e';
    c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    // 玻璃墙 — 半透明蓝色
    const glassAlpha = 0.2 + Math.sin(t * 0.5) * 0.05;
    c.fillStyle = `rgba(90,184,232,${glassAlpha})`;
    c.fillRect(x + 3, y + 3, ts - 6, ts - 6);
    // 玻璃边框 — 银色金属
    c.strokeStyle = '#8ab4d8';
    c.lineWidth = 1;
    c.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
    // 门缝 — 右边有一条垂直缝隙，像真实的玻璃门
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(x + ts - 6, y + 4, 1, ts - 8);
    // 门把手 — 小圆点
    c.fillStyle = '#ccc';
    c.beginPath();
    c.arc(x + ts - 8, y + ts / 2, 1.5, 0, Math.PI * 2);
    c.fill();
    // 📞 内部电话 — 经典壁挂式电话机
    c.fillStyle = '#2c2c2c';
    c.fillRect(x + ts / 2 - 3, y + ts / 3 - 2, 6, 5); // 电话机身
    c.fillStyle = '#444';
    c.fillRect(x + ts / 2 - 2, y + ts / 3 - 1, 4, 3); // 电话面板
    // 听筒 — 横放在电话机上
    c.fillStyle = '#333';
    c.fillRect(x + ts / 2 - 5, y + ts / 3 - 3, 10, 2); // 听筒横杆
    c.fillStyle = '#222';
    c.fillRect(x + ts / 2 - 6, y + ts / 3 - 4, 4, 2); // 听筒左端
    c.fillRect(x + ts / 2 + 2, y + ts / 3 - 4, 4, 2); // 听筒右端
    // 电话线 — 螺旋状（简化为曲线）
    c.strokeStyle = '#555';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + ts / 2 - 3, y + ts / 3);
    c.quadraticCurveTo(x + ts / 2 - 5, y + ts / 2, x + ts / 2 - 2, y + ts * 2 / 3);
    c.stroke();
    // "使用中" 指示灯 — 有人在打电话时亮起
    const inUse = Math.sin(t * 0.7) > 0.3;
    c.fillStyle = inUse ? '#e94560' : '#2ecc71';
    c.fillRect(x + ts / 2 - 1, y + 4, 3, 2);
    // 顶部标识
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.font = `bold ${Math.max(5, ts - 20)}px monospace`;
    c.textAlign = 'center';
    c.fillText('📞', x + ts / 2, y + ts - 1);
    // 玻璃反光 — 偶尔有高光闪过
    const glare = Math.sin(t * 1.2 + x * 0.1);
    if (glare > 0.7) {
      c.fillStyle = `rgba(255,255,255,${(glare - 0.7) * 0.8})`;
      c.fillRect(x + 4, y + 4, ts / 3, ts / 4);
    }
  }

  // ============================================
  // 🖥️ 服务器机房 — 真实科技公司标配
  // ============================================

  // 服务器机柜 — 带闪烁LED指示灯
  private drawServerRack(x: number, y: number, ts: number, t: number, tx: number, _ty: number): void {
    const c = this.ctx;

    // 机柜外壳 — 深灰色金属
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 2, y + 1, ts - 4, ts - 2);
    c.fillStyle = '#222240';
    c.fillRect(x + 3, y + 2, ts - 6, ts - 4);

    // 服务器单元 — 4U 高度，每个单元有 LED
    const unitH = (ts - 8) / 4;
    const ledColors = ['#00ff88', '#00ccff', '#ff4444', '#ffaa00', '#00ff88', '#00ccff'];

    for (let u = 0; u < 4; u++) {
      const uy = y + 3 + u * unitH;
      // 服务器面板
      c.fillStyle = '#2a2a44';
      c.fillRect(x + 4, uy, ts - 8, unitH - 1);
      // 面板高光
      c.fillStyle = '#333355';
      c.fillRect(x + 5, uy + 1, ts - 12, unitH - 3);

      // LED 指示灯 — 每个单元 3 个，不同闪烁频率
      for (let led = 0; led < 3; led++) {
        const ledX = x + 6 + led * 5;
        const colorIdx = (tx * 3 + u * 7 + led * 13) % ledColors.length;
        const blinkSpeed = 1 + led * 0.7 + u * 0.3;
        const isOn = Math.sin(t * blinkSpeed + tx + u + led) > -0.3;
        c.fillStyle = isOn ? ledColors[colorIdx] : '#1a1a2e';
        c.fillRect(ledX, uy + 1, 3, 3);
        // LED 发光效果
        if (isOn) {
          c.fillStyle = ledColors[colorIdx] + '40';
          c.fillRect(ledX - 1, uy, 5, 5);
        }
      }

      // 散热孔 — 右侧小条纹
      c.fillStyle = '#1a1a2e';
      for (let v = 0; v < 3; v++) {
        c.fillRect(x + ts - 8, uy + 1 + v * 2, 3, 1);
      }
    }

    // 机柜顶部标签
    c.fillStyle = '#555';
    c.fillRect(x + 4, y + 1, ts - 8, 2);
    // 机柜编号
    c.fillStyle = '#888';
    c.font = `bold ${Math.max(5, ts - 22)}px monospace`;
    c.textAlign = 'center';
    const rackLabels = ['A1', 'A2', 'B1', 'B2'];
    c.fillText(rackLabels[(tx * 3 + 1) % rackLabels.length], x + ts / 2, y + ts - 1);
  }

  // 机房玻璃隔断 — 半透明，能看到里面的服务器灯光
  private drawServerRoomGlass(x: number, y: number, ts: number, t: number, tx: number, ty: number): void {
    const c = this.ctx;

    // 玻璃底色 — 深蓝半透明
    c.fillStyle = 'rgba(15,25,45,0.85)';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 玻璃框 — 银色金属边框
    c.strokeStyle = '#4a6a8a';
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 玻璃反射 — 偶尔有高光闪过
    const glare = Math.sin(t * 0.8 + tx * 0.5) * 0.5 + 0.5;
    if (glare > 0.7) {
      c.fillStyle = `rgba(255,255,255,${(glare - 0.7) * 0.3})`;
      c.fillRect(x + 3, y + 3, ts / 3, ts / 4);
    }

    // 透过玻璃看到的服务器 LED 灯光 — 模糊的彩色光点
    const ledGlows = [
      { cx: x + ts / 3, cy: y + ts / 3, color: '#00ff88' },
      { cx: x + ts * 2 / 3, cy: y + ts / 3, color: '#00ccff' },
      { cx: x + ts / 3, cy: y + ts * 2 / 3, color: '#ffaa00' },
      { cx: x + ts * 2 / 3, cy: y + ts * 2 / 3, color: '#00ff88' },
    ];

    for (const led of ledGlows) {
      const pulse = Math.sin(t * 2 + led.cx + led.cy) * 0.5 + 0.5;
      const radius = 3 + pulse * 2;
      // 发光效果
      const gradient = c.createRadialGradient(led.cx, led.cy, 0, led.cx, led.cy, radius * 2);
      gradient.addColorStop(0, led.color + Math.floor(pulse * 60).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, led.color + '00');
      c.fillStyle = gradient;
      c.fillRect(led.cx - radius * 2, led.cy - radius * 2, radius * 4, radius * 4);
      // 核心亮点
      c.fillStyle = led.color;
      c.fillRect(led.cx - 1, led.cy - 1, 2, 2);
    }

    // "SERVER ROOM" 标识
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.font = `bold ${Math.max(5, ts - 20)}px monospace`;
    c.textAlign = 'center';
    c.fillText('🔒 SERVER', x + ts / 2, y + ts / 2 + 2);
  }

  // 🏷️ 团队分区地面标识 — 像真实办公室的团队名牌
  private drawZoneLabel(x: number, y: number, ts: number, t: number, tx: number, _ty: number): void {
    const c = this.ctx;

    // 地面标识底色 — 与地毯略有区别的彩色区域
    const zoneConfigs = [
      { bg: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.5)', text: '前端组', sub: 'FRONTEND', emoji: '🎨' },
      { bg: 'rgba(34,197,94,0.25)', border: 'rgba(34,197,94,0.5)', text: '后端组', sub: 'BACKEND', emoji: '⚙️' },
    ];

    const config = zoneConfigs[tx % zoneConfigs.length];

    // 标识区域 — 圆角矩形
    const padding = 2;
    c.fillStyle = config.bg;
    c.fillRect(x + padding, y + padding, ts - padding * 2, ts - padding * 2);

    // 边框 — 虚线效果（像地面的划线标识）
    c.strokeStyle = config.border;
    c.lineWidth = 1;
    c.setLineDash([3, 2]);
    c.strokeRect(x + padding, y + padding, ts - padding * 2, ts - padding * 2);
    c.setLineDash([]);

    // 团队 emoji
    c.font = `${Math.max(8, ts - 14)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText(config.emoji, x + ts / 2, y + ts / 2 + 2);

    // 中文团队名
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.font = `bold ${Math.max(5, ts - 18)}px sans-serif`;
    c.fillText(config.text, x + ts / 2, y + ts - 3);

    // 英文副标题
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.font = `${Math.max(4, ts - 20)}px monospace`;
    c.fillText(config.sub, x + ts / 2, y + 7);
  }

  // ============================================
  // 🏖️ 请假牌 — 工位上放着「请假中」的小牌子
  // ============================================
  private drawAbsentSign(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    // 小牌子底座
    c.fillStyle = '#8b6914';
    c.fillRect(x + ts / 2 - 7, y + ts / 2 + 2, 14, 8);
    c.fillStyle = '#a07820';
    c.fillRect(x + ts / 2 - 6, y + ts / 2 + 3, 12, 6);
    // 牌子正面（白色卡片）
    c.fillStyle = '#f0f0f0';
    c.fillRect(x + ts / 2 - 5, y + ts / 2 - 8, 10, 12);
    c.fillStyle = '#fff';
    c.fillRect(x + ts / 2 - 4, y + ts / 2 - 7, 8, 10);
    // 红色「请假」文字
    c.fillStyle = '#e94560';
    c.font = `bold ${Math.max(5, ts - 16)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('请假', x + ts / 2, y + ts / 2 + 1);
    // 小图标
    c.fillStyle = '#94a3b8';
    c.font = `${Math.max(4, ts - 18)}px sans-serif`;
    c.fillText('🏖️', x + ts / 2, y + ts / 2 - 2);
    // 闪烁效果（吸引注意）
    if (Math.sin(t * 3) > 0.7) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(x + ts / 2 - 3, y + ts / 2 - 6, 6, 2);
    }
  }

  // ============================================
  // 🍽️ 午餐桌 — 走廊地毯区的实木餐桌，午休时大家围坐吃饭
  // ============================================
  private drawLunchTable(x: number, y: number, ts: number, t: number, tx: number, ty: number): void {
    const c = this.ctx;
    // 实木桌面 — 暖色木纹
    c.fillStyle = '#6b4423';
    c.fillRect(x + 2, y + 4, ts - 4, ts - 8);
    c.fillStyle = '#7a5530';
    c.fillRect(x + 3, y + 5, ts - 6, ts - 10);
    // 木纹纹理
    c.strokeStyle = 'rgba(139,90,43,0.3)';
    c.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(x + 4, y + 8 + i * 5);
      c.lineTo(x + ts - 4, y + 8 + i * 5);
      c.stroke();
    }
    // 桌腿
    c.fillStyle = '#5a3a18';
    c.fillRect(x + 3, y + ts - 6, 3, 4);
    c.fillRect(x + ts - 6, y + ts - 6, 3, 4);

    // 🪑 四把餐椅 — 围绕桌子，升级版：人体工学餐椅
    const map = this.tileMap;
    const isNeighbor = (dx: number, dy: number): boolean => {
      const nx = tx + dx, ny = ty + dy;
      return ny >= 0 && ny < map.height && nx >= 0 && nx < map.width && map.tiles[ny][nx] === TileType.LunchTable;
    };
    const drawDiningChair = (cx: number, cy: number, facing: 'up' | 'down' | 'left' | 'right') => {
      // 椅腿 — 四根实木腿
      c.fillStyle = '#5c3a1e';
      c.fillRect(cx - 4, cy - 1, 1.5, 5);
      c.fillRect(cx + 2.5, cy - 1, 1.5, 5);
      // 椅腿横撑 — 连接腿的横梁
      c.fillStyle = '#4a2e15';
      c.fillRect(cx - 4, cy + 1, 8, 1);
      // 坐垫 — 皮革软垫
      c.fillStyle = '#c0392b';
      c.fillRect(cx - 5, cy - 3, 10, 6);
      c.fillStyle = '#e74c3c';
      c.fillRect(cx - 4, cy - 2, 8, 4);
      // 坐垫高光 — 模拟皮革反光
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(cx - 3, cy - 1, 3, 1);
      // 靠背 — 弧形人体工学靠背
      c.fillStyle = '#5c3a1e';
      if (facing === 'up') {
        // 靠背在下方，弧形朝向座位
        c.fillRect(cx - 5, cy + 3, 10, 3);
        c.fillStyle = '#6b4423';
        c.fillRect(cx - 4, cy + 3, 8, 1);
        // 靠背顶部圆角
        c.fillStyle = '#7a5530';
        c.fillRect(cx - 4, cy + 5, 1, 1);
        c.fillRect(cx + 3, cy + 5, 1, 1);
      } else if (facing === 'down') {
        // 靠背在上方
        c.fillRect(cx - 5, cy - 6, 10, 3);
        c.fillStyle = '#6b4423';
        c.fillRect(cx - 4, cy - 6, 8, 1);
        c.fillStyle = '#7a5530';
        c.fillRect(cx - 4, cy - 7, 1, 1);
        c.fillRect(cx + 3, cy - 7, 1, 1);
      } else if (facing === 'left') {
        // 靠背在右侧
        c.fillRect(cx + 4, cy - 4, 3, 8);
        c.fillStyle = '#6b4423';
        c.fillRect(cx + 4, cy - 3, 1, 6);
        c.fillStyle = '#7a5530';
        c.fillRect(cx + 6, cy - 3, 1, 1);
        c.fillRect(cx + 6, cy + 2, 1, 1);
      } else {
        // 靠背在左侧
        c.fillRect(cx - 7, cy - 4, 3, 8);
        c.fillStyle = '#6b4423';
        c.fillRect(cx - 5, cy - 3, 1, 6);
        c.fillStyle = '#7a5530';
        c.fillRect(cx - 7, cy - 3, 1, 1);
        c.fillRect(cx - 7, cy + 2, 1, 1);
      }
    };

    // 四把椅子，靠背朝外
    if (!isNeighbor(0, -1)) drawDiningChair(x + ts / 2, y + 3, 'up');
    if (!isNeighbor(0, 1)) drawDiningChair(x + ts / 2, y + ts - 4, 'down');
    if (!isNeighbor(-1, 0)) drawDiningChair(x + 3, y + ts / 2, 'left');
    if (!isNeighbor(1, 0)) drawDiningChair(x + ts - 3, y + ts / 2, 'right');

    // 🍱 桌上食物 — 随机午餐盒
    const lunchBoxes = [
      { color: '#e74c3c', label: '🍱' },
      { color: '#f39c12', label: '🥡' },
      { color: '#2ecc71', label: '🍜' },
      { color: '#3498db', label: '🥗' },
    ];
    const box = lunchBoxes[(tx * 3 + ty * 7) % lunchBoxes.length];
    // 餐盒
    c.fillStyle = box.color;
    c.fillRect(x + ts / 2 - 6, y + ts / 2 - 3, 5, 5);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(x + ts / 2 - 5, y + ts / 2 - 2, 3, 3);
    // 筷子
    c.fillStyle = '#8b6914';
    c.fillRect(x + ts / 2 + 1, y + ts / 2 - 4, 1, 7);
    c.fillRect(x + ts / 2 + 3, y + ts / 2 - 3, 1, 7);
    // 饮料杯
    c.fillStyle = '#e94560';
    c.fillRect(x + ts / 2 + 5, y + ts / 2 - 2, 4, 5);
    c.fillStyle = '#f0f0f0';
    c.fillRect(x + ts / 2 + 5, y + ts / 2 - 3, 4, 2);
    // 吸管
    c.fillStyle = '#3498db';
    c.fillRect(x + ts / 2 + 6, y + ts / 2 - 6, 1, 4);

    // 🌿 桌中间小盆栽
    c.fillStyle = '#8b6914';
    c.fillRect(x + ts / 2 - 2, y + ts / 2 + 2, 4, 3);
    c.fillStyle = '#4aaa3a';
    const sw = Math.sin(t * 1.5) * 0.5;
    c.fillRect(x + ts / 2 - 1 + sw, y + ts / 2 - 2, 2, 4);
    c.fillStyle = '#5abb4a';
    c.fillRect(x + ts / 2 - 3 + sw, y + ts / 2 - 1, 2, 2);
    c.fillRect(x + ts / 2 + 1 + sw, y + ts / 2, 2, 2);

    // 热气 — 饭菜冒着热气
    if (Math.sin(t * 2 + tx) > 0.3) {
      c.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 3; i++) {
        const sx = x + ts / 2 - 3 + i * 3 + Math.sin(t * 2 + i) * 2;
        const sy = y + ts / 2 - 6 - i * 2;
        c.fillRect(sx, sy, 2, 2);
      }
    }
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
  // 🛵 外卖员 — 前台等外卖来拿，戴头盔拎袋子
  // ============================================
  private drawDeliveryPerson(dp: { x: number; y: number; timer: number; bags: number }, ts: number, time: number): void {
    const c = this.ctx;
    const px = dp.x * ts + ts / 2;
    const py = dp.y * ts + ts / 2;
    const s = ts * 0.7;
    const bob = Math.sin(time * 2) * 1; // 轻微晃动（等得不耐烦）

    // 阴影
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(px, py + s * 0.5, s * 0.35, s * 0.1, 0, 0, Math.PI * 2);
    c.fill();

    // 腿
    c.fillStyle = '#2c3e50';
    c.fillRect(px - s * 0.12, py + s * 0.15, s * 0.1, s * 0.3);
    c.fillRect(px + s * 0.02, py + s * 0.15, s * 0.1, s * 0.3);
    // 鞋子
    c.fillStyle = '#1a1a1a';
    c.fillRect(px - s * 0.15, py + s * 0.4, s * 0.15, s * 0.06);
    c.fillRect(px + s * 0.0, py + s * 0.4, s * 0.15, s * 0.06);

    // 身体 — 外卖员制服（黄色）
    c.fillStyle = '#f39c12';
    c.fillRect(px - s * 0.22, py - s * 0.15, s * 0.44, s * 0.35);
    // 制服logo
    c.fillStyle = '#e74c3c';
    c.fillRect(px - s * 0.05, py - s * 0.05, s * 0.1, s * 0.08);

    // 手臂
    c.fillStyle = '#f39c12';
    const armSwing = Math.sin(time * 3) * 1;
    c.fillRect(px - s * 0.3, py - s * 0.1 + armSwing, s * 0.1, s * 0.25);
    c.fillRect(px + s * 0.2, py - s * 0.1 - armSwing, s * 0.1, s * 0.25);
    // 手
    c.fillStyle = '#e8c39e';
    c.fillRect(px - s * 0.3, py + s * 0.12 + armSwing, s * 0.1, s * 0.08);
    c.fillRect(px + s * 0.2, py + s * 0.12 - armSwing, s * 0.1, s * 0.08);

    // 外卖袋 — 手里拎着的袋子
    const bagColors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    for (let i = 0; i < dp.bags; i++) {
      const bagX = px + s * 0.22 + i * s * 0.12;
      const bagY = py + s * 0.15 - armSwing + Math.sin(time * 4 + i) * 1;
      c.fillStyle = bagColors[i % bagColors.length];
      c.fillRect(bagX, bagY, s * 0.1, s * 0.12);
      // 袋子提手
      c.strokeStyle = '#333';
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(bagX + s * 0.02, bagY);
      c.lineTo(bagX + s * 0.05, bagY - s * 0.05);
      c.lineTo(bagX + s * 0.08, bagY);
      c.stroke();
    }

    // 头
    c.fillStyle = '#e8c39e';
    c.fillRect(px - s * 0.16, py - s * 0.45 + bob, s * 0.32, s * 0.3);

    // 头盔 — 外卖员标志性黄色头盔
    c.fillStyle = '#f1c40f';
    c.fillRect(px - s * 0.2, py - s * 0.52 + bob, s * 0.4, s * 0.14);
    c.fillRect(px - s * 0.18, py - s * 0.5 + bob, s * 0.04, s * 0.08);
    c.fillRect(px + s * 0.14, py - s * 0.5 + bob, s * 0.04, s * 0.08);
    // 头盔面罩
    c.fillStyle = 'rgba(52,152,219,0.3)';
    c.fillRect(px - s * 0.14, py - s * 0.42 + bob, s * 0.28, s * 0.06);

    // 眼睛
    c.fillStyle = '#1a1a2e';
    c.fillRect(px - s * 0.08, py - s * 0.32 + bob, s * 0.05, s * 0.05);
    c.fillRect(px + s * 0.03, py - s * 0.32 + bob, s * 0.05, s * 0.05);

    // 嘴巴 — 等得不耐烦
    if (dp.timer < 30) {
      c.fillStyle = '#8b4513';
      c.fillRect(px - s * 0.05, py - s * 0.18 + bob, s * 0.1, s * 0.03);
    } else {
      c.fillStyle = '#8b4513';
      c.fillRect(px - s * 0.04, py - s * 0.18 + bob, s * 0.08, s * 0.03);
    }

    // 标签
    c.fillStyle = '#f39c12';
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    c.fillText('🛵 外卖', px, py - s * 0.58 + bob);

    // 等待倒计时
    if (dp.timer > 40) {
      const flash = Math.sin(time * 6) > 0 ? 1 : 0.4;
      c.fillStyle = `rgba(231,76,60,${flash})`;
      c.font = '5px monospace';
      c.fillText(`⏱️ ${Math.ceil(60 - dp.timer)}s`, px, py - s * 0.68 + bob);
    }
  }

  // ============================================
  // Agent Drawing
  // ============================================
  private drawAgent(a: Agent, ts: number, time: number): void {
    const ctx = this.ctx;
    const px = a.x * ts + ts / 2, py = a.y * ts + ts / 2 + a.bobOffset;
    SpriteRenderer.drawAgent(ctx, px, py, a.config.role, a.state, a.animFrame, a.facing, time);
    // 🎒 手持物品 — 咖啡杯/奶茶/外卖盒/笔记本/公文包
    const p = Math.max(1, Math.floor(2));
    const ox = px - 8 * p;
    const oy = py - 12 * p;
    SpriteRenderer.drawCarriedItem(ctx, px, py, a.carriedItem, p, ox, oy, time, a.facing);
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.config.name, px, py + ts / 2 + 10);
    const emoji: Record<string, string> = { idle: '😴', walking: '🚶', typing: '⌨️', reading: '📖', waiting: '⏳', error: '❌', fetching_task: '📋', '摸鱼中': '🐟', '趴桌睡觉': '😴', '打游戏中': '🎮' };
    ctx.font = '10px sans-serif';
    ctx.fillText(emoji[a.state] || '', px, py - ts / 2 - 8);
    if (a.currentTask) {
      const te = a.taskWorkflow === 'working_on_task' ? '💻' : a.taskWorkflow === 'walking_to_complete' ? '✅' : '📋';
      ctx.font = '8px monospace'; ctx.fillStyle = '#a5b4fc'; ctx.textAlign = 'center';
      ctx.fillText(`${te} ${a.currentTask.title}`, px, py - ts / 2 - 20);
    }
    if (a.speechBubble) this.drawSpeechBubble(px, py - ts / 2 - 12, a.speechBubble);
    // 🧋 桌上的奶茶杯 — 点过奶茶后桌上会有杯子，持续一段时间
    if (a.drinkOnDesk && a.drinkOnDeskTimer > 0) {
      const cupFade = Math.min(1, a.drinkOnDeskTimer / 10); // 最后10秒淡出
      ctx.globalAlpha = cupFade;
      ctx.font = '12px sans-serif';
      ctx.fillText('🧋', px + ts * 0.25, py + ts * 0.15);
      ctx.globalAlpha = 1;
    }
    // ☂️ 雨天拿伞 — 拿过伞的 agent 头顶显示小伞
    if (a.hasUmbrella) {
      const umbrellaBob = Math.sin(time * 2) * 1; // 轻微晃动
      ctx.font = '11px sans-serif';
      ctx.fillText('☂️', px + ts * 0.3, py - ts / 2 - 8 + umbrellaBob);
    }
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
    // 📊 动态亮度 — 人越少办公室越暗
    const activityDimmer = 0.4 + this.activityLevel * 0.6; // 0.4 (空办公室) ~ 1.0 (满员)
    // 🌙 周末安静模式 — 办公室灯光调暗到 30%，营造周末空荡荡的感觉
    const isWeekend = this.weekendOvertimeDesks.size > 0;
    const weekendDimmer = isWeekend ? 0.3 : 1.0;
    const effectiveDimmer = activityDimmer * weekendDimmer;
    // Night overlay
    if (atm.overlayAlpha > 0) {
      ctx.fillStyle = atm.overlayColor;
      ctx.globalAlpha = atm.overlayAlpha * (1 + (1 - effectiveDimmer) * 0.3); // 人少时夜间更暗
      ctx.fillRect(0, 0, this.tileMap.width * ts, this.tileMap.height * ts);
      ctx.globalAlpha = 1;
    }
    // Lamp glows — 亮度根据活跃度调整，周末大幅降低
    const lampIntensity = (atm.ambientBrightness < 0.5 ? 0.12 : 0.04) * effectiveDimmer;
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const t = this.tileMap.tiles[y][x];
        if (t === TileType.Lamp) {
          const cx = x * ts + ts / 2, cy = y * ts + ts, r = ts * 3;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          // 人少时灯光更暖更暗，人多时更亮更白
          const warmth = 1 - this.activityLevel * 0.3; // 人少偏暖色
          const r2 = Math.floor(255 * warmth);
          const g2 = Math.floor(220 * warmth);
          const b2 = Math.floor(100 * (1 - (1 - warmth) * 0.5));
          g.addColorStop(0, `rgba(${r2},${g2},${b2},${lampIntensity + Math.sin(time * 2 + x) * 0.02})`);
          g.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
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

  // ➡️ 地面导向箭头 — 地毯上的方向指示，真实办公室标配
  private drawFloorArrow(x: number, y: number, ts: number, t: number, tx: number, ty: number): void {
    const c = this.ctx;
    // 先画地毯底色（和 Carpet 一致）
    c.fillStyle = '#2e2e4e';
    c.fillRect(x, y, ts, ts);

    // 箭头方向根据位置决定
    // 走廊中部(8,8) → 指向右（茶水间/卫生间方向）
    // 走廊中部(9,8) → 指向上（办公区方向）
    // 走廊(8,9) → 指向下（电梯方向）
    // 走廊(9,9) → 指向左（休息区方向）
    const arrowDir = (tx + ty * 3) % 4; // 0=右, 1=上, 2=下, 3=左

    const arrowColors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
    const arrowLabels = ['🚻 茶水间 →', '⬆️ 办公区', '⬇️ 电梯', '🛋️ 休息区'];
    const color = arrowColors[arrowDir];

    // 箭头主体 — 黄色/彩色箭头
    const cx = x + ts / 2;
    const cy = y + ts / 2;

    c.fillStyle = color;
    c.strokeStyle = color;
    c.lineWidth = 2;

    if (arrowDir === 0) {
      // → 向右箭头
      c.beginPath();
      c.moveTo(x + ts * 0.75, cy);
      c.lineTo(x + ts * 0.45, cy - ts * 0.2);
      c.lineTo(x + ts * 0.45, cy - ts * 0.08);
      c.lineTo(x + ts * 0.2, cy - ts * 0.08);
      c.lineTo(x + ts * 0.2, cy + ts * 0.08);
      c.lineTo(x + ts * 0.45, cy + ts * 0.08);
      c.lineTo(x + ts * 0.45, cy + ts * 0.2);
      c.closePath();
      c.fill();
    } else if (arrowDir === 1) {
      // ↑ 向上箭头
      c.beginPath();
      c.moveTo(cx, y + ts * 0.25);
      c.lineTo(cx - ts * 0.2, y + ts * 0.55);
      c.lineTo(cx - ts * 0.08, y + ts * 0.55);
      c.lineTo(cx - ts * 0.08, y + ts * 0.8);
      c.lineTo(cx + ts * 0.08, y + ts * 0.8);
      c.lineTo(cx + ts * 0.08, y + ts * 0.55);
      c.lineTo(cx + ts * 0.2, y + ts * 0.55);
      c.closePath();
      c.fill();
    } else if (arrowDir === 2) {
      // ↓ 向下箭头
      c.beginPath();
      c.moveTo(cx, y + ts * 0.75);
      c.lineTo(cx - ts * 0.2, y + ts * 0.45);
      c.lineTo(cx - ts * 0.08, y + ts * 0.45);
      c.lineTo(cx - ts * 0.08, y + ts * 0.2);
      c.lineTo(cx + ts * 0.08, y + ts * 0.2);
      c.lineTo(cx + ts * 0.08, y + ts * 0.45);
      c.lineTo(cx + ts * 0.2, y + ts * 0.45);
      c.closePath();
      c.fill();
    } else {
      // ← 向左箭头
      c.beginPath();
      c.moveTo(x + ts * 0.25, cy);
      c.lineTo(x + ts * 0.55, cy - ts * 0.2);
      c.lineTo(x + ts * 0.55, cy - ts * 0.08);
      c.lineTo(x + ts * 0.8, cy - ts * 0.08);
      c.lineTo(x + ts * 0.8, cy + ts * 0.08);
      c.lineTo(x + ts * 0.55, cy + ts * 0.08);
      c.lineTo(x + ts * 0.55, cy + ts * 0.2);
      c.closePath();
      c.fill();
    }

    // 箭头方向标签 — 小字说明
    const label = arrowLabels[arrowDir];
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.font = `${Math.max(5, ts - 22)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText(label, cx, y + ts - 2);

    // 微弱呼吸光效 — 让箭头在远处也能看到
    const glow = Math.sin(t * 2 + tx + ty) * 0.1 + 0.15;
    c.fillStyle = color + Math.floor(glow * 255).toString(16).padStart(2, '0');
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);
  }

  // 📺 休息区壁挂电视 — 挂在墙上的大屏幕，播放动态内容
  private drawWallTV(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;

    // 电视外框 — 黑色窄边框
    c.fillStyle = '#111';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 屏幕 — 深色背景
    const screenX = x + 3;
    const screenY = y + 3;
    const screenW = ts - 6;
    const screenH = ts - 6;
    c.fillStyle = '#0a0a1a';
    c.fillRect(screenX, screenY, screenW, screenH);

    // 屏幕内容 — 动态切换
    const contentPhase = Math.floor(t / 6) % 4; // 每 6 秒切换内容

    if (contentPhase === 0) {
      // 📰 新闻滚动条 — 模拟新闻频道
      const scrollX = ((t * 15) % (screenW + 40)) - 20;
      // 蓝色新闻条
      c.fillStyle = '#1a3a6a';
      c.fillRect(screenX, screenY + screenH * 0.3, screenW, screenH * 0.35);
      // 红色 breaking news
      c.fillStyle = '#c0392b';
      c.fillRect(screenX, screenY + screenH * 0.3, screenW * 0.25, screenH * 0.12);
      c.fillStyle = '#fff';
      c.font = `bold ${Math.max(4, screenH * 0.12)}px monospace`;
      c.textAlign = 'left';
      c.fillText('BREAKING', screenX + 2, screenY + screenH * 0.42);
      // 滚动文字
      c.fillStyle = '#e0e0e0';
      c.font = `${Math.max(4, screenH * 0.15)}px sans-serif`;
      c.fillText('今日项目进度正常 周末不加班', screenX + scrollX - screenW, screenY + screenH * 0.55);
      // 底部时间条
      c.fillStyle = '#0a1a3a';
      c.fillRect(screenX, screenY + screenH * 0.75, screenW, screenH * 0.25);
      c.fillStyle = '#60a5fa';
      c.font = `${Math.max(3, screenH * 0.12)}px monospace`;
      c.textAlign = 'right';
      c.fillText(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), screenX + screenW - 2, screenY + screenH * 0.9);
    } else if (contentPhase === 1) {
      // 🌤️ 天气频道
      const grad = c.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
      grad.addColorStop(0, '#1a3a5a');
      grad.addColorStop(0.5, '#2a6a8a');
      grad.addColorStop(1, '#4a8aaa');
      c.fillStyle = grad;
      c.fillRect(screenX, screenY, screenW, screenH);
      // 太阳
      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.arc(screenX + screenW * 0.7, screenY + screenH * 0.3, screenH * 0.15, 0, Math.PI * 2);
      c.fill();
      // 云朵
      c.fillStyle = 'rgba(255,255,255,0.8)';
      const cloudX = screenX + screenW * 0.3 + Math.sin(t * 0.3) * 3;
      c.beginPath();
      c.arc(cloudX, screenY + screenH * 0.25, screenH * 0.1, 0, Math.PI * 2);
      c.arc(cloudX + screenH * 0.1, screenY + screenH * 0.2, screenH * 0.12, 0, Math.PI * 2);
      c.arc(cloudX + screenH * 0.2, screenY + screenH * 0.25, screenH * 0.08, 0, Math.PI * 2);
      c.fill();
      // 温度
      c.fillStyle = '#fff';
      c.font = `bold ${Math.max(6, screenH * 0.3)}px monospace`;
      c.textAlign = 'center';
      c.fillText('24°C', screenX + screenW / 2, screenY + screenH * 0.7);
      c.font = `${Math.max(3, screenH * 0.12)}px sans-serif`;
      c.fillText('☀️ 晴 适宜办公', screenX + screenW / 2, screenY + screenH * 0.85);
    } else if (contentPhase === 2) {
      // 📊 公司数据看板
      c.fillStyle = '#0a1a0a';
      c.fillRect(screenX, screenY, screenW, screenH);
      // 绿色边框
      c.strokeStyle = '#4ade80';
      c.lineWidth = 1;
      c.strokeRect(screenX + 1, screenY + 1, screenW - 2, screenH - 2);
      // 标题
      c.fillStyle = '#4ade80';
      c.font = `bold ${Math.max(4, screenH * 0.14)}px monospace`;
      c.textAlign = 'center';
      c.fillText('DASHBOARD', screenX + screenW / 2, screenY + screenH * 0.18);
      // 进度条
      const bars = [
        { label: 'Sprint', val: 0.72, color: '#4ade80' },
        { label: 'Bug', val: 0.35, color: '#f472b6' },
        { label: 'Coffee', val: 0.95, color: '#fbbf24' },
      ];
      bars.forEach((bar, i) => {
        const by = screenY + screenH * (0.3 + i * 0.22);
        const bh = screenH * 0.12;
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.fillRect(screenX + screenW * 0.1, by, screenW * 0.8, bh);
        c.fillStyle = bar.color;
        c.fillRect(screenX + screenW * 0.1, by, screenW * 0.8 * bar.val, bh);
        c.fillStyle = '#ccc';
        c.font = `${Math.max(3, screenH * 0.1)}px monospace`;
        c.textAlign = 'left';
        c.fillText(`${bar.label} ${Math.floor(bar.val * 100)}%`, screenX + screenW * 0.1, by - 1);
      });
    } else {
      // 🎨 屏保模式 — 彩色浮动方块（经典屏保）
      const colors = ['#e94560', '#4ade80', '#60a5fa', '#fbbf24', '#a78bfa', '#f472b6'];
      for (let i = 0; i < 5; i++) {
        const bx = screenX + ((t * 8 + i * 17) % screenW);
        const by = screenY + ((t * 6 + i * 23) % screenH);
        const size = screenH * 0.15;
        c.fillStyle = colors[i] + '88';
        c.fillRect(bx, by, size, size);
        c.strokeStyle = colors[i];
        c.lineWidth = 1;
        c.strokeRect(bx, by, size, size);
      }
      // 底部提示
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.font = `${Math.max(3, screenH * 0.1)}px monospace`;
      c.textAlign = 'center';
      c.fillText('摸鱼中...别告诉老板', screenX + screenW / 2, screenY + screenH - 2);
    }

    // 屏幕反光 — 右上角微弱高光
    const glare = c.createRadialGradient(
      screenX + screenW * 0.8, screenY + screenH * 0.1, 0,
      screenX + screenW * 0.8, screenY + screenH * 0.1, screenW * 0.4
    );
    glare.addColorStop(0, 'rgba(255,255,255,0.08)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glare;
    c.fillRect(screenX, screenY, screenW, screenH);

    // 电视底部支架
    c.fillStyle = '#222';
    c.fillRect(x + ts / 2 - 3, y + ts - 3, 6, 2);
    c.fillRect(x + ts / 2 - 6, y + ts - 1, 12, 1);

    // 电源指示灯
    const ledColor = Math.sin(t * 3) > 0 ? '#4ade80' : '#166534';
    c.fillStyle = ledColor;
    c.fillRect(x + ts - 5, y + ts - 3, 2, 2);
  }

  // ============================================
  // 📊 KPI/OKR 看板 — 挂在隔墙上的绩效考核板，打工人看了就心累
  // ============================================
  private drawKPIBoard(x: number, y: number, ts: number, t: number, tileX: number, tileY: number): void {
    const c = this.ctx;

    // 看板边框
    c.fillStyle = '#1a1a2e';
    c.fillRect(x + 1, y + 1, ts - 2, ts - 2);

    // 金属边框
    c.strokeStyle = '#4a4a6e';
    c.lineWidth = 1;
    c.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    // 标题 — "Q1 OKR"
    c.fillStyle = '#e94560';
    c.fillRect(x + 2, y + 2, ts - 4, 3);

    c.fillStyle = '#fff';
    c.font = `bold ${Math.max(5, ts - 16)}px monospace`;
    c.textAlign = 'center';
    c.fillText('OKR', x + ts / 2, y + 7);

    // KPI 项目 — 动态进度条
    const items = [
      { label: '营收', val: 72, color: '#4ade80' },
      { label: '用户', val: 65, color: '#60a5fa' },
      { label: 'Bug数', val: 38, color: '#f87171' },
      { label: '加班', val: 95, color: '#fbbf24' },
    ];

    const barWidth = ts - 8;
    for (let i = 0; i < items.length; i++) {
      const iy = y + 10 + i * (ts < 30 ? 4 : 5);
      const barH = ts < 30 ? 2 : 3;

      // 标签
      c.fillStyle = '#94a3b8';
      c.font = `${Math.max(3, ts - 22)}px monospace`;
      c.textAlign = 'left';
      c.fillText(items[i].label, x + 2, iy + 3);

      // 进度条底色
      c.fillStyle = '#2a2a4a';
      c.fillRect(x + 18, iy + 1, barWidth - 16, barH);

      // 进度条填充 — 微动画
      const pulse = 1 + Math.sin(t * 2 + i * 0.5) * 0.03;
      c.fillStyle = items[i].color;
      c.fillRect(x + 18, iy + 1, (barWidth - 20) * (items[i].val / 100) * pulse, barH);

      // 百分比
      c.fillStyle = items[i].color;
      c.font = `${Math.max(3, ts - 22)}px monospace`;
      c.textAlign = 'right';
      c.fillText(`${items[i].val}%`, x + ts - 2, iy + 3);
    }

    // 底部滚动消息
    const scrollX = ((t * 8) % (ts + 10)) - 10;
    c.fillStyle = '#0a0a1e';
    c.fillRect(x + 1, y + ts - 5, ts - 2, 4);
    c.fillStyle = '#fbbf24';
    c.font = `${Math.max(3, ts - 22)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText('🏆 优秀员工: 老王 | 加班时长: 第一名', x + scrollX, y + ts - 2);

    // 运行指示灯
    const blink = Math.sin(t * 3) > 0;
    c.fillStyle = blink ? '#4ade80' : '#166534';
    c.fillRect(x + ts - 4, y + 3, 2, 2);

    // 📅 Sprint 倒计时 — 真实办公室的迭代节奏
    const chinaDay = (new Date().getUTCDay() + 8) % 7; // 1=周一...6=周六,0=周日
    // 假设 Sprint 从周一开始，到周五结束（5 天）
    const sprintDay = chinaDay >= 1 && chinaDay <= 5 ? chinaDay : 0;
    const sprintTotal = 5;
    const sprintProgress = sprintDay > 0 ? sprintDay / sprintTotal : 0;

    // Sprint 进度条（在 KPI 标题下方）
    if (sprintDay > 0) {
      const barY = y + 8;
      const barH = 2;
      const barX = x + 2;
      const barW = ts - 4;

      // 进度条底色
      c.fillStyle = '#2a2a4a';
      c.fillRect(barX, barY, barW, barH);

      // 进度条填充 — 根据星期几着色
      const sprintColors = ['#60a5fa', '#4ade80', '#fbbf24', '#f97316', '#e74c3c']; // 周一蓝→周五红
      c.fillStyle = sprintColors[sprintDay - 1] || '#60a5fa';
      c.fillRect(barX, barY, barW * sprintProgress, barH);

      // Sprint 文字
      c.fillStyle = sprintColors[sprintDay - 1] || '#60a5fa';
      c.font = '2px monospace';
      c.textAlign = 'right';
      c.fillText(`Sprint ${sprintDay}/${sprintTotal}`, x + ts - 2, barY + 2);

      // 周五下午：冲刺倒计时闪烁
      if (sprintDay === 5) {
        const flash = Math.sin(t * 3) > 0;
        if (flash) {
          c.fillStyle = 'rgba(231,76,60,0.2)';
          c.fillRect(barX, barY, barW, barH);
        }
      }
    }
  }

  // ☕ 咖啡机排队指示器 — 显示咖啡机忙/排队状态
  private drawCoffeeQueueIndicator(ts: number, t: number): void {
    const c = this.ctx;
    // 咖啡机上方显示排队状态
    const indicatorX = ts * 13 + ts / 2; // 咖啡机在 x=13
    const indicatorY = ts * 8; // 咖啡机上方一行

    if (this.coffeeMachineBusy) {
      // 红色忙碌灯
      const pulse = 0.5 + Math.sin(t * 2.5) * 0.3;
      c.fillStyle = `rgba(239,68,68,${pulse})`;
      c.beginPath();
      c.arc(indicatorX, indicatorY + ts / 2, 3, 0, Math.PI * 2);
      c.fill();

      // 排队人数徽章
      if (this.coffeeQueueLength > 0) {
        c.fillStyle = 'rgba(0,0,0,0.7)';
        c.beginPath();
        c.arc(indicatorX + 10, indicatorY + ts / 2, 7, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 7px monospace';
        c.textAlign = 'center';
        c.fillText(`${this.coffeeQueueLength}`, indicatorX + 10, indicatorY + ts / 2 + 3);
      }

      // ☕ 图标
      c.fillStyle = 'rgba(160,114,74,0.8)';
      c.font = '10px monospace';
      c.textAlign = 'center';
      c.fillText('☕', indicatorX - 12, indicatorY + ts / 2 + 4);
    }
  }

  // 🍱 微波炉排队指示器 — 午休时间热饭排队时显示排队状态
  private drawMicrowaveQueueIndicator(ts: number, t: number): void {
    const c = this.ctx;
    // 微波炉上方显示排队状态 — 微波炉在 x=15, y=9
    const indicatorX = ts * 15 + ts / 2;
    const indicatorY = ts * 8; // 微波炉上方一行

    if (this.microwaveBusy) {
      // 橙色忙碌灯（区别于咖啡机的红色）
      const pulse = 0.5 + Math.sin(t * 2.0) * 0.3;
      c.fillStyle = `rgba(251,146,60,${pulse})`;
      c.beginPath();
      c.arc(indicatorX, indicatorY + ts / 2, 3, 0, Math.PI * 2);
      c.fill();

      // 排队人数徽章
      if (this.microwaveQueueLength > 0) {
        c.fillStyle = 'rgba(0,0,0,0.7)';
        c.beginPath();
        c.arc(indicatorX + 10, indicatorY + ts / 2, 7, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 7px monospace';
        c.textAlign = 'center';
        c.fillText(`${this.microwaveQueueLength}`, indicatorX + 10, indicatorY + ts / 2 + 3);
      }

      // 🍱 便当图标
      c.fillStyle = 'rgba(251,146,60,0.8)';
      c.font = '10px monospace';
      c.textAlign = 'center';
      c.fillText('🍱', indicatorX - 12, indicatorY + ts / 2 + 4);
    }
  }
}