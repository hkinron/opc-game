import { TileMap } from './TileMap';
import { Agent } from './Agent';
import { Renderer } from './Renderer';
import { AgentWebSocket, AgentEvent } from './AgentWebSocket';
import { KanbanBoard } from './KanbanBoard';
import { ConfigManager } from './ConfigSystem';
import { InteractionSystem } from './InteractionSystem';
import { AgentConfig, AgentRole, AgentState } from '../types';
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
  private gossipCooldown: Set<string> = new Set();
  private konamiBuffer: string = '';
  private konamiCode = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightKeyBKeyA';

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
    for (const agent of this.agents) agent.update(dt, this.tileMap);
    this.cat.update(dt, this.tileMap);
    this.boss.update(dt, this.tileMap);

    // Boss proximity: agents near the boss pretend to work
    if (this.boss.isVisible()) {
      for (const agent of this.agents) {
        if (this.boss.isNearby(agent.x, agent.y, 3)) {
          if (agent.state === AgentState.摸鱼中 || agent.state === AgentState.Idle || agent.state === AgentState.Waiting) {
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
    this.checkTeaRoomGossip();

    if (this.useSimulation) {
      this.taskTimer += dt;
      if (this.taskTimer > 5) { this.taskTimer = 0; this.assignTasks(); }
      this.simTimer += dt;
      if (this.simTimer > 12) { this.simTimer = 0; this.simulateAgentActivity(); }
    }

    // Task completion chime
    for (const agent of this.agents) {
      if (agent.state === AgentState.摸鱼中) {
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

    // 🕐 午休时间 (12:00-13:00 中国时间)
    const isLunchTime = chinaHour >= 12 && chinaHour < 13;
    // 😴 下午犯困 (14:00-15:00)
    const isSleepyTime = chinaHour >= 14 && chinaHour < 15;
    // 🎉 周五下午摸鱼 (15:00-18:00)
    const isFridayAfternoon = new Date().getUTCDay() === 5 && chinaHour >= 15 && chinaHour < 18;
    // 🌙 加班时间 (19:00-22:00)
    const isOvertime = chinaHour >= 19 && chinaHour < 22;
    // 🏠 下班后 (22:00-8:00)
    const isOffHours = chinaHour >= 22 || chinaHour < 8;
    // 😫 周一早上 (周一 8:00-10:00)
    const isMondayMorning = new Date().getUTCDay() === 1 && chinaHour >= 0 && chinaHour < 2; // UTC 0-2 = China 8-10
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

    // 🍜 午休时间：agent 离开座位去吃饭/休息
    if (isLunchTime) {
      for (const agent of this.agents) {
        if (agent.state === AgentState.Walking) continue;
        const rand = Math.random();
        if (rand < 0.15) {
          // 去茶水间加热午餐
          const spots = [
            { x: 9, y: 7, msg: '🍱 吃自带午餐...' },
            { x: 8, y: 7, msg: '🔥 微波炉热饭中...' },
            { x: 10, y: 9, msg: '🍪 饭后零食...' },
            { x: 9, y: 10, msg: '☕ 饭后咖啡...' },
            { x: 1, y: 7, msg: '🛋️ 沙发午休...' },
          ];
          const spot = spots[Math.floor(Math.random() * spots.length)];
          if (this.tileMap.isWalkable(spot.x, spot.y)) {
            agent.walkTo(spot.x, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 8;
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Idle);
                // 吃完后在附近晃一会儿
                setTimeout(() => {
                  if (agent.state === AgentState.Idle) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                    setTimeout(() => {
                      if (agent.state !== AgentState.Walking) agent.setState(AgentState.Typing);
                    }, 4000);
                  }
                }, 5000 + Math.random() * 5000);
              }
            }, 6000);
          }
        } else if (rand < 0.25) {
          agent.speechBubble = '😋 吃饭去了~';
          agent.speechTimer = 3;
        }
      }
    }

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
      } else if (this.agentTasks.has(agent.config.name) && agent.state === AgentState.Typing) {
        // 下午犯困：摸鱼概率翻倍
        const slackingChance = isSleepyTime ? 0.30 : isFridayAfternoon ? 0.40 : 0.15;
        if (Math.random() < slackingChance) {
          agent.setState(AgentState.摸鱼中);
          if (isSleepyTime) agent.speechBubble = '😴 好困啊...';
          else if (isFridayAfternoon) agent.speechBubble = '🐟 周五了，摸会儿...';
          agent.speechTimer = 5;
        }
        // 周一早上：低能量
        if (isMondayMorning && Math.random() < 0.1) {
          agent.speechBubble = '😫 不想上班...';
          agent.speechTimer = 4;
        }
      }
    }

    const spots = [
      { x: 7, y: 4, msg: '☕ 接杯咖啡...' }, { x: 1, y: 6, msg: '🛋️ 摸鱼中...' },
      { x: 2, y: 3, msg: '📝 看看白板...' }, { x: 10, y: 3, msg: '📚 翻翻文档...' },
      { x: 6, y: 8, msg: '💬 串个门...' },
      // 新增：卫生间 & 导向标识
      { x: 1, y: 9, msg: '🚻 上个厕所...' }, { x: 6, y: 6, msg: '🪧 看看指示牌...' },
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

  // 🍵 茶水间闲聊：两个 agent 同时出现在茶水间时触发专属 gossip
  private checkTeaRoomGossip(): void {
    const teaRoomSpots = [
      { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 17, y: 9 },
      { x: 16, y: 10 }, { x: 15, y: 10 }, { x: 18, y: 8 },
      { x: 14, y: 8 }, // 茶水间区域
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

  addAgent(): void {
    if (this.nextAgentIndex >= this.deskSpots.length) return;
    const spot = this.deskSpots[this.nextAgentIndex];
    this.agents.push(new Agent({ name: AGENT_NAMES[this.nextAgentIndex], role: AGENT_ROLES[this.nextAgentIndex], deskX: spot.x, deskY: spot.y }, this.tileMap));
    this.nextAgentIndex++;
  }

  reset(): void {
    this.agents = []; this.nextAgentIndex = 0; this.simTimer = 0; this.taskTimer = 0;
    this.agentTasks.clear(); this.completedTasks.clear(); this.eventTimer = 0;
    this.standupTriggered = false;
    this.addAgent(); this.addAgent(); this.addAgent();
  }

  toggleKanban(): void { this.kanban.toggle(); }
  toggleSound(): boolean { return this.renderer.getSoundSystem().toggle(); }

  private updateStatusBar(): void {
    const emoji: Record<string, string> = { idle: '😴', typing: '⌨️', walking: '🚶', reading: '📖', waiting: '⏳', error: '❌' };
    const mode = this.useSimulation ? 'SIM' : 'LIVE';
    const stats = this.kanban.getStats();
    const atm = this.renderer.getDayNight().getState();
    const timeEmoji = atm.timeOfDay === 'night' ? '🌙' : atm.timeOfDay === 'dawn' ? '🌅' : atm.timeOfDay === 'evening' ? '🌇' : '☀️';
    const weatherEmoji = atm.weather === 'rain' ? '🌧️' : atm.weather === 'snow' ? '❄️' : atm.weather === 'cloudy' ? '☁️' : '🌤️';
    const bossStatus = this.boss.isVisible() ? '<span style="color:#e94560;margin-right:6px">👔 老板在！</span>' : '';
    this.statusBar.innerHTML = `
      <span style="color:#e94560;margin-right:4px">[${mode}]</span>
      <span style="color:#94a3b8;margin-right:6px">${timeEmoji}${weatherEmoji}</span>
      ${bossStatus}
      <span style="color:#94a3b8;margin-right:8px">📋 ${stats.todo}→${stats.inProgress}→${stats.review}→${stats.done}</span>
    ` + this.agents.map(a => {
      const sc = a.state === AgentState.Typing || a.state === AgentState.Reading ? 'working' : a.state === AgentState.Waiting ? 'waiting' : a.state === AgentState.Error ? 'error' : 'idle';
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
          this.tooltip.innerHTML = `<strong>${a.config.name}</strong><br>角色：${a.config.role}<br>状态：${a.state}<br>${taskInfo ? `任务：${taskInfo.title}<br>` : ''}动作：${a.speechBubble || '摸鱼中'}<br>坐标：(${a.x}, ${a.y})`;
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