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
  private lateArrivals = new Set<string>(); // 🏃 记录今天已经迟到的 agent
  private leavingAgents = new Set<string>(); // 🚶 记录正在下班离开的 agent
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
    this.checkTeaRoomGossip();
    this.checkMeetingRoom();

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
        if (Math.random() < 0.08 && this.tileMap.isWalkable(12, 11)) {
          this.morningAttendanced.add(agent.config.name);
          agent.walkTo(12, 11, this.tileMap);
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
      for (const a of this.agents) { a.hasLeftOffice = false; a.hasArrivedToday = false; }
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
              lateAgent.walkTo(12, 11, this.tileMap);
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
        a.state === AgentState.Idle && !a.currentTask && this.tileMap.isWalkable(5, 11)
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
        availableAgent.walkTo(5, 11, this.tileMap);
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

    // 🍜 午休时间：agent 离开座位去吃饭/休息
    if (isLunchTime) {
      for (const agent of this.agents) {
        if (agent.state === AgentState.Walking) continue;
        const rand = Math.random();
        if (rand < 0.12) {
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
          }
        } else if (rand < 0.22) {
          agent.speechBubble = '😋 吃饭去了~';
          agent.speechTimer = 3;
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
      if (leaver && this.tileMap.isWalkable(8, 11)) {
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
        // 周一早上：低能量
        if (isMondayMorning && Math.random() < 0.1) {
          agent.speechBubble = '😫 不想上班...';
          agent.speechTimer = 4;
        }
        // ☕ 下午咖啡时间 (15:00-16:00) — 集体去接咖啡/买饮料
        if (isCoffeeRush && Math.random() < 0.15 && agent.state !== AgentState.Walking) {
          const coffeeSpots = [
            { x: 16, y: 8, msg: '☕ 续命咖啡...' },
            { x: 15, y: 10, msg: '💧 接杯水清醒一下...' },
            { x: 13, y: 8, msg: '🥤 自动售货机来罐红牛...' },
            { x: 17, y: 9, msg: '🍪 摸鱼吃零食回血...' },
          ];
          const spot = coffeeSpots[Math.floor(Math.random() * coffeeSpots.length)];
          if (this.tileMap.isWalkable(spot.x - 1, spot.y)) {
            agent.walkTo(spot.x - 1, spot.y, this.tileMap);
            agent.speechBubble = spot.msg;
            agent.speechTimer = 4;
            setTimeout(() => {
              if (agent.state !== AgentState.Walking) {
                agent.setState(AgentState.Typing);
                agent.speechBubble = '💪 复活了！继续干活！';
                agent.speechTimer = 6;
                setTimeout(() => {
                  if (agent.state !== AgentState.Walking) {
                    agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
                  }
                }, 5000 + Math.random() * 5000);
              }
            }, 6000 + Math.random() * 4000);
          }
        }
      }
    }

    const spots = [
      { x: 7, y: 4, msg: '☕ 接杯咖啡...' }, { x: 1, y: 6, msg: '🛋️ 摸鱼中...' },
      { x: 2, y: 3, msg: '📝 看看白板...' }, { x: 10, y: 3, msg: '📚 翻翻文档...' },
      { x: 6, y: 8, msg: '💬 串个门...' },
      // 新增：卫生间 & 导向标识 & 售货机 & 电话亭
      { x: 2, y: 6, msg: '🚻 上个厕所...' }, { x: 9, y: 7, msg: '🪧 看看指示牌...' },
      { x: 12, y: 8, msg: '🥤 售货机买瓶水...' }, { x: 5, y: 11, msg: '📞 接个电话...' },
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
    const emoji: Record<string, string> = { idle: '😴', typing: '⌨️', walking: '🚶', reading: '📖', waiting: '⏳', error: '❌', '趴桌睡觉': '💤', '摸鱼中': '🐟' };
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
      ${this.leavedAgents.size > 0 ? `<span style="color:#f59e0b;margin-right:8px">🚶 ${this.leavedAgents.size}人已下班</span>` : ''}
    ` + this.agents.filter(a => !a.hasLeftOffice).map(a => {
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