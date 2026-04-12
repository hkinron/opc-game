import { TileMap } from './TileMap';
import { Agent } from './Agent';
import { Renderer } from './Renderer';
import { AgentWebSocket, AgentEvent } from './AgentWebSocket';
import { KanbanBoard } from './KanbanBoard';
import { ConfigManager } from './ConfigSystem';
import { InteractionSystem } from './InteractionSystem';
import { AgentConfig, AgentRole, AgentState, TileType } from '../types';
import { OfficeCat } from './OfficeCat';
import { Boss, BossState } from './Boss';

const AGENT_NAMES = ['小明', '老王', '小红', '大壮', '翠花', '铁柱'];
const AGENT_ROLES: AgentRole[] = [AgentRole.Coder, AgentRole.Reviewer, AgentRole.Designer, AgentRole.Writer, AgentRole.Tester, AgentRole.Coder];
const KANBAN_POSITION = { x: 1, y: 1 };

const RANDOM_EVENTS = [
  { msg: '🍕 有人点了披萨！大家快来吃！', weight: 3 },
  { msg: '📢 老板来了！假装工作！', weight: 3 },
  { msg: '🔥 服务器崩了！紧急修复！', weight: 2 },
  { msg: '🎂 今天是小红的生日！🎉', weight: 2 },
  { msg: '🐱 猫咪在打呼噜...', weight: 3 },
  { msg: '🌈 窗外有彩虹！', weight: 1 },
  { msg: '☕ 咖啡机坏了！谁来修修？', weight: 2 },
  { msg: '📦 快递到了！是谁的包裹？', weight: 2 },
  { msg: '🎮 下班后打游戏！谁来？', weight: 2 },
  { msg: '🚨 消防演习！大家快走！', weight: 1 },
  // 🧑‍💻 打工人共鸣事件
  { msg: '💬 "需求又改了，这是第几版了？"', weight: 3 },
  { msg: '🐛 "这个 bug 我上周就提了！"', weight: 2 },
  { msg: '🍜 "外卖到了！谁去拿一下？"', weight: 3 },
  { msg: '☕ "帮我带杯咖啡，谢谢！"', weight: 2 },
  { msg: '🌐 "网络又断了！！！"', weight: 2 },
  { msg: '❄️ "空调太冷了吧..."', weight: 2 },
  { msg: '💰 "今天是发薪日！"', weight: 2 },
  { msg: '🏖️ "还有 X 天放假！"', weight: 2 },
  { msg: '📋 "下班前能搞定吗？"', weight: 2 },
  // 📞 电话亭专属事件
  { msg: '📞 "喂，妈，我在加班呢..."', weight: 2 },
  { msg: '📞 "对对对，我已经到岗了"（在家办公）', weight: 2 },
  { msg: '📞 有人在电话亭面试！大家都安静...', weight: 3 },
  { msg: '📞 "好的 HR，薪资期望是 open 的"', weight: 2 },
  // 🖥️ 服务器机房专属事件
  { msg: '🚨 服务器报警了！CPU 99%！', weight: 3 },
  { msg: '🖥️ 运维又在重启服务器了...', weight: 2 },
  { msg: '💾 "谁把生产数据库删了？！"', weight: 2 },
  { msg: '🔌 机房空调坏了，服务器要热炸了', weight: 2 },
  { msg: '📊 监控面板全绿，难得一见！', weight: 1 },
];

// 🍵 茶水间专属闲聊 — 两个 agent 在茶水间相遇时触发
const TEA_ROOM_GOSSIP = [
  { a: '你中午吃啥？', b: '外卖，天天吃那家都吃腻了 🥡' },
  { a: '咖啡机又坏了...', b: '没事，茶水间的微波炉还能用 😂' },
  { a: '冰箱里谁的外卖？', b: '上周的吧，都长毛了 🤢' },
  { a: '零食柜空了！', b: '行政说下周补货，先忍忍 🍪' },
  { a: '下午那个会你去吗？', b: '能不去就不去，假装忙 🤫' },
  { a: '你昨天加班到几点？', b: '十一点，狗命一条 🐕' },
  { a: '听说了吗？隔壁组又裁员了', b: '……别说了，心慌 💀' },
  { a: '我写了个脚本自动回消息', b: '教教我！我也想摸鱼 🤖' },
  { a: '这周能准时下班吗？', b: '你认真的？🤣' },
  { a: '饮水机换了新牌子', b: '喝着跟之前一样，都是自来水 😅' },
  { a: '你觉得新来的产品怎么样？', b: '不提了，提了就想辞职' },
  { a: '今天太阳好大', b: '嗯，适合请假出去玩 🌞' },
  { a: '我的年假还有5天', b: '我还有12天，但根本休不了 😮‍💨' },
  { a: '你养猫了吗？', b: '养了，每天回家它就坐在门口等我 🐱' },
  { a: '想转行做独立开发', b: '先把你这个项目做完再说吧 💻' },
];

export interface GameOptions { wsUrl?: string; theme?: string; layout?: string; skins?: string; }

export class Game {
  private tileMap: TileMap;
  private renderer: Renderer;
  private agents: Agent[] = [];
  private cat: OfficeCat;
  private boss: Boss;
  private canvas: HTMLCanvasElement;
  private statusBar: HTMLElement;
  private tooltip: HTMLElement;
  private running = false;
  private lastTime = 0;
  private simTimer = 0;
  private taskTimer = 0;
  private nextAgentIndex = 0;
  private useSimulation = true;
  private ws: AgentWebSocket | null = null;
  private wsAgentMap: Map<string, Agent> = new Map();
  private connectionIndicator: HTMLElement | null = null;
  private kanban: KanbanBoard;
  private config: ConfigManager;
  private interactions: InteractionSystem;
  private deskSpots: { x: number; y: number }[];
  private agentTasks: Map<string, string> = new Map();
  private completedTasks: Set<string> = new Set();
  private eventTimer = 0;
  private bossVisibleLast = false;
  private standupTriggered = false;
  private deliveryTriggered = false;
  private fridayEarlyLeaveTriggered = false;
  private morningAttendanced: Set<string> = new Set();
  private gossipCooldown: Set<string> = new Set();
  private lateArrivalsTriggered = false; // 🏃 迟到冲刺 — 每天只触发一次
  private leavedAgents: Set<string> = new Set(); // 🚶 已下班离开的 agent
  private absentAgents: Map<string, string> = new Map(); // 🏖️ 请假的 agent → 原因
  private absentSignsPlaced = new Set<string>(); // 已放置请假牌的工位
  private lateArrivals = new Set<string>(); // 🏃 记录今天已经迟到的 agent
  private leavingAgents = new Set<string>(); // 🚶 记录正在下班离开的 agent
  private weekendOvertimeAssigned = false; // 🌙 周末是否已分配加班人员
  private weekendOvertimeAgents = new Set<string>(); // 🌙 周末加班的 agent
  private umbrellaGrabbed = new Set<string>(); // 🌧️ 今天已经拿过伞的 agent
  private birthdayAgent: string | null = null; // 🎂 今天过生日的人
  private birthdayCelebrated = false; // 🎂 今天是否已经触发庆祝
  private pingPongPlayers = new Set<string>(); // 🏓 正在打乒乓球的 agent
  private pingPongCooldown = 0; // 🏓 乒乓球桌冷却时间
  private snackShareCooldown = 0; // 🍪 零食分享冷却时间
  private deliveryPersonActive = false; // 🛵 外卖员是否在场
  private deliveryTimer = 0; // 🛵 外卖员停留计时器
  private deliveryPickupAgents = new Set<string>(); // 🛵 已经去拿外卖的 agent
  private faceWashCooldown = new Set<string>(); // 💧 下午犯困洗把脸 — 今天已经洗过的 agent
  private stretchCooldown = new Set<string>(); // 🙆 伸懒腰 — 今天已经伸过的 agent
  private milkTeaOrderActive = false; // 🧋 奶茶拼单是否正在进行中
  private milkTeaOrderer: string | null = null; // 🧋 发起拼单的人
  private milkTeaOrders: Map<string, string> = new Map(); // 🧋 每个人的奶茶订单 {name: order}
  private milkTeaCooldown = 0; // 🧋 奶茶拼单冷却（轮数）
  private milkTeaPickupDone = false; // 🧋 是否已经取过奶茶
  private konamiBuffer: string = '';
  private konamiCode = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightKeyBKeyA';
  private printerJamActive = false; // 🖨️ 打印机是否卡纸
  private printerJamTimer = 0; // 🖨️ 卡纸持续时间
  private printerJamPositions: { x: number; y: number }[] = []; // 🖨️ 原始打印机位置
  private printerFixer: string | null = null; // 🖨️ 正在修打印机的 agent
  // ☕ 咖啡机排队系统 — 多人同时想接咖啡时自动排队，真实办公室日常
  private coffeeMachineBusy = false; // 咖啡机是否正在被使用
  private coffeeMachineUser: string | null = null; // 正在用咖啡机的人
  private coffeeMachineTimer: number = 0; // 当前使用者剩余时间（秒）
  private coffeeQueue: string[] = []; // 排队队列（agent name）
  private coffeeQueueSpots = [ // 排队站位
    { x: 12, y: 9 }, // 排队1号位（咖啡机左边）
    { x: 12, y: 8 }, // 排队2号位
    { x: 11, y: 9 }, // 排队3号位
  ];
  private coffeeQueueGossipCooldown = 0; // 排队闲聊冷却
  // 🍱 微波炉排队系统 — 午餐时间热饭要排队，真实办公室经典场景
  private microwaveBusy = false; // 微波炉是否正在被使用
  private microwaveUser: string | null = null; // 正在热饭的人
  private microwaveTimer: number = 0; // 当前用户剩余时间（秒）
  private microwaveQueue: string[] = []; // 排队队列（agent name）
  private microwaveQueueSpots = [ // 排队站位 — 微波炉在 (15,9)，两侧等待
    { x: 14, y: 8 }, // 排队1号位（微波炉左边）
    { x: 16, y: 8 }, // 排队2号位（微波炉右边）
  ];
  private microwaveQueueGossipCooldown = 0; // 排队闲聊冷却

  constructor(canvas: HTMLCanvasElement, statusBar: HTMLElement, tooltip: HTMLElement, options: GameOptions = {}) {
    this.canvas = canvas; this.statusBar = statusBar; this.tooltip = tooltip;
    this.config = new ConfigManager();
    this.interactions = new InteractionSystem();
    this.cat = new OfficeCat();
    this.boss = new Boss();
    if (options.theme) this.config.setTheme(options.theme);
    if (options.layout) this.config.setLayout(options.layout);
    if (options.skins) this.config.setSkins(options.skins);
    const layout = this.config.getLayout();
    this.deskSpots = layout.desks;
    this.tileMap = new TileMap(layout.width, layout.height, layout.furniture);
    this.renderer = new Renderer(canvas, this.tileMap, this.config.getTheme());
    this.kanban = new KanbanBoard();
    this.setupDefaultTasks();
    this.renderer.setInteractions(this.interactions);
    this.renderer.setOfficeCat(this.cat);
    this.renderer.setBoss(this.boss);
    this.renderer.resize(this.canvas); // Initial resize to fit the window
    this.setupInteraction();
    if (options.wsUrl) this.connectWebSocket(options.wsUrl);
  }

  private setupDefaultTasks(): void {
    this.kanban.addTask('搭建认证系统', '实现 JWT 登录 + 刷新', 'high');
    this.kanban.addTask('设计首页页面', '设计首屏 + 功能展示', 'medium');
    this.kanban.addTask('写 API 文档', '整理 REST 接口说明', 'low');
    this.kanban.addTask('配置 CI/CD', '用 GitHub Actions 做部署', 'medium');
    this.kanban.addTask('修登录 bug', 'Users can\'t reset password', 'high');
    this.kanban.addTask('补充单元测试', '覆盖 utils 模块', 'medium');
    this.kanban.addTask('优化数据库查询', '慢查询优化 + 索引', 'high');
    this.kanban.addTask('部署监控系统', 'Prometheus + Grafana', 'medium');
  }

  private connectWebSocket(url: string): void {
    this.useSimulation = false; this.ws = new AgentWebSocket(url);
    this.ws.on((event: AgentEvent) => this.handleAgentEvent(event));
    this.ws.connect();
    const header = document.getElementById('header');
    if (header) {
      this.connectionIndicator = document.createElement('span');
      this.connectionIndicator.id = 'ws-status';
      this.connectionIndicator.style.cssText = 'color:#94a3b8;font-size:12px;display:flex;align-items:center;gap:4px';
      this.connectionIndicator.innerHTML = '<span class="status-dot idle"></span> Connecting...';
      header.appendChild(this.connectionIndicator);
      setInterval(() => {
        if (this.connectionIndicator && this.ws) {
          if (this.ws.isConnected()) {
            this.connectionIndicator.innerHTML = '<span class="status-dot working"></span> Live';
            (this.connectionIndicator.querySelector('.status-dot') as HTMLElement)?.classList.remove('idle');
            (this.connectionIndicator.querySelector('.status-dot') as HTMLElement)?.classList.add('working');
          } else {
            this.connectionIndicator.innerHTML = '<span class="status-dot idle"></span> Disconnected (sim)';
            this.useSimulation = true;
          }
        }
      }, 2000);
    }
  }

  private handleAgentEvent(event: AgentEvent): void {
    let agent = this.wsAgentMap.get(event.agentId);
    if (!agent && this.nextAgentIndex < this.deskSpots.length) {
      const spot = this.deskSpots[this.nextAgentIndex];
      const config: AgentConfig = { name: event.agentId || AGENT_NAMES[this.nextAgentIndex], role: AGENT_ROLES[this.nextAgentIndex], deskX: spot.x, deskY: spot.y };
      agent = new Agent(config, this.tileMap);
      this.agents.push(agent); this.wsAgentMap.set(event.agentId, agent); this.nextAgentIndex++;
    }
    if (!agent) return;
    switch (event.type) {
      case 'file_write': case 'command':
        agent.setState(AgentState.Typing); agent.speechBubble = `✏️ ${event.file || event.command || 'working...'}`; agent.speechTimer = 8; break;
      case 'file_read':
        agent.setState(AgentState.Reading); agent.speechBubble = `📖 ${event.file || 'reading...'}`; agent.speechTimer = 6; break;
      case 'error':
        agent.setState(AgentState.Error); agent.speechBubble = `💥 ${event.message || 'error!'}`; agent.speechTimer = 5; break;
      case 'waiting':
        agent.setState(AgentState.Waiting); agent.speechBubble = `⏳ ${event.message || 'waiting...'}`; agent.speechTimer = 10; break;
      case 'state_change':
        if (event.state) agent.setState(event.state as AgentState); break;
    }
  }

  start(): void { this.addAgent(); this.addAgent(); this.addAgent(); this.running = true; this.lastTime = performance.now(); this.loop(); }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now(), dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now; this.update(dt);
    this.renderer.render(this.agents, now / 1000);
    this.updateStatusBar();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    for (const agent of this.agents) { if (!agent.isAbsent) agent.update(dt, this.tileMap); }
    this.cat.update(dt, this.tileMap);
    this.boss.update(dt, this.tileMap);

    // Boss proximity: agents near the boss pretend to work
    if (this.boss.isVisible()) {
      for (const agent of this.agents) {
        if (agent.isAbsent) continue;
        if (this.boss.isNearby(agent.x, agent.y, 3)) {
          if (agent.state === AgentState.摸鱼中 || agent.state === AgentState.Idle || agent.state === AgentState.Waiting || agent.state === AgentState.趴桌睡觉) {
            agent.setState(AgentState.Typing);
            agent.speechBubble = '😰 假装工作中...';
            agent.speechTimer = 3;
          }
        }
      }
    }

    // Boss arrival/departure events
    if (this.boss.isVisible() && !this.bossVisibleLast) {
      this.renderer.triggerEvent('📢 老板来了！大家假装工作！', 8);
    } else if (!this.boss.isVisible() && this.bossVisibleLast) {
      this.renderer.triggerEvent('🎉 老板走了！可以摸鱼了！', 6);
    }
    this.bossVisibleLast = this.boss.isVisible();

    const sounds = this.renderer.getSoundSystem();
    for (const agent of this.agents) {
      if (agent.shouldPlayTypingSound(dt)) sounds.playTyping();
      if (agent.shouldPlayFootstepSound()) sounds.playFootstep();
    }

    this.interactions.checkAgentProximity(this.agents);
    this.checkLunchTableGossip();
    this.checkTeaRoomGossip();
    this.checkWaterCoolerGossip();
    this.checkBarStoolGossip();
    this.updateCoffeeMachine(dt); // ☕ 咖啡机排队状态更新
    this.renderer.setCoffeeQueueState(this.coffeeMachineBusy, this.coffeeQueue.length);
    this.updateMicrowaveQueue(dt); // 🍱 微波炉排队状态更新
    this.renderer.setMicrowaveQueueState(this.microwaveBusy, this.microwaveQueue.length);
    this.checkElevatorWaiting(chinaHour); // 🛗 电梯等梯行为
    this.checkMeetingRoom();

    // 💻 收集正在打字的工位，传给 Renderer 做显示器发光效果
    const activeTypingDesks = new Set<string>();
    for (const agent of this.agents) {
      if (agent.state === AgentState.Typing && !agent.isAbsent) {
        activeTypingDesks.add(`${agent.config.deskX},${agent.config.deskY}`);
      }
    }
    this.renderer.setTypingDesks(activeTypingDesks);

    // 🖥️ 收集空闲工位（有 agent 但没在打字的工位）— 显示器关闭效果
    const idleDeskSet = new Set<string>();
    for (const agent of this.agents) {
      if (agent.state !== AgentState.Typing && !agent.isAbsent && !agent.hasLeftOffice) {
        idleDeskSet.add(`${agent.config.deskX},${agent.config.deskY}`);
      }
    }
    this.renderer.setIdleDesks(idleDeskSet);

    if (this.useSimulation) {
      this.taskTimer += dt;
      if (this.taskTimer > 5) { this.taskTimer = 0; this.assignTasks(); }
      this.simTimer += dt;
      if (this.simTimer > 12) { this.simTimer = 0; this.simulateAgentActivity(); }
    }

    // Task completion chime
    for (const agent of this.agents) {
      if (agent.state === AgentState.摸鱼中 || agent.state === AgentState.趴桌睡觉) {
        const taskId = this.agentTasks.get(agent.config.name);
        if (taskId && !this.completedTasks.has(taskId)) {
          this.completedTasks.add(taskId);
          sounds.playCompletion();
          this.kanban.moveTask(taskId, 'review');
          agent.speechBubble = `✅ Done! Moving to review`; agent.speechTimer = 4;
          this.agentTasks.delete(agent.config.name);
          // Confetti celebration!
          this.renderer.triggerConfetti(agent.x * this.renderer.tileSize + this.renderer.tileSize / 2, agent.y * this.renderer.tileSize);
        }
      }
    }

    // Random events
    this.eventTimer += dt;
    if (this.eventTimer > 30) {
      this.eventTimer = 0;
      if (Math.random() < 0.35) {
        const totalWeight = RANDOM_EVENTS.reduce((s, e) => s + e.weight, 0);
        let r = Math.random() * totalWeight, chosen = RANDOM_EVENTS[0];
        for (const evt of RANDOM_EVENTS) { r -= evt.weight; if (r <= 0) { chosen = evt; break; } }
        this.renderer.triggerEvent(chosen.msg, 10 + Math.random() * 8);
        sounds.playEvent();
      }
    }

    // 🖨️ 打印机卡纸事件 — 工作日随机触发，打工人经典崩溃场景
    this.printerJamTimer += dt;
    if (!this.printerJamActive && this.printerJamTimer > 45 && Math.random() < 0.08) {
      this.triggerPrinterJam();
    }
    if (this.printerJamActive) {
      this.printerJamTimer += dt;
      // 15-25 秒后有人去修
      if (!this.printerFixer && this.printerJamTimer > 15 + Math.random() * 10) {
        this.assignPrinterFixer();
      }
      // 修好后 30 秒恢复
      if (this.printerJamTimer > 35) {
        this.fixPrinter();
      }
    }
  }

  private assignTasks(): void {
    for (const agent of this.agents) {
      const currentTask = this.agentTasks.get(agent.config.name);
      if (!currentTask) {
        const task = this.kanban.getAvailableTask(agent.config.name);
        if (task) {
          this.kanban.assignTask(task.id, agent.config.name);
          this.agentTasks.set(agent.config.name, task.id);
          agent.speechBubble = `📋 领取任务：${task.title}`; agent.speechTimer = 5;
          this.renderer.getSoundSystem().playTaskPickup();
          agent.walkTo(KANBAN_POSITION.x, KANBAN_POSITION.y, this.tileMap);
          setTimeout(() => {
            if (agent.state !== AgentState.Walking) {
              agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
              setTimeout(() => {
                if (agent.state !== AgentState.Walking) {
                  agent.setState(AgentState.Typing);
                  agent.speechBubble = `💻 ${task.title}`; agent.speechTimer = 10;
                }
              }, 2000);
            }
          }, 3000);
        }
      }
    }
  }

  private simulateAgentActivity(): void {
    if (this.agents.length === 0) return;

    // 获取中国时区的小时 (UTC+8)
    const chinaHour = (new Date().getUTCHours() + 8) % 24;
    const isWeekend = [0, 6].includes(new Date().getUTCDay());

    // 🌙 周末加班模式 — 周六日 50% 概率有人来加班
    const isWeekendOvertimeMode = isWeekend && !this.weekendOvertimeAssigned;
    if (isWeekendOvertimeMode && Math.random() < 0.5) {
      this.weekendOvertimeAssigned = true;
      // 随机选 2-3 个人来加班
      const overtimeCount = 2 + Math.floor(Math.random() * 2);
      const shuffled = [...this.agents].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(overtimeCount, shuffled.length); i++) {
        const agent = shuffled[i];
        agent.isWeekendOvertime = true;
        this.weekendOvertimeAgents.add(agent.config.name);
        // 加班专属对话
        const overtimeDialogues = [
          '😮‍💨 周末还要来加班...',
          '💻 趁周末把 bug 修了',
          '☕ 周末办公室好安静...',
          '🎧 戴着耳机写代码，爽',
          '😴 还好周末没人打扰',
          '🍕 周末加班点个外卖犒劳自己',
          '🌙 深夜办公室，只有我和我的代码',
          '📝 周末没人开会，效率翻倍！',
        ];
        agent.speechBubble = overtimeDialogues[Math.floor(Math.random() * overtimeDialogues.length)];
        agent.speechTimer = 8;
      }
      if (this.weekendOvertimeAgents.size > 0) {
        this.renderer.triggerEvent(`🌙 周末加班！${this.weekendOvertimeAgents.size} 个人在办公室`, 8);
      }
    }
    // 过了周末重置
    if (!isWeekend) { this.weekendOvertimeAssigned = false; }

    // 🌙 周末加班专属行为 — 加班 agent 的特殊动作
    if (isWeekend && this.weekendOvertimeAgents.size > 0) {
      for (const agent of this.agents) {
        if (!agent.isWeekendOvertime) continue;
        if (agent.state === AgentState.Walking) continue;
        // 偶尔去接杯水/伸个懒腰
        if (agent.state === AgentState.Typing && Math.random() < 0.05) {
          const weekendBreakSpots = [
            { x: 15, y: 7, msg: '☕ 周末的咖啡格外香...' },
            { x: 13, y: 7, msg: '💧 接杯水继续干' },
            { x: 2, y: 8, msg: '🛋️ 沙发瘫一会儿...' },
          ];
          const spot = weekendBreakSpots[Math.floor(Math.random() * weekendBreakSpots.length)];
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.walkTo(spot.x, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 6;
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.setState(AgentState.Typing);
                    agent.speechBubble = '💪 休息完继续搞！';
                    agent.speechTimer = 4;
                  }
                }, 3000);
              }
            }, 5000 + Math.random() * 3000);
          }
        }
        // 加班专属随机对话
        if (agent.state === AgentState.Typing && Math.random() < 0.03) {
          const otDialogues = [
            '🎵 安静，只有键盘声...',
            '🍕 要不要点个外卖？',
            '🤔 这个算法怎么写更好...',
            '🐛 终于找到那个 bug 了！',
            '😴 有点困了...泡杯咖啡',
            '📱 周末发消息给同事，会被骂吗？',
            '💪 今天一定要搞定这个！',
          ];
          agent.speechBubble = otDialogues[Math.floor(Math.random() * otDialogues.length)];
          agent.speechTimer = 5;
        }
      }
    }

    // 🌧️ 下雨天专属行为 — 打工人最烦的天气，鞋子湿、不想动
    if (isRaining) {
      // ☂️ 雨天拿伞：agent 离开座位去雨伞架拿伞，然后回工位
      for (const agent of this.agents) {
        if (this.umbrellaGrabbed.has(agent.config.name)) continue;
        if (agent.state === AgentState.Walking || agent.isAbsent) continue;
        if (agent.state === AgentState.Idle && Math.random() < 0.08) {
          this.umbrellaGrabbed.add(agent.config.name);
          agent.hasUmbrella = true; // 标记已拿伞，渲染时显示伞图标
          this.renderer.setUmbrellasRemaining(6 - this.umbrellaGrabbed.size); // 更新雨伞架显示
          const umbrellaMessages = [
            '☂️ 下雨了，去拿把伞...',
            '🌧️ 鞋子要湿了，先去拿伞',
            '😤 又下雨，最讨厌的天气',
            '☂️ 还好带了伞，不然又湿透了',
          ];
          agent.walkTo(4, 9, this.tileMap); // 走到雨伞架旁 (4,10)
          agent.speechBubble = umbrellaMessages[Math.floor(Math.random() * umbrellaMessages.length)];
          agent.speechTimer = 5;
          setTimeout(() => {
            if (agent.state !== AgentState.Walking) {
              agent.setState(AgentState.Waiting);
              agent.speechBubble = '☂️ 拿到伞了！';
              agent.speechTimer = 3;
              setTimeout(() => {
                if (agent.state !== AgentState.Walking) {
                  agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                  setTimeout(() => {
                    if (agent.state !== AgentState.Walking) {
                      agent.setState(AgentState.Typing);
                      agent.speechBubble = '🌧️ 外面下得好大...';
                      agent.speechTimer = 6;
                    }
                  }, 3000);
                }
              }, 3000);
            }
          }, 4000);
        }
      }
      // 雨天专属对话：工作中突然抱怨下雨
      for (const agent of this.agents) {
        if (agent.state === AgentState.Typing && Math.random() < 0.04) {
          const rainDialogues = [
            '🌧️ 外面雨好大，不想下班...',
            '💧 鞋子又湿了，烦死了',
            '😮‍💨 下雨天打车好难',
            '☔ 还好今天带了伞',
            '🌧️ 这雨什么时候停啊...',
            '🚗 下雨堵车，明天又要迟到了',
            '😫 下雨天还要加班，惨',
            '🌧️ 听着雨声写代码，还挺有氛围的',
          ];
          agent.speechBubble = rainDialogues[Math.floor(Math.random() * rainDialogues.length)];
          agent.speechTimer = 6;
        }
        // 雨天摸鱼更严重 — 看着窗外的雨发呆
        if (agent.state === AgentState.摸鱼中 && Math.random() < 0.06) {
          const rainSlacking = [
            '🌧️ 下雨天摸鱼天经地义',
            '💧 听雨声，不想工作',
            '🪟 窗外雨好大...不想动',
            '☔ 这种天气就该在家睡觉',
          ];
          agent.speechBubble = rainSlacking[Math.floor(Math.random() * rainSlacking.length)];
          agent.speechTimer = 6;
        }
      }
    }
    // 雨停了，重置拿伞记录和雨伞架
    if (!isRaining && this.umbrellaGrabbed.size > 0) {
      this.umbrellaGrabbed.clear();
      for (const agent of this.agents) { agent.hasUmbrella = false; }
      this.renderer.setUmbrellasRemaining(6);
    }

    // 📊 办公室活跃度 — 根据在岗人数调整氛围
    const activeAgents = this.agents.filter(a => !a.hasLeftOffice && !a.isAbsent);
    const activityLevel = activeAgents.length / Math.max(1, this.agents.length); // 0-1
    this.renderer.setActivityLevel(activityLevel, activeAgents.length);

    // 🕐 午休时间 (12:00-13:00 中国时间)
    const isLunchTime = chinaHour >= 12 && chinaHour < 13;
    // 😴 午休趴桌睡觉 — 中国办公室经典场景，午休时部分人直接趴工位上睡
    const isNapTime = chinaHour >= 12 && chinaHour < 13;
    // 😴 下午犯困 (14:00-15:00)
    const isSleepyTime = chinaHour >= 14 && chinaHour < 15;
    // ☕ 下午咖啡时间 (15:00-16:00) — 犯困后集体接咖啡
    const isCoffeeRush = chinaHour >= 15 && chinaHour < 16;
    // 🎉 周五下午摸鱼 (15:00-18:00)
    const isFridayAfternoon = new Date().getUTCDay() === 5 && chinaHour >= 15 && chinaHour < 18;
    // 🌙 加班时间 (19:00-22:00)
    const isOvertime = chinaHour >= 19 && chinaHour < 22;
    // 🏠 下班后 (22:00-8:00)
    const isOffHours = chinaHour >= 22 || chinaHour < 8;
    // 😫 周一早上 (周一 8:00-10:00)
    const isMondayMorning = new Date().getUTCDay() === 1 && chinaHour >= 0 && chinaHour < 2; // UTC 0-2 = China 8-10
    // 🌧️ 下雨天 — 打工人最烦的天气
    const isRaining = this.renderer.getDayNight().getState().weather === 'rain';
    // 📋 晨会站会 (工作日 9:00-10:00 中国时间)
    const isStandupTime = !isWeekend && chinaHour >= 1 && chinaHour < 2; // UTC 1-2 = China 9-10

    // 📋 晨会站会：agents 聚集到白板区域开会
    if (isStandupTime && !this.standupTriggered) {
      this.standupTriggered = true;
      const standupSpots = [
        { x: 2, y: 2, msg: '📋 今天做登录模块' },
        { x: 3, y: 2, msg: '🎨 我在搞首页设计' },
        { x: 2, y: 3, msg: '🐛 修了3个bug' },
        { x: 3, y: 3, msg: '📝 写 API 文档' },
        { x: 4, y: 2, msg: '🧪 补单元测试' },
        { x: 4, y: 3, msg: '📊 部署监控系统' },
      ];
      for (let i = 0; i < Math.min(this.agents.length, standupSpots.length); i++) {
        const agent = this.agents[i];
        if (agent.state === AgentState.Walking) continue;
        const spot = standupSpots[i];
        agent.walkTo(spot.x, spot.y, this.tileMap);
        agent.speechBubble = spot.msg;
        agent.speechTimer = 12;
        // 站会后回工位
        setTimeout(() => {
          if (agent.state !== AgentState.Walking) {
            agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) agent.setState(AgentState.Typing);
            }, 3000);
          }
        }, 10000 + Math.random() * 5000);
      }
      this.renderer.triggerEvent('📋 每日站会！大家到白板前集合！', 8);
    }
    // 过了站会时间重置标志
    if (!isStandupTime) { this.standupTriggered = false; }

    // 📱 上班打卡 — 早上工作时间，还没打卡的 agent 去打卡机打卡
    // 中国时间 8:00-10:00 (UTC 0-2)，每个 agent 只打一次
    const isMorningArrival = !isWeekend && chinaHour >= 0 && chinaHour < 2;
    if (isMorningArrival) {
      for (const agent of this.agents) {
        if (this.morningAttendanced.has(agent.config.name)) continue;
        if (agent.state === AgentState.Walking) continue;
        if (Math.random() < 0.08 && this.tileMap.isWalkable(11, 10)) {
          this.morningAttendanced.add(agent.config.name);
          agent.walkTo(11, 10, this.tileMap);
          const clockInMessages = [
            '📱 滴！打卡成功！',
            '📱 准时打卡，完美！',
            '📱 差点迟到...还好赶上了',
            '📱 打卡！又是元气满满的一天（并不）',
            '📱 滴——本月全勤 +1',
          ];
          agent.speechBubble = clockInMessages[Math.floor(Math.random() * clockInMessages.length)];
          agent.speechTimer = 4;
          setTimeout(() => {
            if (agent.state !== AgentState.Walking) {
              agent.setState(AgentState.Waiting);
              agent.speechBubble = '✅ 打完卡了，去工位';
              agent.speechTimer = 3;
              setTimeout(() => {
                if (agent.state !== AgentState.Walking) {
                  agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                  setTimeout(() => {
                    if (agent.state !== AgentState.Walking) {
                      agent.setState(AgentState.Typing);
                      agent.speechBubble = '💻 开工！';
                      agent.speechTimer = 5;
                    }
                  }, 3000);
                }
              }, 3000);
            }
          }, 5000);
        }
      }
    }
    // 过了早上时段重置打卡记录
    if (!isMorningArrival) { this.morningAttendanced.clear(); }
    // 🌅 新的一天重置 — 中国时间凌晨（UTC 16-24），重置所有每日标志
    const isNewDay = chinaHour >= 0 && chinaHour < 1;
    if (isNewDay) {
      this.lateArrivalsTriggered = false;
      this.leavedAgents.clear();
      this.absentAgents.clear();
      this.absentSignsPlaced.clear();
      this.weekendOvertimeAssigned = false;
      this.weekendOvertimeAgents.clear();
      this.umbrellaGrabbed.clear();
      this.birthdayCelebrated = false;
      this.pingPongPlayers.clear();
      this.pingPongCooldown = 0;
      this.snackShareCooldown = 0;
      this.faceWashCooldown.clear();
      this.stretchCooldown.clear();
      this.milkTeaOrderActive = false;
      this.milkTeaOrderer = null;
      this.milkTeaOrders.clear();
      this.milkTeaCooldown = 0;
      this.milkTeaPickupDone = false;
      for (const a of this.agents) { a.hasLeftOffice = false; a.hasArrivedToday = false; a.isAbsent = false; a.absenceReason = ''; a.isWeekendOvertime = false; }
    }

    // 🏖️ 请假系统 — 工作日早上随机有人请假（中国时间 8:00-9:00）
    const isMorningRollCall = !isWeekend && chinaHour >= 0 && chinaHour < 1; // UTC 0-1 = China 8-9
    if (isMorningRollCall && this.absentAgents.size === 0 && this.agents.length > 2) {
      // 20% 概率有人请假
      if (Math.random() < 0.2) {
        const availableAgents = this.agents.filter(a => !this.morningAttendanced.has(a.config.name));
        if (availableAgents.length > 0) {
          const absentAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
          const reasons = [
            '😷 感冒发烧，请假一天',
            '🏖️ 年假休息，明天见',
            '🏥 去医院体检，请半天假',
            '👶 孩子生病，在家照顾',
            '🚗 车子抛锚，路上赶不过来',
            '🤕 落枕了，脖子动不了...',
            '💔 心情不好，需要静静',
            '🎉 朋友结婚，去当伴郎/伴娘',
          ];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          absentAgent.isAbsent = true;
          absentAgent.absenceReason = reason;
          this.absentAgents.set(absentAgent.config.name, reason);
          // 在工位上放请假牌
          const deskX = absentAgent.config.deskX;
          const deskY = absentAgent.config.deskY;
          if (!this.absentSignsPlaced.has(`${deskX},${deskY}`)) {
            this.tileMap.setIf(deskX, deskY + 1, TileType.AbsentSign);
            this.absentSignsPlaced.add(`${deskX},${deskY}`);
          }
          this.renderer.triggerEvent(`🏖️ ${absentAgent.config.name} 请假了：${reason}`, 8);
        }
      }
    }
    if (!isMorningRollCall && chinaHour >= 1) { /* 过了早上时段，不再分配请假 */ }

    // 🎂 生日庆祝 — 工作日早上随机有人过生日，工位上放蛋糕+气球
    const isBirthdayTime = !isWeekend && chinaHour >= 0 && chinaHour < 2; // UTC 0-2 = China 8-10
    if (isBirthdayTime && !this.birthdayAgent && this.agents.length >= 3 && Math.random() < 0.08) {
      // 10% 概率今天有人过生日
      const availableAgents = this.agents.filter(a => !a.isAbsent && !this.morningAttendanced.has(a.config.name));
      if (availableAgents.length > 0) {
        const birthdayPerson = availableAgents[Math.floor(Math.random() * availableAgents.length)];
        this.birthdayAgent = birthdayPerson.config.name;
        // 在工位上放生日蛋糕
        const deskX = birthdayPerson.config.deskX;
        const deskY = birthdayPerson.config.deskY + 1;
        if (this.tileMap.inBounds(deskX, deskY)) {
          this.tileMap.setIf(deskX, deskY, TileType.BirthdayCake);
        }
        birthdayPerson.speechBubble = '🎂 哇！今天是我生日！';
        birthdayPerson.speechTimer = 8;
        this.renderer.triggerEvent(`🎂 今天是 ${birthdayPerson.config.name} 的生日！大家快去祝福！`, 10);
        this.renderer.getSoundSystem().playEvent();
      }
    }
    // 过了生日时段，如果还没庆祝，清除蛋糕
    if (!isBirthdayTime && chinaHour >= 2 && this.birthdayAgent && !this.birthdayCelebrated) {
      this.birthdayAgent = null;
    }

    // 🏃 迟到冲刺 — 中国时间 9:30-10:00 (UTC 1:30-2:00)，有 agent 迟到慌张跑进来
    const isLateArrivalTime = !isWeekend && chinaHour >= 1 && chinaHour < 2; // UTC 1-2 = China 9-10
    if (isLateArrivalTime && !this.lateArrivalsTriggered) {
      // 9:30 后才触发（半小时偏移），选一个还没到的 agent
      const now = new Date();
      const chinaMinute = now.getUTCMinutes() + 30;
      if (chinaMinute >= 30 && Math.random() < 0.4) {
        this.lateArrivalsTriggered = true;
        // 选一个还没到工位的 agent（hasArrivedToday = false 或刚创建的）
        const lateAgent = this.agents.find(a =>
          a.state === AgentState.Idle && a.stateTimer < 10 && a.state !== AgentState.Walking
        );
        if (lateAgent && this.tileMap.isWalkable(8, 12)) {
          // 从电梯口出现，慌张跑向工位
          lateAgent.x = 8;
          lateAgent.y = 12;
          lateAgent.hasArrivedToday = true;
          const lateMessages = [
            '😱 迟到了迟到了！！！闹钟没响！',
            '🏃 路上堵车堵死了...快迟到了！',
            '😰 睡过头了！！！老板在吗？！',
            '🏃‍♂️ 地铁晚点了！要扣全勤了！',
            '😱 完了完了，9:30 了！！！',
            '🏃 快跑快跑！打卡机等我！',
          ];
          lateAgent.speechBubble = lateMessages[Math.floor(Math.random() * lateMessages.length)];
          lateAgent.speechTimer = 6;
          // 先冲向打卡机
          setTimeout(() => {
            if (lateAgent.state !== AgentState.Walking) {
              lateAgent.walkTo(11, 10, this.tileMap);
              lateAgent.speechBubble = '📱 赶紧先打卡！！！';
              lateAgent.speechTimer = 4;
              // 打完卡再冲回工位
              setTimeout(() => {
                if (lateAgent.state !== AgentState.Walking) {
                  lateAgent.speechBubble = '✅ 打上了！溜了溜了';
                  lateAgent.speechTimer = 3;
                  setTimeout(() => {
                    if (lateAgent.state !== AgentState.Walking) {
                      lateAgent.walkTo(lateAgent.config.deskX, lateAgent.config.deskY + 1, this.tileMap);
                      setTimeout(() => {
                        if (lateAgent.state !== AgentState.Walking) {
                          lateAgent.setState(AgentState.Typing);
                          lateAgent.speechBubble = '😅 还好赶上了...吓死我了';
                          lateAgent.speechTimer = 8;
                        }
                      }, 3000);
                    }
                  }, 3000);
                }
              }, 4000);
            }
          }, 1000);
          // 全局事件通知
          this.renderer.triggerEvent('🏃 有人迟到了！慌张冲进门！', 6);
        }
      }
    }
    // 过了迟到时段重置（但只触发一次）
    if (!isLateArrivalTime && chinaHour >= 2) { this.lateArrivalsTriggered = true; }

    // 🖥️ 服务器机房行为 — 工作时间偶尔有 agent 被叫去修服务器
    if (!isWeekend && chinaHour >= 1 && chinaHour < 11 && Math.random() < 0.06) {
      const available_agent = this.agents.find(a =>
        a.state === AgentState.Idle && !a.currentTask && this.tileMap.isWalkable(3, 3)
      );
      if (available_agent) {
        const serverMessages = [
          '🖥️ "CPU 又爆了，我去看看..."',
          '🔧 "服务器重启一下就好"',
          '💾 "生产库有个慢查询..."',
          '📊 "监控报警了，紧急处理"',
          '🔌 "机房空调又坏了？！"',
          '🐛 "线上有个 P0 bug，我去修"',
        ];
        available_agent.walkTo(3, 3, this.tileMap);
        available_agent.speechBubble = serverMessages[Math.floor(Math.random() * serverMessages.length)];
        available_agent.speechTimer = 8;
        setTimeout(() => {
          if (available_agent.state !== AgentState.Walking) {
            available_agent.setState(AgentState.Typing);
            setTimeout(() => {
              if (available_agent.state !== AgentState.Walking) {
                available_agent.walkTo(available_agent.config.deskX, available_agent.config.deskY + 1, this.tileMap);
                setTimeout(() => {
                  if (available_agent.state !== AgentState.Walking) {
                    available_agent.setState(AgentState.Typing);
                    available_agent.speechBubble = '✅ 服务器修好了！';
                    available_agent.speechTimer = 5;
                  }
                }, 3000);
              }
            }, 6000 + Math.random() * 4000);
          }
        }, 4000);
      }
    }

    // 📞 电话亭行为 — 工作时间偶尔有人去打电话
    if (!isWeekend && chinaHour >= 2 && chinaHour < 12 && Math.random() < 0.08) {
      const availableAgent = this.agents.find(a =>
        a.state === AgentState.Idle && !a.currentTask && this.tileMap.isWalkable(5, 9)
      );
      if (availableAgent) {
        const phoneCalls = [
          '📞 "喂妈，晚上回去吃..."',
          '📞 "对，我已经到岗了"（远程办公）',
          '📞 "快递放门口就好"',
          '📞 "好的 HR，我考虑一下..."',
          '📞 "宝宝乖，爸爸在加班"',
          '📞 "物业说漏水了？！"',
        ];
        availableAgent.walkTo(6, 8, this.tileMap);
        availableAgent.speechBubble = phoneCalls[Math.floor(Math.random() * phoneCalls.length)];
        availableAgent.speechTimer = 10;
        setTimeout(() => {
          if (availableAgent.state !== AgentState.Walking) {
            availableAgent.setState(AgentState.Waiting);
            setTimeout(() => {
              if (availableAgent.state !== AgentState.Walking) {
                availableAgent.walkTo(availableAgent.config.deskX, availableAgent.config.deskY + 1, this.tileMap);
                setTimeout(() => {
                  if (availableAgent.state !== AgentState.Walking) availableAgent.setState(AgentState.Typing);
                }, 3000);
              }
            }, 5000 + Math.random() * 5000);
          }
        }, 4000);
      }
    }

    // 🍽️ 午休时间：agent 离开座位去吃饭/休息
    if (isLunchTime) {
      for (const agent of this.agents) {
        if (agent.state === AgentState.Walking) continue;
        if (agent.isAbsent) continue;
        const rand = Math.random();
        if (rand < 0.15) {
          // 😴 趴桌睡觉 — 中国办公室午休经典！25% 概率直接趴着睡
          if (agent.state === AgentState.Idle && Math.random() < 0.35) {
            agent.setState(AgentState.趴桌睡觉);
            agent.stateTimer = 0;
            const napMessages = [
              '😴 午安 Zzz...',
              '💤 让我睡一会儿...',
              '😪 充电中...',
              '🛌 午休时间勿扰',
              '😴 zzz... 需求别改了...',
            ];
            agent.speechBubble = napMessages[Math.floor(Math.random() * napMessages.length)];
            agent.speechTimer = 5;
          } else {
            // 🍽️ 去午餐桌吃饭 — 像真实的打工人一样围坐吃饭
            if (this.tileMap.isWalkable(7, 7) || this.tileMap.isWalkable(9, 7)) {
              const lunchSpotX = this.tileMap.isWalkable(7, 7) ? 7 : 9;
              agent.walkTo(lunchSpotX, 7, this.tileMap);
              const lunchMessages = [
                '🍱 开饭了！今天吃啥？',
                '🥡 自带午餐，健康又省钱',
                '🍜 外卖到了，黄焖鸡米饭！',
                '🥗 减肥中...沙拉走起',
                '🍕 今天奢侈一把，吃披萨',
                '🍛 咖喱饭！香死了',
              ];
              agent.speechBubble = lunchMessages[Math.floor(Math.random() * lunchMessages.length)];
              agent.speechTimer = 6;
              // 吃完后进入「饭后散步」模式
              setTimeout(() => {
                if (agent.state !== AgentState.Walking) {
                  agent.setState(AgentState.Idle);
                  agent.speechBubble = '😋 吃饱了...';
                  agent.speechTimer = 4;
                  // 🚶‍♂️ 饭后散步 — 不急着回工位，在办公室溜达消食
                  setTimeout(() => {
                    if (agent.state !== AgentState.Walking && agent.state !== AgentState.趴桌睡觉) {
                      this.startPostLunchWalk(agent);
                    }
                  }, 4000 + Math.random() * 4000);
                }
              }, 6000);
            }
          }
        } else if (rand < 0.25) {
          agent.speechBubble = '😋 吃饭去了~';
          agent.speechTimer = 3;
        }
      }

      // 🍱 午休时间热饭 — 自带饭的 agent 去微波炉加热
      for (const agent of this.agents) {
        if (agent.state === AgentState.Walking || agent.isAbsent) continue;
        if (agent.state === AgentState.Idle && Math.random() < 0.06) {
          this.tryUseMicrowave(agent);
        }
      }
    }

    // 🛵 外卖到了 — 午休时随机触发，一个 agent 去快递柜取外卖
    if (isLunchTime && !this.deliveryTriggered && Math.random() < 0.08) {
      this.deliveryTriggered = true;
      const deliveryMessages = [
        '🛵 "外卖到了！我去拿！"',
        '🍔 "我的黄焖鸡到了！"',
        '🍜 "螺蛳粉到了！谁要吃？"',
        '🥡 "奶茶到了！三分糖去冰！"',
        '🍕 "披萨到了！大家快来！"',
        '🍱 "便当到了！在快递柜！"',
      ];
      const lockerAgent = this.agents.find(a =>
        a.state === AgentState.Idle && !a.currentTask
      );
      if (lockerAgent && this.tileMap.isWalkable(15, 10)) {
        lockerAgent.walkTo(15, 10, this.tileMap);
        lockerAgent.speechBubble = deliveryMessages[Math.floor(Math.random() * deliveryMessages.length)];
        lockerAgent.speechTimer = 5;
        setTimeout(() => {
          if (lockerAgent.state !== AgentState.Walking) {
            lockerAgent.setState(AgentState.Waiting);
            lockerAgent.speechBubble = '📦 取到外卖了！';
            lockerAgent.speechTimer = 3;
            // 取完回工位吃
            setTimeout(() => {
              if (lockerAgent.state !== AgentState.Walking) {
                lockerAgent.walkTo(lockerAgent.config.deskX, lockerAgent.config.deskY + 1, this.tileMap);
                setTimeout(() => {
                  if (lockerAgent.state !== AgentState.Walking) {
                    lockerAgent.setState(AgentState.Idle);
                    lockerAgent.speechBubble = '🍱 开吃了！';
                    lockerAgent.speechTimer = 8;
                  }
                }, 4000);
              }
            }, 4000 + Math.random() * 3000);
          }
        }, 5000);
      }
      this.renderer.triggerEvent('🛵 外卖到了！有人去拿吗？', 6);
    }
    // 过了午休时间重置外卖标志
    if (!isLunchTime) { this.deliveryTriggered = false; }

    // 🏃 周五提前溜 — 周五下午中国时间 16:00 后，部分 agent 收拾东西溜了
    const isFridayEarlyLeave = new Date().getUTCDay() === 5 && chinaHour >= 8 && chinaHour < 10;
    if (isFridayEarlyLeave && !this.fridayEarlyLeaveTriggered && Math.random() < 0.15) {
      this.fridayEarlyLeaveTriggered = true;
      const leaver = this.agents.find(a =>
        (a.state === AgentState.Typing || a.state === AgentState.摸鱼中) &&
        a.state !== AgentState.Walking
      );
      if (leaver && this.tileMap.isWalkable(8, 9)) {
        leaver.speechBubble = '🎉 周末啦！收拾东西溜了！';
        leaver.speechTimer = 4;
        setTimeout(() => {
          if (leaver.state !== AgentState.Walking) {
            leaver.walkTo(8, 11, this.tileMap); // 走到电梯口
            leaver.speechBubble = '👋 拜拜！下周见！';
            leaver.speechTimer = 3;
            setTimeout(() => {
              if (leaver.state !== AgentState.Walking) {
                // 假装进了电梯，然后又回工位摸鱼
                leaver.speechBubble = '😎 其实没走，回工位继续摸';
                leaver.speechTimer = 5;
                setTimeout(() => {
                  if (leaver.state !== AgentState.Walking) {
                    leaver.walkTo(leaver.config.deskX, leaver.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (leaver.state !== AgentState.Walking) {
                        leaver.setState(AgentState.摸鱼中);
                        leaver.speechBubble = '🐟 心早已放假，人还在工位';
                        leaver.speechTimer = 8;
                      }
                    }, 4000);
                  }
                }, 3000);
              }
            }, 5000);
          }
        }, 2000);
        this.renderer.triggerEvent('🏃 有人提前溜了！周五下午谁还干活！', 6);
      }
    }
    if (!isFridayEarlyLeave) { this.fridayEarlyLeaveTriggered = false; }

    for (const agent of this.agents) {
      if (this.agentTasks.has(agent.config.name) && agent.state === AgentState.摸鱼中) {
        // 加班时间：更有可能回去工作
        if (isOvertime && Math.random() < 0.4) {
          agent.setState(AgentState.Typing);
          const task = this.kanban.getAgentTask(agent.config.name);
          if (task) agent.speechBubble = `💻 加班继续：${task.title}`;
          agent.speechTimer = 8;
        } else if (isOffHours && Math.random() < 0.5) {
          agent.setState(AgentState.Typing);
          agent.speechBubble = '😤 怎么还没下班...';
          agent.speechTimer = 5;
        }
        // 🌇 下班渐空 — 中国时间 18:00 后，agents 陆续收拾东西离开
        const isLeavingTime = chinaHour >= 18 && chinaHour < 22;
        if (isLeavingTime && !this.leavedAgents.has(agent.config.name) && agent.state !== AgentState.Walking) {
          // 离开概率随时间递增：18点 ~5%, 19点 ~12%, 20点 ~20%, 21点 ~30%
          const leaveChance = (chinaHour - 18) * 0.07 + 0.05;
          if (Math.random() < leaveChance) {
            this.leavedAgents.add(agent.config.name);
            agent.hasLeftOffice = true;
            const leaveMsgs = [
              '👋 下班啦！明天见！',
              '🎉 终于下班了！冲！',
              '🏃 溜了溜了，拜拜！',
              '😮‍💨 终于可以回家了...',
              '🚶 走啦走啦，今天好累',
              '🎮 下班打游戏去！',
              '🍜 下班！先去吃顿好的！',
            ];
            agent.speechBubble = leaveMsgs[Math.floor(Math.random() * leaveMsgs.length)];
            agent.speechTimer = 5;
            setTimeout(() => {
              if (agent.hasLeftOffice) agent.walkTo(8, 12, this.tileMap);
              setTimeout(() => {
                if (agent.hasLeftOffice) {
                  agent.speechBubble = '👋 Bye~';
                  agent.speechTimer = 3;
                  setTimeout(() => {
                    if (agent.hasLeftOffice) { agent.x = -10; agent.y = -10; }
                  }, 3000);
                }
              }, 5000);
            }, 2000);
          }
        }
      } else if (this.agentTasks.has(agent.config.name) && agent.state === AgentState.Typing) {
        // 下午犯困：摸鱼概率翻倍
        const slackingChance = isSleepyTime ? 0.30 : isFridayAfternoon ? 0.40 : 0.15;
        if (Math.random() < slackingChance) {
          agent.setState(AgentState.摸鱼中);
          if (isSleepyTime) agent.speechBubble = '😴 好困啊...';
          else if (isFridayAfternoon) agent.speechBubble = '🐟 周五了，摸会儿...';
          agent.speechTimer = 5;
        }
        // 周一早上：低能量 — 不想上班，摸鱼概率翻倍
        if (isMondayMorning) {
          // 周一摸鱼概率翻倍
          const mondaySlackChance = 0.35;
          if (Math.random() < mondaySlackChance) {
            agent.setState(AgentState.摸鱼中);
            const mondaySlackMsgs = [
              '😫 周一...不想上班...',
              '😴 周末还没玩够就周一了',
              '☕ 周一第一杯咖啡续命',
              '💤 灵魂还在床上，身体已到工位',
              '🥱 一周开始了...救命',
              '😮‍💨 周一综合征发作中',
              '🛌 好想请一天病假...',
              '😫 周一的我为啥要工作',
            ];
            agent.speechBubble = mondaySlackMsgs[Math.floor(Math.random() * mondaySlackMsgs.length)];
            agent.speechTimer = 6;
          }
          // 周一偶尔发呆坐着不动
          if (Math.random() < 0.06 && agent.state !== AgentState.Walking) {
            agent.setState(AgentState.Waiting);
            const mondayStareMsgs = [
              '🫠 看着屏幕发呆...',
              '😶 脑子还没开机...',
              '🤖 正在启动周一模式...',
              '💭 我在哪？今天是周几？',
            ];
            agent.speechBubble = mondayStareMsgs[Math.floor(Math.random() * mondayStareMsgs.length)];
            agent.speechTimer = 5;
            setTimeout(() => {
              if (agent.state === AgentState.Waiting) {
                agent.setState(AgentState.Typing);
                agent.speechBubble = '😤 算了，开始干活吧...';
                agent.speechTimer = 4;
              }
            }, 5000 + Math.random() * 3000);
          }
        } else if (Math.random() < 0.1) {
          agent.speechBubble = '😫 不想上班...';
          agent.speechTimer = 4;
        }
        // 🙆 伸懒腰 — 下午犯困经典动作 (14:00-15:00)，站起来双臂高举
        if (isSleepyTime && !this.stretchCooldown.has(agent.config.name) && Math.random() < 0.08 && agent.state !== AgentState.Walking) {
          this.stretchCooldown.add(agent.config.name);
          agent.setState(AgentState.伸懒腰);
          const stretchMessages = [
            '🙆 啊～～～好困...',
            '🥱 伸个懒腰清醒一下...',
            '😮‍💨 坐了一上午，腰快断了...',
            '💪 伸个懒腰，继续搬砖！',
            '🧘 活动活动筋骨...',
            '😴 这姿势太舒服了...',
          ];
          agent.speechBubble = stretchMessages[Math.floor(Math.random() * stretchMessages.length)];
          agent.speechTimer = 6;
          // 伸完懒腰后回工位继续工作
          setTimeout(() => {
            if (agent.state === AgentState.伸懒腰) {
              agent.setState(AgentState.Typing);
              agent.speechBubble = '💪 复活了！继续搞！';
              agent.speechTimer = 5;
            }
          }, 5000 + Math.random() * 3000);
        }
        // 🥱 打哈欠 — 下午犯困灵魂出窍，嘴巴张得大大的 (14:00-15:00)
        if (isSleepyTime && Math.random() < 0.06 && agent.state !== AgentState.Walking) {
          agent.setState(AgentState.打哈欠);
          agent.lastYawnTime = this.simTimer;
          const yawnMessages = [
            '🥱 啊～～～困死了...',
            '😪 哈欠连天，撑不住了...',
            '🥲 昨晚又熬夜了...',
            '😴 让我睡五分钟就好...',
            '💤 眼皮好重...',
            '🥱 哈——欠——',
          ];
          agent.speechBubble = yawnMessages[Math.floor(Math.random() * yawnMessages.length)];
          agent.speechTimer = 4;

          // 🥱 打哈欠传染 — 附近的人也会被传染（真实办公室现象！）
          const now = performance.now() / 1000;
          for (const other of this.agents) {
            if (other === agent || other.isAbsent) continue;
            if (other.state === AgentState.Walking) continue;
            // 冷却 30 秒内不重复传染
            if (now - other.lastYawnTime < 30) continue;
            // 3 格范围内
            const dist = Math.abs(Math.round(other.x) - Math.round(agent.x)) + Math.abs(Math.round(other.y) - Math.round(agent.y));
            if (dist <= 3 && Math.random() < 0.35) {
              other.setState(AgentState.打哈欠);
              other.lastYawnTime = now;
              const contagionMsgs = [
                '🥱 你打我也打...',
                '😪 不行了，好困...',
                '🥲 哈欠会传染的！！',
                '😴 看到别人打哈欠就困...',
              ];
              other.speechBubble = contagionMsgs[Math.floor(Math.random() * contagionMsgs.length)];
              other.speechTimer = 4;
            }
          }
        }
        // 😴 下午犯困扩展 — 去洗手间洗把脸清醒一下 (14:00-15:00)
        if (isSleepyTime && !this.faceWashCooldown.has(agent.config.name) && Math.random() < 0.06 && agent.state !== AgentState.Walking) {
          this.faceWashCooldown.add(agent.config.name);
          // 洗手间区域 (restroom at x=17-18, y=8)，走到附近的水槽
          const faceWashSpots = [
            { x: 16, y: 8, msg: '💧 洗把脸清醒一下...' },
            { x: 16, y: 9, msg: '😪 冷水洗脸，瞬间清醒！' },
          ];
          const spot = faceWashSpots[Math.floor(Math.random() * faceWashSpots.length)];
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.speechBubble = '😴 太困了...去洗个脸';
            agent.speechTimer = 3;
            agent.walkTo(spot.x, spot.y, this.tileMap);
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Waiting);
                agent.speechBubble = spot.msg;
                agent.speechTimer = 5;
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) {
                        agent.setState(AgentState.Typing);
                        agent.speechBubble = '💪 洗完脸复活了！继续搞！';
                        agent.speechTimer = 6;
                      }
                    }, 3000);
                  }
                }, 4000 + Math.random() * 2000);
              }
            }, 4000);
          }
        }
        // ☕ 下午咖啡时间 (15:00-16:00) — 咖啡机排队系统，真实办公室经典场景
        if (isCoffeeRush && Math.random() < 0.15 && agent.state !== AgentState.Walking) {
          this.tryGetCoffee(agent);
        }
        // 🪑 茶水间吧台椅休息 — 打完咖啡坐在高脚凳上歇会儿，真实办公室经典场景
        if (isCoffeeRush && Math.random() < 0.08 && agent.state !== AgentState.Walking) {
          const barStoolSpots = [
            { x: 13, y: 10, msg: '🪑 坐吧台椅上喝口咖啡…这才是摸鱼的正确姿势' },
            { x: 14, y: 10, msg: '🪑 高脚凳上瘫一会儿…脚够不着地的那种' },
            { x: 15, y: 10, msg: '🪑 坐在吧台椅上刷手机…假装在思考人生' },
          ];
          const spot = barStoolSpots[Math.floor(Math.random() * barStoolSpots.length)];
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.walkTo(spot.x, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 5;
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Idle);
                agent.speechTimer = 0;
                // 坐在吧台椅上摸鱼 8-15 秒
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) {
                        agent.setState(AgentState.Typing);
                        const backMsgs = [
                          '💪 歇完了，继续搬砖！',
                          '😤 吧台椅坐久了腰疼...回去干活',
                          '☕ 咖啡喝完了，回去面对现实',
                          '🪑 高脚凳虽好，但还是要写代码...',
                        ];
                        agent.speechBubble = backMsgs[Math.floor(Math.random() * backMsgs.length)];
                        agent.speechTimer = 5;
                      }
                    }, 3000);
                  }
                }, 8000 + Math.random() * 7000);
              }
            }, 4000);
          }
        }
        // 🪟 看看窗外 — 工作久了站起来去窗边发呆，打工人专属放松方式
        if (!isLunchTime && !isOffHours && Math.random() < 0.04 && agent.state !== AgentState.Walking) {
          const isLeftRoom = agent.config.deskX < 10;
          // 左房间的人去左边窗户，右房间的去右边窗户
          const windowSpots = isLeftRoom
            ? [
                { x: 1, y: 5, msg: '🪟 看看外面的世界...' },
                { x: 2, y: 5, msg: '🌤️ 天气不错，不想上班...' },
              ]
            : [
                { x: 17, y: 3, msg: '🪟 发会儿呆...' },
                { x: 16, y: 3, msg: '🏙️ 对面的楼里也在加班吗？' },
              ];
          const spot = windowSpots[Math.floor(Math.random() * windowSpots.length)];
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.walkTo(spot.x, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 4;
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Idle);
                agent.speechTimer = 0;
                // 窗边发呆 5-10 秒
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) {
                        agent.setState(AgentState.Typing);
                        const backMsgs = [
                          '💪 放完风了，继续搬砖！',
                          '😮‍💨 看窗外 5 分钟，写代码 5 秒钟',
                          '🌈 活着真好，虽然还是要上班',
                          '💻 回工位了，bug 还在等我',
                        ];
                        agent.speechBubble = backMsgs[Math.floor(Math.random() * backMsgs.length)];
                        agent.speechTimer = 5;
                      }
                    }, 3000);
                  }
                }, 5000 + Math.random() * 5000);
              }
            }, 3000 + Math.random() * 2000);
          }
        }
      }
    }

    // 🎂 生日庆祝 — 其他 agent 看到蛋糕后去祝福
    if (this.birthdayAgent && !this.birthdayCelebrated && this.agents.length > 0) {
      const birthdayAgent = this.agents.find(a => a.config.name === this.birthdayAgent);
      if (birthdayAgent && !birthdayAgent.isAbsent) {
        // 其他 agent 去祝福生日的人
        for (const agent of this.agents) {
          if (agent.config.name === this.birthdayAgent) continue;
          if (agent.state === AgentState.Walking) continue;
          if (agent.state === AgentState.Idle && Math.random() < 0.06) {
            const wishes = [
              `🎂 祝 ${this.birthdayAgent} 生日快乐！`,
              '🎉 生日快乐！永远18岁！',
              '🎁 生日快乐！送你个小礼物~',
              '🥳 生日快乐！今天你最大！',
              '🎊 生日快乐！请客请客！',
              '🎈 祝你年年有今日，岁岁有今朝！',
            ];
            agent.walkTo(birthdayAgent.config.deskX, birthdayAgent.config.deskY + 2, this.tileMap);
            agent.speechBubble = wishes[Math.floor(Math.random() * wishes.length)];
            agent.speechTimer = 6;
            // 祝福完回工位
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) agent.setState(AgentState.Typing);
                }, 3000);
              }
            }, 6000 + Math.random() * 4000);
          }
        }
        // 当有 2+ 人来过祝福后，触发集体庆祝
        const wellWishers = this.agents.filter(a =>
          a.state !== AgentState.Walking && a.speechTimer > 0 && a.speechBubble && a.speechBubble.includes('生日快乐')
        );
        if (wellWishers.length >= 2 && !this.birthdayCelebrated) {
          this.birthdayCelebrated = true;
          // 生日的人开心到飞起
          birthdayAgent.speechBubble = '🥹 谢谢大家！我太开心了！';
          birthdayAgent.speechTimer = 8;
          // 触发 confetti
          this.renderer.triggerConfetti(
            birthdayAgent.x * this.renderer.tileSize + this.renderer.tileSize / 2,
            birthdayAgent.y * this.renderer.tileSize
          );
          this.renderer.triggerEvent(`🎉 大家一起给 ${this.birthdayAgent} 唱生日歌！Happy Birthday~ 🎂🎈`, 12);
          this.renderer.getSoundSystem().playEvent();
          // 30秒后清除蛋糕
          setTimeout(() => {
            const deskX = birthdayAgent.config.deskX;
            const deskY = birthdayAgent.config.deskY + 1;
            if (this.tileMap.inBounds(deskX, deskY)) {
              this.tileMap.setIf(deskX, deskY, TileType.Floor);
            }
            this.birthdayAgent = null;
          }, 30000);
        }
      }
    }

    // 🏓 乒乓球桌 — 摸鱼时两个人同时去打球（需要乒乓球桌空闲）
    this.pingPongCooldown -= 1 / 12; // 每次 simulateAgentActivity 调用约12秒
    if (this.pingPongCooldown <= 0 && this.pingPongPlayers.size < 2) {
      const idleAgents = this.agents.filter(a =>
        a.state === AgentState.摸鱼中 && !this.pingPongPlayers.has(a.config.name) && a.state !== AgentState.Walking
      );
      if (idleAgents.length >= 2) {
        // 选两个人去打乒乓球
        const players = idleAgents.slice(0, 2);
        const pingPongMessages = [
          '🏓 来一局！谁输了谁请喝奶茶！',
          '🏓 看我的必杀技！',
          '🏓 上次输给你不服气，再来！',
          '🏓 摸鱼时间到！乒乓球走起！',
        ];
        const waitMessages = [
          '🏓 排队中...你们快点！',
          '👀 围观中...好球！',
          '🏓 等我吃完这包薯片就来！',
        ];
        // 🏓 乒乓球桌在 (1,7) — 两个 agent 分站两侧对打
        const pingPongSpots = [{ x: 1, y: 6 }, { x: 1, y: 8 }];
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          this.pingPongPlayers.add(player.config.name);
          player.walkTo(pingPongSpots[i].x, pingPongSpots[i].y, this.tileMap);
          player.speechBubble = pingPongMessages[Math.floor(Math.random() * pingPongMessages.length)];
          player.speechTimer = 6;
        }
        // 打完球回工位
        setTimeout(() => {
          for (const player of players) {
            if (player.state !== AgentState.Walking) {
              player.speechBubble = waitMessages[Math.floor(Math.random() * waitMessages.length)];
              player.speechTimer = 4;
              setTimeout(() => {
                if (player.state !== AgentState.Walking) {
                  player.walkTo(player.config.deskX, player.config.deskY + 1, this.tileMap);
                  this.pingPongPlayers.delete(player.config.name);
                  this.pingPongCooldown = 3; // 冷却3轮
                  setTimeout(() => {
                    if (player.state !== AgentState.Walking) {
                      player.setState(AgentState.摸鱼中);
                      if (Math.random() < 0.5) {
                        player.speechBubble = '🏓 打得真爽！出出汗就是舒服';
                      } else {
                        player.speechBubble = '😅 又输了...下次一定赢回来';
                      }
                      player.speechTimer = 6;
                    }
                  }, 3000);
                }
              }, 3000);
            }
          }
        }, 10000 + Math.random() * 5000);
      }
    }

    // 🍪 零食分享 — 打工人的社交货币，零食柜前拿零食分给同事
    this.snackShareCooldown -= 1 / 12;
    if (this.snackShareCooldown <= 0 && !isWeekend && chinaHour >= 2 && chinaHour < 12) {
      const snacker = this.agents.find(a =>
        a.state === AgentState.Idle && a.state !== AgentState.Walking
      );
      if (snacker && Math.random() < 0.15) {
        this.snackShareCooldown = 5; // 冷却 5 轮
        // 先去零食柜
        snacker.walkTo(14, 9, this.tileMap); // 零食柜附近
        const snackPickMsgs = [
          '🍪 零食柜翻翻…有什么好吃的…',
          '🍫 来包巧克力，下午续命',
          '🥜 抓把坚果，健康零食',
          '🍬 偷偷拿颗糖…别告诉老板',
        ];
        snacker.speechBubble = snackPickMsgs[Math.floor(Math.random() * snackPickMsgs.length)];
        snacker.speechTimer = 5;
        // 拿完零食后分给附近同事
        setTimeout(() => {
          if (snacker.state !== AgentState.Walking) {
            // 找附近的同事
            const nearbyColleagues = this.agents.filter(a =>
              a.config.name !== snacker.config.name &&
              !a.isAbsent &&
              a.state !== AgentState.Walking &&
              Math.abs(a.x - snacker.x) + Math.abs(a.y - snacker.y) < 6
            );
            if (nearbyColleagues.length > 0) {
              const shareTarget = nearbyColleagues[Math.floor(Math.random() * nearbyColleagues.length)];
              snacker.speechBubble = `🍪 ${shareTarget.config.name}，吃零食不？`;
              snacker.speechTimer = 5;
              // 走过去分享
              setTimeout(() => {
                if (snacker.state !== AgentState.Walking) {
                  snacker.walkTo(shareTarget.config.deskX, shareTarget.config.deskY + 1, this.tileMap);
                  setTimeout(() => {
                    if (snacker.state !== AgentState.Walking) {
                      shareTarget.speechBubble = '😋 哇谢谢！你人真好！';
                      shareTarget.speechTimer = 5;
                      setTimeout(() => {
                        if (shareTarget.state !== AgentState.Walking) {
                          shareTarget.walkTo(shareTarget.config.deskX, shareTarget.config.deskY + 1, this.tileMap);
                        }
                      }, 3000);
                      snacker.speechBubble = '😎 零食柜新补货了，快去！';
                      snacker.speechTimer = 5;
                      setTimeout(() => {
                        if (snacker.state !== AgentState.Walking) {
                          snacker.walkTo(snacker.config.deskX, snacker.config.deskY + 1, this.tileMap);
                          setTimeout(() => {
                            if (snacker.state !== AgentState.Walking) {
                              snacker.setState(AgentState.Typing);
                              snacker.speechBubble = '💻 吃完零食，满血复活！';
                              snacker.speechTimer = 6;
                            }
                          }, 3000);
                        }
                      }, 3000);
                    }
                  }, 4000);
                }
              }, 2000);
            } else {
              // 附近没人，自己回工位吃
              snacker.speechBubble = '🍪 没人要？那我自己吃吧 😂';
              snacker.speechTimer = 5;
              setTimeout(() => {
                if (snacker.state !== AgentState.Walking) {
                  snacker.walkTo(snacker.config.deskX, snacker.config.deskY + 1, this.tileMap);
                  setTimeout(() => {
                    if (snacker.state !== AgentState.Walking) {
                      snacker.setState(AgentState.Typing);
                      snacker.speechBubble = '😋 自己吃也挺香的…';
                      snacker.speechTimer = 5;
                    }
                  }, 3000);
                }
              }, 3000);
            }
          }
        }, 4000);
      }
    }

    // 🧋 奶茶拼单 — 中国办公室经典社交行为，下午茶时间有人发起拼单
    this.milkTeaCooldown -= 1 / 12;
    const isAfternoonTea = !isWeekend && chinaHour >= 6 && chinaHour < 8; // China 14:00-16:00
    if (isAfternoonTea && !this.milkTeaOrderActive && this.milkTeaCooldown <= 0 && Math.random() < 0.12 && this.agents.length >= 3) {
      this.milkTeaOrderActive = true;
      this.milkTeaCooldown = 8; // 冷却 8 轮
      this.milkTeaOrders.clear();
      this.milkTeaPickupDone = false;

      // 选一个发起人
      const availableOrderers = this.agents.filter(a =>
        !a.isAbsent && a.state !== AgentState.Walking &&
        (a.state === AgentState.Idle || a.state === AgentState.摸鱼中)
      );
      if (availableOrderers.length > 0) {
        const orderer = availableOrderers[Math.floor(Math.random() * availableOrderers.length)];
        this.milkTeaOrderer = orderer.config.name;

        // 发起人在工位上发起拼单
        const initMessages = [
          '🧋 "有人要拼奶茶吗？我准备点单了！"',
          '🧋 "下午茶时间！点奶茶的举手！🙋"',
          '🧋 "XX 家的奶茶打折！有人一起吗？"',
          '🧋 "困死了，点杯奶茶续命！有人拼吗？"',
          '🧋 "今天周五（bushi），点奶茶庆祝一下！"',
        ];
        orderer.speechBubble = initMessages[Math.floor(Math.random() * initMessages.length)];
        orderer.speechTimer = 8;
        this.renderer.triggerEvent('🧋 有人发起奶茶拼单！要喝的快报名！', 8);

        // 其他人响应 — 50% 概率参与
        const milkTeaMenu = [
          '珍珠奶茶，半糖去冰 🧋',
          '杨枝甘露，正常糖 🥭',
          '抹茶拿铁，少糖 🍵',
          '波霸奶茶，全糖加冰 🧊',
          '水果茶，三分糖 🍑',
          '柠檬红茶，少冰不加糖 🍋',
          '芋圆奶茶，温热 🟣',
          '黑糖珍珠，正常糖少冰 🖤',
          '茉莉绿茶，无糖去冰 🌿',
          '芒芒甘露，少冰 🌟',
          '西瓜啵啵，正常糖 🍉',
          '葡萄冻冻，少糖 🍇',
        ];

        setTimeout(() => {
          for (const agent of this.agents) {
            if (agent.config.name === this.milkTeaOrderer) continue;
            if (agent.isAbsent) continue;
            if (agent.state === AgentState.Walking) continue;

            if (Math.random() < 0.5) {
              const order = milkTeaMenu[Math.floor(Math.random() * milkTeaMenu.length)];
              this.milkTeaOrders.set(agent.config.name, order);

              const orderMessages = [
                `🧋 "我要${order}"`,
                `🙋 "加我一个！${order}"`,
                `😋 "我也要！${order}"`,
                `🧋 "算我一个！${order}"`,
              ];
              agent.speechBubble = orderMessages[Math.floor(Math.random() * orderMessages.length)];
              agent.speechTimer = 5;
            }
          }

          // 发起人统计订单
          setTimeout(() => {
            const ordererAgent = this.agents.find(a => a.config.name === this.milkTeaOrderer);
            if (ordererAgent) {
              const orderCount = this.milkTeaOrders.size;
              if (orderCount > 0) {
                ordererAgent.speechBubble = `📝 收到 ${orderCount} 杯！我去下单了！`;
                ordererAgent.speechTimer = 6;

                // 🚶 去取奶茶 — 走到入口快递柜/前台附近假装取奶茶
                setTimeout(() => {
                  if (ordererAgent.state !== AgentState.Walking) {
                    ordererAgent.walkTo(13, 10, this.tileMap); // 走到快递柜附近
                    ordererAgent.speechBubble = '🧋 奶茶到了！我去拿！';
                    ordererAgent.speechTimer = 5;

                    // 取到奶茶
                    setTimeout(() => {
                      if (ordererAgent.state !== AgentState.Walking) {
                        this.milkTeaPickupDone = true;
                        ordererAgent.speechBubble = `🧋 拿到 ${orderCount + 1} 杯奶茶！`;
                        ordererAgent.speechTimer = 5;
                        this.renderer.triggerEvent(`🧋 奶茶到了！共 ${orderCount + 1} 杯！`, 8);

                        // 🚶 回去分发奶茶
                        setTimeout(() => {
                          // 走回工位
                          if (ordererAgent.state !== AgentState.Walking) {
                            ordererAgent.walkTo(ordererAgent.config.deskX, ordererAgent.config.deskY + 1, this.tileMap);
                            ordererAgent.speechBubble = '🧋 发奶茶了！谁的要？';
                            ordererAgent.speechTimer = 6;

                            // 给每个下单的人发奶茶
                            let delay = 0;
                            for (const [name, order] of this.milkTeaOrders) {
                              const currentDelay = delay;
                              setTimeout(() => {
                                const targetAgent = this.agents.find(a => a.config.name === name);
                                if (targetAgent && targetAgent.state !== AgentState.Walking) {
                                  // 走过去发奶茶
                                  ordererAgent.walkTo(targetAgent.config.deskX, targetAgent.config.deskY + 1, this.tileMap);
                                  targetAgent.speechBubble = `🥰 谢谢！${order} 对吧！`;
                                  targetAgent.speechTimer = 5;

                                  setTimeout(() => {
                                    if (targetAgent.state !== AgentState.Walking) {
                                      targetAgent.setState(AgentState.Idle);
                                      targetAgent.speechBubble = '🧋 喝到奶茶了！开心！';
                                      targetAgent.speechTimer = 8;
                                      // 🧋 桌上出现奶茶杯，持续 40 秒
                                      targetAgent.drinkOnDesk = order;
                                      targetAgent.drinkOnDeskTimer = 40;
                                    }
                                  }, 3000);
                                }
                              }, currentDelay);
                              delay += 5000;
                            }

                            // 发完奶茶后回工位
                            setTimeout(() => {
                              if (ordererAgent.state !== AgentState.Walking) {
                                ordererAgent.walkTo(ordererAgent.config.deskX, ordererAgent.config.deskY + 1, this.tileMap);
                                setTimeout(() => {
                                  if (ordererAgent.state !== AgentState.Walking) {
                                    ordererAgent.setState(AgentState.Typing);
                                    ordererAgent.speechBubble = '🧋 喝上奶茶了！下午继续搬砖！';
                                    ordererAgent.speechTimer = 8;
                                    this.milkTeaOrderActive = false;
                                  }
                                }, 3000);
                              }
                            }, delay + 2000);
                          }
                        }, 5000);
                      }
                    }, 5000);
                  }
                }, 4000);
              } else {
                // 没人响应
                ordererAgent.speechBubble = '😢 没人要？那我自己点一杯...';
                ordererAgent.speechTimer = 6;
                setTimeout(() => {
                  if (ordererAgent.state !== AgentState.Walking) {
                    ordererAgent.setState(AgentState.摸鱼中);
                    ordererAgent.speechBubble = '🧋 一个人喝奶茶也挺好...';
                    ordererAgent.speechTimer = 8;
                    this.milkTeaOrderActive = false;
                  }
                }, 5000);
              }
            }
          }, 5000 + Math.random() * 3000);
        }, 3000);
      } else {
        this.milkTeaOrderActive = false;
      }
    }

    // 🛵 外卖到了 — 中国办公室经典场景！外卖员到前台，agents 兴奋去拿
    this.deliveryTimer += 1 / 12;
    if (!this.deliveryPersonActive && !isWeekend && chinaHour >= 5 && chinaHour < 8 && Math.random() < 0.04) {
      // 外卖员出现在前台
      this.deliveryPersonActive = true;
      this.deliveryTimer = 0;
      this.deliveryPickupAgents.clear();
      const bagCount = 1 + Math.floor(Math.random() * 3);
      this.renderer.setDeliveryPerson({ x: 6, y: 10, timer: 60, bags: bagCount });
      this.renderer.triggerEvent(`🛵 外卖到了！${bagCount} 份外卖在前台！`, 8);
      this.renderer.getSoundSystem().playEvent();

      // 部分 agent 兴奋地跑去拿外卖
      const hungryAgents = this.agents.filter(a =>
        !a.isAbsent && !this.deliveryPickupAgents.has(a.config.name) &&
        a.state !== AgentState.Walking &&
        (a.state === AgentState.Idle || a.state === AgentState.摸鱼中 || a.state === AgentState.Typing)
      );
      const pickupCount = Math.min(1 + Math.floor(Math.random() * 2), hungryAgents.length);
      const pickedAgents = hungryAgents.sort(() => Math.random() - 0.5).slice(0, pickupCount);

      for (const agent of pickedAgents) {
        this.deliveryPickupAgents.add(agent.config.name);
        const pickupMessages = [
          '🛵 我的外卖到了！冲！',
          '🍜 终于来了！饿死了！',
          '🍱 谁的外卖？帮我拿一下！',
          '🥡 外卖到了！干饭时间！',
          '🍔 我的黄焖鸡！等等我！',
          '🍕 披萨到了！太香了！',
        ];
        agent.speechBubble = pickupMessages[Math.floor(Math.random() * pickupMessages.length)];
        agent.speechTimer = 5;
        // 跑到前台拿外卖
        setTimeout(() => {
          if (agent.state !== AgentState.Walking) {
            agent.walkTo(6, 10, this.tileMap);
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Waiting);
                agent.speechBubble = '📦 拿到我的外卖了！';
                agent.speechTimer = 4;
                // 拎着外卖回工位
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) {
                        agent.setState(AgentState.Typing);
                        const eatMessages = [
                          '🍜 开吃！下午有力气搬砖了！',
                          '🍱 干饭人干饭魂！',
                          '🥡 好吃！满足...',
                          '🍔 吃饱了，犯困了...',
                          '🍕 谁点的披萨？真香！',
                          '🥤 还有奶茶！完美下午！',
                        ];
                        agent.speechBubble = eatMessages[Math.floor(Math.random() * eatMessages.length)];
                        agent.speechTimer = 8;
                      }
                    }, 4000);
                  }
                }, 3000);
              }
            }, 4000);
          }
        }, 2000 + Math.random() * 2000);
      }
    }
    // 外卖员超时离开
    if (this.deliveryPersonActive && this.deliveryTimer > 60) {
      this.deliveryPersonActive = false;
      this.renderer.setDeliveryPerson(null);
    }

    const spots = [
      { x: 7, y: 4, msg: '☕ 接杯咖啡...' }, { x: 1, y: 6, msg: '🛋️ 摸鱼中...' },
      { x: 2, y: 3, msg: '📝 看看白板...' }, { x: 10, y: 3, msg: '📚 翻翻文档...' },
      { x: 6, y: 8, msg: '💬 串个门...' },
      // 新增：卫生间 & 导向标识 & 售货机 & 电话亭
      { x: 2, y: 6, msg: '🚻 上个厕所...' }, { x: 9, y: 7, msg: '🪧 看看指示牌...' },
      { x: 10, y: 9, msg: '🥤 售货机买瓶水...' }, { x: 6, y: 8, msg: '📞 电话亭打电话...' },
      // 🏓 乒乓球桌 — 打工人的快乐源泉
      { x: 6, y: 9, msg: '🏓 来一局乒乓球！' },
      // 📺 休息区看电视 — 摸鱼时看电视新闻/屏保
      { x: 3, y: 8, msg: '📺 看会儿电视...' },
    ];
    for (const agent of this.agents) {
      if (this.agentTasks.has(agent.config.name)) continue;
      const rand = Math.random();
      if (agent.state === AgentState.摸鱼中 && rand < 0.03) {
        const spot = spots[Math.floor(Math.random() * spots.length)];
        if (this.tileMap.isWalkable(spot.x, spot.y)) {
          agent.walkTo(spot.x, spot.y, this.tileMap);
          agent.speechBubble = spot.msg; agent.speechTimer = 5;
          setTimeout(() => {
            if (agent.state === AgentState.摸鱼中 || agent.state === AgentState.Typing || agent.state === AgentState.Reading) {
              agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
              setTimeout(() => { if (agent.state !== AgentState.Walking) agent.setState(AgentState.摸鱼中); }, 3000);
            }
          }, 8000);
        }
      } else if (agent.state === AgentState.摸鱼中 && rand < 0.45) {
        agent.setState(AgentState.Reading); agent.speechBubble = '📖 看文档...'; agent.speechTimer = 6;
      } else if (agent.state === AgentState.摸鱼中 && rand < 0.55) {
        agent.setState(AgentState.Waiting); agent.speechBubble = '🤔 想想...'; agent.speechTimer = 5;
      }
    }
  }

  // 🖨️ 打印机卡纸事件 — 触发卡纸，替换打印机 tile
  private triggerPrinterJam(): void {
    this.printerJamActive = true;
    this.printerJamTimer = 0;
    this.printerFixer = null;

    // 找到所有打印机位置并替换为卡纸状态
    this.printerJamPositions = [];
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        if (this.tileMap.tiles[y][x] === TileType.Printer) {
          this.printerJamPositions.push({ x, y });
          this.tileMap.setIf(x, y, TileType.PrinterJam);
        }
      }
    }

    // 随机选一台打印机卡纸（如果有多台，只卡一台）
    if (this.printerJamPositions.length > 1) {
      // 保留一台正常工作，其余恢复
      const jamIndex = Math.floor(Math.random() * this.printerJamPositions.length);
      for (let i = 0; i < this.printerJamPositions.length; i++) {
        if (i !== jamIndex) {
          const pos = this.printerJamPositions[i];
          this.tileMap.setIf(pos.x, pos.y, TileType.Printer);
          this.printerJamPositions = [this.printerJamPositions[jamIndex]];
        }
      }
    }

    const jamMsg = [
      '🖨️ 打印机卡纸了！谁来修修？',
      '📄 打印机又卡纸了！第 N 次了！',
      '🖨️ "谁把打印机弄坏了？！"',
      '📄 打印机：ERROR 404 纸张未找到',
    ][Math.floor(Math.random() * 4)];
    this.renderer.triggerEvent(jamMsg, 12);
    this.renderer.getSoundSystem().playEvent();
  }

  // 🖨️ 指派一个空闲 agent 去修打印机
  private assignPrinterFixer(): void {
    const idleAgents = this.agents.filter(a =>
      (a.state === AgentState.Idle || a.state === AgentState.摸鱼中) &&
      a.config.name !== this.printerFixer
    );
    if (idleAgents.length === 0) return;

    const fixer = idleAgents[Math.floor(Math.random() * idleAgents.length)];
    this.printerFixer = fixer.config.name;

    // 走到打印机位置
    if (this.printerJamPositions.length > 0) {
      const printer = this.printerJamPositions[0];
      fixer.targetX = printer.x;
      fixer.targetY = printer.y + 1; // 站在打印机前面
      fixer.setState(AgentState.Walking);
      fixer.speechBubble = '🖨️ 我来修打印机...';
      fixer.speechTimer = 4;
    }

    const fixerMsg = [
      `🔧 ${fixer.config.name} 去修打印机了`,
      `🛠️ ${fixer.config.name} 被拉去修打印机`,
      `😮‍💨 ${fixer.config.name} 叹气：怎么又是我修打印机`,
    ][Math.floor(Math.random() * 3)];
    this.renderer.triggerEvent(fixerMsg, 8);
  }

  // 🖨️ 修好打印机，恢复 tile
  private fixPrinter(): void {
    for (const pos of this.printerJamPositions) {
      this.tileMap.setIf(pos.x, pos.y, TileType.Printer);
    }

    if (this.printerFixer) {
      const fixer = this.agents.find(a => a.config.name === this.printerFixer);
      if (fixer) {
        fixer.speechBubble = ['✅ 修好了！', '🙌 搞定！', '😤 终于修好了！'][Math.floor(Math.random() * 3)];
        fixer.speechTimer = 4;
      }
    }

    this.renderer.triggerEvent('✅ 打印机修好了！恢复正常', 6);
    this.printerJamActive = false;
    this.printerJamTimer = 0;
    this.printerFixer = null;
    this.printerJamPositions = [];
  }

  // 🚶‍♂️ 饭后散步 — 吃完饭不急着回工位，在办公室溜达消食
  private startPostLunchWalk(agent: Agent): void {
    if (agent.state === AgentState.Walking) return;

    const postLunchRoutes = [
      // 路线1：茶水间接咖啡 → 公告栏看通知 → 回工位
      [
        { x: 13, y: 8, msg: '☕ 饭后一杯咖啡，完美...' },
        { x: 11, y: 10, msg: '📌 看看公告栏有啥通知...' },
      ],
      // 路线2：窗边看风景 → 饮水机接水 → 回工位
      [
        { x: 1, y: 4, msg: '🌤️ 窗边吹吹风，消消食...' },
        { x: 12, y: 8, msg: '💧 接杯水，继续干活' },
      ],
      // 路线3：沙发上瘫一会儿 → 和猫玩 → 回工位
      [
        { x: 3, y: 8, msg: '🛋️ 沙发瘫一会儿...好舒服...' },
        { x: 5, y: 9, msg: '🐱 撸撸猫，回血...' },
      ],
      // 路线4：去走廊看白板 → 和遇到的同事聊两句 → 回工位
      [
        { x: 2, y: 1, msg: '📋 看看白板上的任务...' },
        { x: 8, y: 8, msg: '💬 碰到同事聊两句...' },
      ],
      // 路线5：纯消食路线 — 在走廊慢慢走一圈
      [
        { x: 9, y: 8, msg: '🚶 饭后走一走，活到九十九...' },
        { x: 10, y: 6, msg: '🤔 下午干点啥呢...' },
      ],
      // 路线6：休息区看电视 → 看导向箭头确认方向 → 回工位
      [
        { x: 3, y: 8, msg: '📺 看会儿电视消消食...' },
        { x: 9, y: 7, msg: '🪧 原来茶水间在那边...' },
      ],
    ];

    const route = postLunchRoutes[Math.floor(Math.random() * postLunchRoutes.length)];
    let delay = 0;

    for (let i = 0; i < route.length; i++) {
      const spot = route[i];
      const currentDelay = delay;
      setTimeout(() => {
        if (agent.state !== AgentState.Walking && agent.state !== AgentState.趴桌睡觉) {
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.walkTo(spot.x, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 6;
            // 在每个点停留一会儿
            setTimeout(() => {
              // 最后一个点之后回工位
              if (i === route.length - 1) {
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking && agent.state !== AgentState.趴桌睡觉) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) {
                        agent.setState(AgentState.Typing);
                        agent.speechBubble = '💪 消食完毕，下午继续搬砖！';
                        agent.speechTimer = 6;
                      }
                    }, 3000);
                  }
                }, 5000 + Math.random() * 3000);
              }
            }, 4000 + Math.random() * 3000);
          }
        }
      }, currentDelay);
      delay += 8000 + Math.random() * 4000;
    }
  }

  // 💧 饮水机闲聊 — 两个 agent 同时在饮水机旁边时触发
  private checkWaterCoolerGossip(): void {
    const waterCoolerSpots = [
      { x: 11, y: 8 }, { x: 12, y: 8 }, { x: 13, y: 8 },
      { x: 11, y: 9 }, { x: 12, y: 9 }, { x: 13, y: 9 },
    ];

    const atWaterCooler = this.agents.filter(a => {
      return waterCoolerSpots.some(s => Math.abs(a.x - s.x) <= 1.5 && Math.abs(a.y - s.y) <= 1.5);
    });

    if (atWaterCooler.length >= 2) {
      const pairKey = atWaterCooler.slice(0, 2).map(a => a.id).sort().join('-');
      const cooldownKey = `water-${pairKey}`;
      const now = Date.now();
      const cooldown = this.gossipCooldown.get(cooldownKey) || 0;

      if (now > cooldown) {
        const waterGossip = [
          { a: '今天喝了几杯水了？', b: '记不清了，反正比咖啡多 😅' },
          { a: '这个饮水机过滤效果好吗？', b: '还行吧，总比直接喝自来水强 💧' },
          { a: '你说多喝水能减肥吗？', b: '能，前提是你不是边喝水边吃零食 🤣' },
          { a: '饮水机又没水了...', b: '我刚换了一桶，太重了 💪' },
          { a: '你听到隔壁组的八卦了吗？', b: '没有！快说快说 👀' },
          { a: '每天来接水就为活动一下', b: '带薪散步，聪明 🚶' },
          { a: '你觉得公司该换个大点的饮水机吗？', b: '该换的是空调吧，热死了 🥵' },
          { a: '接水的时候遇到你好巧', b: '是啊，每天最期待的就是接水时间 😂' },
        ];
        const gossip = waterGossip[Math.floor(Math.random() * waterGossip.length)];
        const [a, b] = atWaterCooler;

        a.speechBubble = `${b.config.name}: "${gossip.a}"`;
        a.speechTimer = 5;
        a.facing = a.x < b.x ? 'right' : 'left';

        setTimeout(() => {
          if (b.state !== AgentState.Walking) {
            b.speechBubble = `${a.config.name}: "${gossip.b}"`;
            b.speechTimer = 5;
            b.facing = b.x < a.x ? 'right' : 'left';
          }
        }, 2000);

        this.gossipCooldown.set(cooldownKey, now + 50000);
      }
    }
  }

  // 🍽️ 午餐桌闲聊 — 两个 agent 同时在午餐桌吃饭时触发
  private checkLunchTableGossip(): void {
    const lunchTableSpots = [
      { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 },
      { x: 7, y: 8 }, { x: 9, y: 8 },
      { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
    ];

    const atLunchTable = this.agents.filter(a => {
      return lunchTableSpots.some(s => Math.abs(a.x - s.x) <= 1.5 && Math.abs(a.y - s.y) <= 1.5);
    });

    if (atLunchTable.length >= 2) {
      const pairKey = atLunchTable.slice(0, 2).map(a => a.id).sort().join('-');
      const cooldownKey = `lunch-${pairKey}`;
      const now = Date.now();
      const cooldown = this.gossipCooldown.get(cooldownKey) || 0;

      if (now > cooldown) {
        const lunchGossip = [
          { a: '你吃的啥？', b: '黄焖鸡，天天吃不腻 🍗' },
          { a: '这家外卖不错', b: '是吗？推给我！' },
          { a: '今天自己做的饭', b: '大厨啊！分我一口 😋' },
          { a: '沙拉减肥中', b: '得了吧，下午肯定点奶茶 🧋' },
          { a: '食堂的菜越来越难吃了', b: '还不如点外卖呢' },
          { a: '你带的水果好新鲜', b: '早上在水果店买的，超甜 🍓' },
          { a: '中午吃太饱了...', b: '我也是，下午要犯困了 😴' },
          { a: '谁又点了螺蛳粉？', b: '不是我，但闻着好香 🤤' },
        ];
        const gossip = lunchGossip[Math.floor(Math.random() * lunchGossip.length)];
        const [a, b] = atLunchTable;

        a.speechBubble = `${b.config.name}: "${gossip.a}"`;
        a.speechTimer = 5;
        a.facing = a.x < b.x ? 'right' : 'left';

        setTimeout(() => {
          if (b.state !== AgentState.Walking) {
            b.speechBubble = `${a.config.name}: "${gossip.b}"`;
            b.speechTimer = 5;
            b.facing = b.x < a.x ? 'right' : 'left';
          }
        }, 2000);

        this.gossipCooldown.set(cooldownKey, now + 60000);
      }
    }
  }

  // 🍵 茶水间闲聊：两个 agent 同时出现在茶水间时触发专属 gossip
  private checkTeaRoomGossip(): void {
    const teaRoomSpots = [
      { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 16, y: 8 }, { x: 17, y: 8 }, // 茶水间前排
      { x: 13, y: 9 }, { x: 14, y: 9 }, { x: 15, y: 9 }, { x: 16, y: 9 }, // 茶水间中排
      { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }, // 茶水间后排
      { x: 10, y: 9 }, // 饮水机旁
    ];

    const inTeaRoom = this.agents.filter(a => {
      return teaRoomSpots.some(s => Math.abs(a.x - s.x) <= 1.5 && Math.abs(a.y - s.y) <= 1.5);
    });

    if (inTeaRoom.length >= 2) {
      const pairKey = inTeaRoom.slice(0, 2).map(a => a.id).sort().join('-');
      const cooldownKey = `tea-${pairKey}`;
      const now = Date.now();
      const cooldown = this.gossipCooldown.get(cooldownKey) || 0;

      if (now > cooldown) {
        const gossip = TEA_ROOM_GOSSIP[Math.floor(Math.random() * TEA_ROOM_GOSSIP.length)];
        const [a, b] = inTeaRoom;

        a.speechBubble = `${b.config.name}: "${gossip.a}"`;
        a.speechTimer = 5;
        a.facing = a.x < b.x ? 'right' : 'left';

        setTimeout(() => {
          if (b.state !== AgentState.Walking) {
            b.speechBubble = `${a.config.name}: "${gossip.b}"`;
            b.speechTimer = 5;
            b.facing = b.x < a.x ? 'right' : 'left';
          }
        }, 2000);

        this.gossipCooldown.set(cooldownKey, now + 45000);
      }
    }
  }

  // 🪑 吧台椅闲聊 — 两个 agent 同时坐在茶水间吧台椅上时触发闲聊
  private checkBarStoolGossip(): void {
    const barStoolSpots = [
      { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 },
    ];

    const atBarStools = this.agents.filter(a => {
      // Agent is considered "at a bar stool" if they're on or very near a stool tile
      return barStoolSpots.some(s => Math.abs(a.x - s.x) <= 1 && Math.abs(a.y - s.y) <= 1);
    });

    if (atBarStools.length >= 2) {
      const pairKey = atBarStools.slice(0, 2).map(a => a.id).sort().join('-');
      const cooldownKey = `barstool-${pairKey}`;
      const now = Date.now();
      const cooldown = this.gossipCooldown.get(cooldownKey) || 0;

      if (now > cooldown) {
        const barStoolGossip = [
          { a: '这吧台椅坐着真舒服', b: '是啊，比工位椅子舒服多了 🪑' },
          { a: '你也是来接咖啡的？', b: '对，下午不喝一杯扛不住 ☕' },
          { a: '今天工作进度怎么样？', b: '别提了，需求又改了 😮‍💨' },
          { a: '晚上吃什么？', b: '还没想好，你推荐一家 🤔' },
          { a: '听说楼下开了家新店', b: '真的？下班去试试 🍜' },
          { a: '周末有什么计划？', b: '在家躺两天，谁也别叫我 🛌' },
          { a: '你用过那个新出的AI工具吗？', b: '用了，确实能提高不少效率 🤖' },
          { a: '老板今天心情怎么样？', b: '看着还行，应该没挨骂 😅' },
          { a: '公司什么时候涨工资啊', b: '做梦吧，先把KPI过了再说 💰' },
          { a: '我觉得咱们该提个加薪', b: '你先去说，我后面跟着 🫣' },
        ];
        const gossip = barStoolGossip[Math.floor(Math.random() * barStoolGossip.length)];
        const [a, b] = atBarStools;

        a.speechBubble = `${b.config.name}: "${gossip.a}"`;
        a.speechTimer = 5;
        a.facing = a.x < b.x ? 'right' : 'left';

        setTimeout(() => {
          if (b.state !== AgentState.Walking) {
            b.speechBubble = `${a.config.name}: "${gossip.b}"`;
            b.speechTimer = 5;
            b.facing = b.x < a.x ? 'right' : 'left';
          }
        }, 2000);

        this.gossipCooldown.set(cooldownKey, now + 50000);
      }
    }
  }

  // ☕ 咖啡机排队系统 — 多人想接咖啡时自动排队，真实办公室经典场景
  private tryGetCoffee(agent: any): void {
    const coffeeX = 13; // 咖啡机位置
    const coffeeY = 9;

    if (!this.coffeeMachineBusy) {
      // 咖啡机空闲，直接使用
      this.coffeeMachineBusy = true;
      this.coffeeMachineUser = agent.config.name;
      this.coffeeMachineTimer = 6 + Math.random() * 4; // 6-10秒

      const useMessages = [
        '☕ 续命咖啡...',
        '☕ 来杯美式，今天还得加班呢',
        '☕ 不加糖不加奶，打工人标配',
        '☕ 再来一杯，下午靠这个续命',
      ];
      agent.walkTo(coffeeX - 1, coffeeY, this.tileMap);
      agent.speechBubble = useMessages[Math.floor(Math.random() * useMessages.length)];
      agent.speechTimer = 4;
    } else if (this.coffeeQueue.length < this.coffeeQueueSpots.length) {
      // 咖啡机忙，加入排队
      const spotIndex = this.coffeeQueue.length;
      const spot = this.coffeeQueueSpots[spotIndex];
      this.coffeeQueue.push(agent.config.name);

      const queueMessages = [
        '☕ 前面还有人？排排队...',
        '☕ 等我前面的那位接完...',
        '☕ 排个队，顺便想想下午干什么',
      ];
      agent.walkTo(spot.x, spot.y, this.tileMap);
      agent.speechBubble = queueMessages[Math.floor(Math.random() * queueMessages.length)];
      agent.speechTimer = 4;

      // 排队闲聊 — 如果前面还有人
      if (this.coffeeQueue.length >= 2) {
        this.coffeeQueueGossipCooldown -= 1;
        if (this.coffeeQueueGossipCooldown <= 0) {
          const q = this.coffeeQueue;
          const gossipPairs = [
            { a: '这咖啡机怎么这么慢', b: '人家在慢慢拉花呢 ☕' },
            { a: '你也来接咖啡？', b: '不接咖啡下午怎么活得下去' },
            { a: '今天第几杯了？', b: '第三杯...别告诉我老板 🤫' },
            { a: '排队正好摸会儿鱼', b: '嘘，别被leader看到 👀' },
            { a: '你说咖啡机能不能自动出钱', b: '那老板得哭死 😂' },
            { a: '我困得不行了', b: '接完这杯就好了，加油！' },
          ];
          const gossip = gossipPairs[Math.floor(Math.random() * gossipPairs.length)];
          const firstInQueue = this.agents.find(a => a.config.name === q[0]);
          const secondInQueue = this.agents.find(a => a.config.name === q[1]);
          if (firstInQueue && secondInQueue) {
            firstInQueue.speechBubble = gossip.a;
            firstInQueue.speechTimer = 4;
            setTimeout(() => {
              if (secondInQueue.state !== AgentState.Walking) {
                secondInQueue.speechBubble = gossip.b;
                secondInQueue.speechTimer = 4;
              }
            }, 2000);
            this.coffeeQueueGossipCooldown = 30; // 30秒冷却
          }
        }
      }
    } else {
      // 队列满了，不去接了
      if (Math.random() < 0.3) {
        agent.speechBubble = '☕ 排队的人太多了，算了...';
        agent.speechTimer = 3;
      }
    }
  }

  // ☕ 更新咖啡机状态 — 每秒检查一次
  private updateCoffeeMachine(deltaTime: number): void {
    if (this.coffeeMachineBusy && this.coffeeMachineUser) {
      this.coffeeMachineTimer -= deltaTime;

      if (this.coffeeMachineTimer <= 0) {
        // 当前用户接完咖啡
        const user = this.agents.find(a => a.config.name === this.coffeeMachineUser);
        if (user && user.state !== AgentState.Walking) {
          user.setState(AgentState.Waiting);
          const doneMessages = [
            '☕ 接好了！香！',
            '☕ 搞定，满血复活！',
            '☕ 续命成功！',
          ];
          user.speechBubble = doneMessages[Math.floor(Math.random() * doneMessages.length)];
          user.speechTimer = 4;

          setTimeout(() => {
            if (user.state !== AgentState.Walking) {
              user.walkTo(user.config.deskX, user.config.deskY + 1, this.tileMap);
              setTimeout(() => {
                if (user.state !== AgentState.Walking) {
                  user.setState(AgentState.Typing);
                }
              }, 3000);
            }
          }, 2000);
        }

        this.coffeeMachineBusy = false;
        this.coffeeMachineUser = null;

        // 下一个排队的人上前
        if (this.coffeeQueue.length > 0) {
          const next = this.coffeeQueue.shift()!;
          const nextAgent = this.agents.find(a => a.config.name === next);
          if (nextAgent) {
            this.coffeeMachineBusy = true;
            this.coffeeMachineUser = nextAgent.config.name;
            this.coffeeMachineTimer = 6 + Math.random() * 4;

            nextAgent.walkTo(12, 9, this.tileMap); // 走到咖啡机前
            nextAgent.speechBubble = '☕ 轮到我了！';
            nextAgent.speechTimer = 3;

            // 后面的人往前挪
            this.coffeeQueue.forEach((queued, i) => {
              const spot = this.coffeeQueueSpots[i];
              const queuedAgent = this.agents.find(a => a.config.name === queued);
              if (queuedAgent) {
                queuedAgent.walkTo(spot.x, spot.y, this.tileMap);
              }
            });
          }
        }
      }
    }

    // 冷却计时
    if (this.coffeeQueueGossipCooldown > 0) {
      this.coffeeQueueGossipCooldown -= deltaTime;
    }
  }

  // 🍱 微波炉排队系统 — 午餐时间热饭要排队，真实办公室经典场景
  private tryUseMicrowave(agent: any): void {
    const microwaveX = 15; // 微波炉位置
    const microwaveY = 9;

    if (!this.microwaveBusy) {
      // 微波炉空闲，直接使用
      this.microwaveBusy = true;
      this.microwaveUser = agent.config.name;
      this.microwaveTimer = 5 + Math.random() * 4; // 5-9秒热饭时间

      const useMessages = [
        '🍱 热个饭…今天带了红烧肉！',
        '🍛 加热咖喱饭，满屋飘香～',
        '🥡 昨天剩的炒饭热一下继续吃',
        '🍜 泡面三分钟，打工人标配',
        '🥘 我妈做的菜，微波炉叮一下就好',
        '🍲 热个汤，冬天暖胃…',
      ];
      agent.walkTo(microwaveX, microwaveY + 1, this.tileMap);
      agent.speechBubble = useMessages[Math.floor(Math.random() * useMessages.length)];
      agent.speechTimer = 4;
    } else if (this.microwaveQueue.length < this.microwaveQueueSpots.length) {
      // 微波炉忙，加入排队
      const spotIndex = this.microwaveQueue.length;
      const spot = this.microwaveQueueSpots[spotIndex];
      this.microwaveQueue.push(agent.config.name);

      const queueMessages = [
        '🍱 前面还有人？排个队等热饭…',
        '🍱 等我前面的那位热完…',
        '🍱 排队中，闻着别人的饭香饿了😤',
        '🍱 不急不急，正好刷会儿手机',
      ];
      agent.walkTo(spot.x, spot.y, this.tileMap);
      agent.speechBubble = queueMessages[Math.floor(Math.random() * queueMessages.length)];
      agent.speechTimer = 4;

      // 排队闲聊 — 如果前面还有人
      if (this.microwaveQueue.length >= 2 && this.microwaveQueueGossipCooldown <= 0) {
        const gossipPairs = [
          { a: '你带的什么好吃的？', b: '我妈做的红烧肉，香吧 😋' },
          { a: '这微波炉好慢啊', b: '中午大家都热饭，排队正常 🍱' },
          { a: '好饿啊…等不及了', b: '忍忍，马上轮到你 😅' },
          { a: '今天食堂的菜太难吃了', b: '所以我自带了，明智吧 💪' },
          { a: '你每天带饭吗？', b: '对啊，省钱又健康 🥗' },
          { a: '闻到香味了…谁的？', b: '我的我的，不好意思 😂' },
        ];
        const gossip = gossipPairs[Math.floor(Math.random() * gossipPairs.length)];
        const firstInQueue = this.agents.find(a => a.config.name === this.microwaveQueue[0]);
        const secondInQueue = this.agents.find(a => a.config.name === this.microwaveQueue[1]);
        if (firstInQueue && secondInQueue) {
          firstInQueue.speechBubble = gossip.a;
          firstInQueue.speechTimer = 4;
          setTimeout(() => {
            if (secondInQueue.state !== AgentState.Walking) {
              secondInQueue.speechBubble = gossip.b;
              secondInQueue.speechTimer = 4;
            }
          }, 2000);
          this.microwaveQueueGossipCooldown = 30;
        }
      }
    } else {
      // 队列满了，放弃
      if (Math.random() < 0.3) {
        agent.speechBubble = '🍱 排队太长了，算了吃冷饭吧…';
        agent.speechTimer = 3;
      }
    }
  }

  // 🍱 更新微波炉状态
  private updateMicrowaveQueue(deltaTime: number): void {
    if (this.microwaveBusy && this.microwaveUser) {
      this.microwaveTimer -= deltaTime;

      if (this.microwaveTimer <= 0) {
        // 当前用户热完饭
        const user = this.agents.find(a => a.config.name === this.microwaveUser);
        if (user && user.state !== AgentState.Walking) {
          user.setState(AgentState.Waiting);
          const doneMessages = [
            '🍱 叮！热好了！开吃！',
            '🍛 香喷喷的，满足～',
            '🥡 微波炉美食，打工人最爱！',
            '🍜 三分钟搞定午餐，高效！',
          ];
          user.speechBubble = doneMessages[Math.floor(Math.random() * doneMessages.length)];
          user.speechTimer = 4;

          setTimeout(() => {
            if (user.state !== AgentState.Walking) {
              // 回工位或去午餐区吃
              user.walkTo(user.config.deskX, user.config.deskY + 1, this.tileMap);
              setTimeout(() => {
                if (user.state !== AgentState.Walking) {
                  user.setState(AgentState.Idle);
                  user.speechBubble = '😋 开动了！';
                  user.speechTimer = 6;
                }
              }, 3000);
            }
          }, 2000);
        }

        this.microwaveBusy = false;
        this.microwaveUser = null;

        // 下一个排队的人上前
        if (this.microwaveQueue.length > 0) {
          const next = this.microwaveQueue.shift()!;
          const nextAgent = this.agents.find(a => a.config.name === next);
          if (nextAgent) {
            this.microwaveBusy = true;
            this.microwaveUser = nextAgent.config.name;
            this.microwaveTimer = 5 + Math.random() * 4;

            nextAgent.walkTo(15, 10, this.tileMap); // 走到微波炉前
            nextAgent.speechBubble = '🍱 轮到我了！';
            nextAgent.speechTimer = 3;

            // 后面的人往前挪
            this.microwaveQueue.forEach((queued, i) => {
              const spot = this.microwaveQueueSpots[i];
              const queuedAgent = this.agents.find(a => a.config.name === queued);
              if (queuedAgent) {
                queuedAgent.walkTo(spot.x, spot.y, this.tileMap);
              }
            });
          }
        }
      }
    }

    // 冷却计时
    if (this.microwaveQueueGossipCooldown > 0) {
      this.microwaveQueueGossipCooldown -= deltaTime;
    }
  }

  // 🛗 电梯等梯行为 — 上下班高峰期 agents 聚集电梯口等电梯
  private checkElevatorWaiting(chinaHour: number): void {
    // 早高峰 (8:00-10:00) 和晚高峰 (17:00-19:00)
    const isMorningRush = chinaHour >= 0 && chinaHour < 2; // UTC 0-2 = 中国 8-10
    const isEveningRush = chinaHour >= 9 && chinaHour < 11; // UTC 9-11 = 中国 17-19
    const isRushHour = isMorningRush || isEveningRush;

    if (!isRushHour) {
      // 非高峰期，清除等电梯状态
      this.elevatorWaiting.clear();
      return;
    }

    // 空闲的 agent 有概率去电梯口等
    const isWeekend = [0, 6].includes(new Date().getUTCDay());
    if (isWeekend) return;

    for (const agent of this.agents) {
      if (agent.isAbsent || agent.hasLeftOffice) continue;
      if (this.elevatorWaiting.has(agent.config.name)) continue;
      if (agent.state === AgentState.Walking) continue;

      // 空闲时有一定概率去等电梯
      const rushChance = isMorningRush ? 0.04 : 0.06;
      if ((agent.state === AgentState.Idle || agent.state === AgentState.摸鱼中) && Math.random() < rushChance) {
        this.elevatorWaiting.add(agent.config.name);

        // 电梯口位置 (7-8, 11)
        const elevatorSpots = [
          { x: 6, y: 11, msg: '🛗 等电梯中…' },
          { x: 9, y: 11, msg: '🛗 电梯怎么还不来…' },
          { x: 6, y: 10, msg: '🛗 按了上行键，等着…' },
          { x: 9, y: 10, msg: '🛗 今天电梯好慢啊' },
        ];
        const spot = elevatorSpots[Math.floor(Math.random() * elevatorSpots.length)];

        if (this.tileMap.isWalkable(spot.x, spot.y)) {
          agent.walkTo(spot.x, spot.y, this.tileMap);

          if (isMorningRush) {
            const morningMsgs = [
              '🛗 早高峰电梯难等啊…',
              '😴 还没睡醒就要上班了…',
              '☕ 早上不喝咖啡活不了…',
              '🏃 差点迟到，电梯快点来！',
              '🛗 今天电梯怎么这么慢！',
              '😫 周一早上不想上班…',
            ];
            agent.speechBubble = morningMsgs[Math.floor(Math.random() * morningMsgs.length)];
          } else {
            const eveningMsgs = [
              '🛗 终于下班了！冲！',
              '🎉 终于可以回家了！',
              '🏃 今天一定要赶上那班地铁！',
              '🛗 电梯快来快来…',
              '😮‍💨 终于可以走了，累死了',
              '🍜 下班去吃顿好的！',
            ];
            agent.speechBubble = eveningMsgs[Math.floor(Math.random() * eveningMsgs.length)];
          }
          agent.speechTimer = 5;
        }
      }
    }

    // 等电梯的 agent 之间闲聊
    const waitingAgents = this.agents.filter(a =>
      this.elevatorWaiting.has(a.config.name) &&
      a.state !== AgentState.Walking &&
      !a.isAbsent &&
      !a.hasLeftOffice
    );

    if (waitingAgents.length >= 2 && Math.random() < 0.08) {
      const pairKey = waitingAgents.slice(0, 2).map(a => a.config.name).sort().join('-');
      const cooldownKey = `elevator-${pairKey}`;
      const now = Date.now();
      const cooldown = this.gossipCooldown.get(cooldownKey) || 0;

      if (now > cooldown) {
        const [a, b] = waitingAgents;
        const isMorning = chinaHour >= 0 && chinaHour < 2;

        let gossip;
        if (isMorning) {
          const morningGossips = [
            { a: '你吃早饭了吗？', b: '没呢，到公司再吃 🥐' },
            { a: '今天好困啊', b: '我也是，昨晚又熬夜了 😴' },
            { a: '这电梯是蜗牛开的吗？', b: '早高峰都这样，习惯就好 🐌' },
            { a: '你今天看起来没睡醒', b: '谁不是呢…周一综合征 ☕' },
            { a: '你觉得今天会加班吗？', b: '别说了，我不想听 😰' },
            { a: '地铁上人太多了', b: '我都快被挤成照片了 📸' },
          ];
          gossip = morningGossips[Math.floor(Math.random() * morningGossips.length)];
        } else {
          const eveningGossips = [
            { a: '今天终于要走了！', b: '是啊，快饿扁了 🍜' },
            { a: '你晚上干嘛去？', b: '回家躺着，哪儿也不想去 🛌' },
            { a: '明天早上几点到？', b: '卡点到，9:29 打卡 😎' },
            { a: '今天工作还顺利吗？', b: '别提了，需求又改了 😮‍💨' },
            { a: '周末有什么安排？', b: '补觉！谁也别叫我 💤' },
            { a: '一起走吗？', b: '好啊，路上聊 🚶' },
          ];
          gossip = eveningGossips[Math.floor(Math.random() * eveningGossips.length)];
        }

        a.speechBubble = `${b.config.name}: "${gossip.a}"`;
        a.speechTimer = 5;
        a.facing = a.x < b.x ? 'right' : 'left';

        setTimeout(() => {
          if (b.state !== AgentState.Walking) {
            b.speechBubble = `${a.config.name}: "${gossip.b}"`;
            b.speechTimer = 5;
            b.facing = b.x < a.x ? 'right' : 'left';
          }
        }, 2000);

        this.gossipCooldown.set(cooldownKey, now + 50000);
      }
    }

    // 等电梯一段时间后，agent 回到工位（或真的离开）
    for (const agent of waitingAgents) {
      if (agent.state !== AgentState.Walking && Math.random() < 0.02) {
        this.elevatorWaiting.delete(agent.config.name);
        if (isEveningRush && Math.random() < 0.3) {
          // 下班了，离开办公室
          agent.hasLeftOffice = true;
          agent.speechBubble = '👋 走了走了，明天见！';
          agent.speechTimer = 4;
          setTimeout(() => {
            if (agent.hasLeftOffice) {
              agent.walkTo(8, 12, this.tileMap);
              setTimeout(() => {
                if (agent.hasLeftOffice) { agent.x = -10; agent.y = -10; }
              }, 4000);
            }
          }, 3000);
        } else {
          // 不等了，回工位
          agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
          agent.speechBubble = '🛗 电梯太慢了，回去继续摸鱼…';
          agent.speechTimer = 4;
        }
      }
    }
  }

  // 📽️ 会议室检测 — agents 聚集会议室时触发投影仪效果
  private checkMeetingRoom(): void {
    const meetingSpots = [
      // 会议室走道区域 — 围绕会议桌 (x:3-5, y:1-2)
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 },
      { x: 1, y: 2 }, { x: 2, y: 2 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 7, y: 2 }, { x: 7, y: 3 },
    ];

    const inMeeting = this.agents.filter(a => {
      return meetingSpots.some(s => Math.abs(a.x - s.x) <= 1.5 && Math.abs(a.y - s.y) <= 1.5);
    });

    const count = inMeeting.length;
    this.renderer.setMeetingRoomActive(count >= 2, count);

    // 会议话题 — agents 在会议室时显示对话
    if (count >= 2 && Math.random() < 0.01) {
      const meetingTopics = [
        '这个需求得重新评估',
        '技术方案谁写？',
        '排期太紧了...',
        '这个 sprint 能交付吗？',
        '先 MVP 上线吧',
        '用户反馈怎么说？',
        '得加个灰度发布',
        '性能指标达标了吗？',
        '这个会开 2 小时了...',
        '咱们快速对齐一下',
      ];
      const speaker = inMeeting[Math.floor(Math.random() * inMeeting.length)];
      const topic = meetingTopics[Math.floor(Math.random() * meetingTopics.length)];
      speaker.speechBubble = `📽️ "${topic}"`;
      speaker.speechTimer = 4;
    }
  }

  addAgent(): void {
    if (this.nextAgentIndex >= this.deskSpots.length) return;
    const spot = this.deskSpots[this.nextAgentIndex];
    this.agents.push(new Agent({ name: AGENT_NAMES[this.nextAgentIndex], role: AGENT_ROLES[this.nextAgentIndex], deskX: spot.x, deskY: spot.y }, this.tileMap));
    this.nextAgentIndex++;
  }

  reset(): void {
    this.agents = []; this.nextAgentIndex = 0; this.simTimer = 0; this.taskTimer = 0;
    this.agentTasks.clear(); this.completedTasks.clear(); this.eventTimer = 0;
    this.standupTriggered = false; this.deliveryTriggered = false;
    this.addAgent(); this.addAgent(); this.addAgent();
  }

  toggleKanban(): void { this.kanban.toggle(); }
  toggleSound(): boolean { return this.renderer.getSoundSystem().toggle(); }

  private updateStatusBar(): void {
    const emoji: Record<string, string> = { idle: '😴', typing: '⌨️', walking: '🚶', reading: '📖', waiting: '⏳', error: '❌', '趴桌睡觉': '💤', '摸鱼中': '🐟', '伸懒腰': '🙆', '打哈欠': '🥱' };
    const mode = this.useSimulation ? 'SIM' : 'LIVE';
    const stats = this.kanban.getStats();
    const atm = this.renderer.getDayNight().getState();
    const timeEmoji = atm.timeOfDay === 'night' ? '🌙' : atm.timeOfDay === 'dawn' ? '🌅' : atm.timeOfDay === 'evening' ? '🌇' : '☀️';
    const weatherEmoji = atm.weather === 'rain' ? '🌧️' : atm.weather === 'snow' ? '❄️' : atm.weather === 'cloudy' ? '☁️' : '🌤️';
    const bossStatus = this.boss.isVisible() ? '<span style="color:#e94560;margin-right:6px">👔 老板在！</span>' : '';

    // 📊 周末倒计时 — 距离周六还有几天
    const chinaDayOfWeek = (new Date().getUTCDay() + 8) % 7; // 1=周一 ... 6=周六, 0=周日
    let weekendInfo = '';
    if (chinaDayOfWeek === 6 || chinaDayOfWeek === 0) {
      weekendInfo = '<span style="color:#fbbf24;margin-right:8px">🎉 周末愉快！</span>';
    } else {
      const daysUntilWeekend = 6 - chinaDayOfWeek;
      const weekendLabel = daysUntilWeekend === 1 ? '明天就周末！' : `还有${daysUntilWeekend}天周末`;
      const weekendEmoji = daysUntilWeekend <= 2 ? '🤩' : daysUntilWeekend <= 3 ? '😊' : '💪';
      weekendInfo = `<span style="color:#94a3b8;margin-right:8px">${weekendEmoji} ${weekendLabel}</span>`;
    }
    this.statusBar.innerHTML = `
      <span style="color:#e94560;margin-right:4px">[${mode}]</span>
      <span style="color:#94a3b8;margin-right:6px">${timeEmoji}${weatherEmoji}</span>
      ${bossStatus}
      ${weekendInfo}
      <span style="color:#94a3b8;margin-right:8px">📋 ${stats.todo}→${stats.inProgress}→${stats.review}→${stats.done}</span>
      ${this.absentAgents.size > 0 ? `<span style="color:#94a3b8;margin-right:8px">🏖️ ${this.absentAgents.size}人请假</span>` : ''}
      ${this.weekendOvertimeAgents.size > 0 ? `<span style="color:#f59e0b;margin-right:8px">🌙 ${this.weekendOvertimeAgents.size}人周末加班</span>` : ''}
      ${this.birthdayAgent ? `<span style="color:#ff69b4;margin-right:8px">🎂 ${this.birthdayAgent} 生日快乐！</span>` : ''}
      ${this.leavedAgents.size > 0 ? `<span style="color:#f59e0b;margin-right:8px">🚶 ${this.leavedAgents.size}人已下班</span>` : ''}
      ${this.deliveryPersonActive ? `<span style="color:#f39c12;margin-right:8px">🛵 外卖到了！</span>` : ''}
    ` + this.agents.filter(a => !a.hasLeftOffice && !a.isAbsent).map(a => {
      const sc = a.state === AgentState.Typing || a.state === AgentState.Reading ? 'working' : a.state === AgentState.Waiting ? 'waiting' : a.state === AgentState.Error ? 'error' : a.state === AgentState.趴桌睡觉 ? 'idle' : 'idle';
      return `<div class="agent-status"><span class="status-dot ${sc}"></span><span>${a.config.role}</span><span>${emoji[a.state]}</span><span>${a.config.name}</span></div>`;
    }).join('');
  }

  private setupInteraction(): void {
    const enableAudio = () => { this.renderer.getSoundSystem().resume(); document.removeEventListener('click', enableAudio); };
    document.addEventListener('click', enableAudio);
    window.addEventListener('resize', () => this.renderer.resize(this.canvas));

    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
      const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
      if (this.interactions.handleObjectClick(tx, ty, this.agents, this.tileMap)) return;
      // Cat click — pet the cat
      if (this.cat && Math.round(this.cat.x) === tx && Math.round(this.cat.y) === ty) {
        const nearestAgent = this.agents.reduce((best, a) => {
          const d = Math.abs(a.x - this.cat!.x) + Math.abs(a.y - this.cat!.y);
          return d < best.dist ? { agent: a, dist: d } : best;
        }, { agent: null as Agent | null, dist: 999 });
        if (nearestAgent.agent && nearestAgent.dist < 5) {
          this.cat.pet(nearestAgent.agent.config.name);
        }
        return;
      }
      for (const a of this.agents) {
        if (Math.round(a.x) === tx && Math.round(a.y) === ty) {
          // 趴桌睡觉的 agent — 点击叫醒
          if (a.state === AgentState.趴桌睡觉) {
            a.setState(AgentState.Idle);
            a.speechBubble = '😳 谁叫我？！';
            a.speechTimer = 3;
            return;
          }
          const states = [AgentState.Typing, AgentState.Reading, AgentState.Waiting, AgentState.摸鱼中];
          a.setState(states[(states.indexOf(a.state) + 1) % states.length]); return;
        }
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
      const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
      this.renderer.setHoverTile(tx, ty);
      let found = false;
      // Cat hover
      if (this.cat && Math.round(this.cat.x) === tx && Math.round(this.cat.y) === ty) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.clientX + 12) + 'px';
        this.tooltip.style.top = (e.clientY + 12) + 'px';
        this.tooltip.innerHTML = `<strong>🐱 办公室猫咪</strong><br>状态：${this.cat.state}<br>${this.cat.state === CatState.Sleeping ? '点击撸猫！' : '走来走去...'}`;
        found = true;
      }
      for (const a of this.agents) {
        if (Math.round(a.x) === tx && Math.round(a.y) === ty) {
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (e.clientX + 12) + 'px'; this.tooltip.style.top = (e.clientY + 12) + 'px';
          const task = this.agentTasks.get(a.config.name);
          const taskInfo = task ? this.kanban.tasks.find(t => t.id === task) : null;
          this.tooltip.innerHTML = `<strong>${a.config.name}</strong><br>角色：${a.config.role}<br>状态：${a.state}<br>${taskInfo ? `任务：${taskInfo.title}<br>` : ''}动作：${a.speechBubble || (a.state === AgentState.趴桌睡觉 ? '💤 午休中...' : '摸鱼中')}<br>坐标：(${a.x}, ${a.y})`;
          found = true; break;
        }
      }
      if (!found) {
        const obj = this.interactions.getInteractableAt(tx, ty);
        if (obj) {
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (e.clientX + 12) + 'px'; this.tooltip.style.top = (e.clientY + 12) + 'px';
          this.tooltip.innerHTML = `<strong>${obj.emoji} ${obj.label}</strong><br>点击派一个 agent 去互动<br><span style="color:#64748b">动作：${obj.actionText}</span>`;
          found = true;
        }
      }
      if (!found) this.tooltip.style.display = 'none';
    });

    this.canvas.addEventListener('mouseleave', () => { this.renderer.setHoverTile(-1, -1); this.tooltip.style.display = 'none'; });

    // Konami code easter egg
    window.addEventListener('keydown', e => {
      this.konamiBuffer += e.code;
      if (this.konamiBuffer.length > this.konamiCode.length) this.konamiBuffer = this.konamiBuffer.slice(-this.konamiCode.length);
      if (this.konamiBuffer === this.konamiCode) {
        this.renderer.toggleDisco();
        this.konamiBuffer = '';
      }
    });

    document.getElementById('btn-add')?.addEventListener('click', () => this.addAgent());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.reset());
    document.getElementById('btn-kanban')?.addEventListener('click', () => this.toggleKanban());
    document.getElementById('btn-sound')?.addEventListener('click', () => {
      const enabled = this.toggleSound();
      const btn = document.getElementById('btn-sound');
      if (btn) btn.textContent = enabled ? '🔊 Sound' : '🔇 Muted';
    });
  }
}