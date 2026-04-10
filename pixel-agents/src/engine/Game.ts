import { TileMap } from './TileMap';
import { Agent } from './Agent';
import { Renderer } from './Renderer';
import { AgentWebSocket, AgentEvent } from './AgentWebSocket';
import { KanbanBoard } from './KanbanBoard';
import { ConfigManager } from './ConfigSystem';
import { AgentConfig, AgentRole, AgentState } from '../types';

const AGENT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
const AGENT_ROLES: AgentRole[] = [AgentRole.Coder, AgentRole.Reviewer, AgentRole.Designer, AgentRole.Writer, AgentRole.Tester, AgentRole.Coder];

const KANBAN_POSITION = { x: 1, y: 1 };

export interface GameOptions {
  wsUrl?: string;
  theme?: string;
  layout?: string;
  skins?: string;
}

export class Game {
  private tileMap: TileMap;
  private renderer: Renderer;
  private agents: Agent[] = [];
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
  private deskSpots: { x: number; y: number }[];
  private agentTasks: Map<string, string> = new Map();

  // Completion tracking for sound effects
  private completedTasks: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, statusBar: HTMLElement, tooltip: HTMLElement, options: GameOptions = {}) {
    this.canvas = canvas;
    this.statusBar = statusBar;
    this.tooltip = tooltip;
    this.config = new ConfigManager();

    // Apply config from query params
    if (options.theme) this.config.setTheme(options.theme);
    if (options.layout) this.config.setLayout(options.layout);
    if (options.skins) this.config.setSkins(options.skins);

    const layout = this.config.getLayout();
    this.deskSpots = layout.desks;
    this.tileMap = new TileMap(layout.width, layout.height, layout.furniture);
    this.renderer = new Renderer(canvas, this.tileMap, this.config.getTheme());
    this.kanban = new KanbanBoard();
    this.setupDefaultTasks();
    this.setupInteraction();

    if (options.wsUrl) this.connectWebSocket(options.wsUrl);
  }

  private setupDefaultTasks(): void {
    this.kanban.addTask('Build auth system', 'Implement JWT login + refresh', 'high');
    this.kanban.addTask('Design landing page', 'Create hero section + features', 'medium');
    this.kanban.addTask('Write API docs', 'Document REST endpoints', 'low');
    this.kanban.addTask('Setup CI/CD', 'GitHub Actions for deploy', 'medium');
    this.kanban.addTask('Fix login bug', 'Users can\'t reset password', 'high');
    this.kanban.addTask('Add unit tests', 'Coverage for utils module', 'medium');
  }

  private connectWebSocket(url: string): void {
    this.useSimulation = false;
    this.ws = new AgentWebSocket(url);
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
      const config: AgentConfig = {
        name: event.agentId || AGENT_NAMES[this.nextAgentIndex],
        role: AGENT_ROLES[this.nextAgentIndex],
        deskX: spot.x, deskY: spot.y,
      };
      agent = new Agent(config, this.tileMap);
      this.agents.push(agent);
      this.wsAgentMap.set(event.agentId, agent);
      this.nextAgentIndex++;
    }
    if (!agent) return;

    switch (event.type) {
      case 'file_write': case 'command':
        agent.setState(AgentState.Typing);
        agent.speechBubble = `✏️ ${event.file || event.command || 'working...'}`;
        agent.speechTimer = 8; break;
      case 'file_read':
        agent.setState(AgentState.Reading);
        agent.speechBubble = `📖 ${event.file || 'reading...'}`;
        agent.speechTimer = 6; break;
      case 'error':
        agent.setState(AgentState.Error);
        agent.speechBubble = `💥 ${event.message || 'error!'}`;
        agent.speechTimer = 5; break;
      case 'waiting':
        agent.setState(AgentState.Waiting);
        agent.speechBubble = `⏳ ${event.message || 'waiting...'}`;
        agent.speechTimer = 10; break;
      case 'state_change':
        if (event.state) agent.setState(event.state as AgentState);
        break;
    }
  }

  start(): void {
    this.addAgent(); this.addAgent(); this.addAgent();
    this.running = true; this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.update(dt);
    this.renderer.render(this.agents, now / 1000);
    this.updateStatusBar();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    for (const agent of this.agents) agent.update(dt, this.tileMap);

    // Sound effects — check per agent
    const sounds = this.renderer.getSoundSystem();
    for (const agent of this.agents) {
      if (agent.shouldPlayTypingSound(dt)) sounds.playTyping();
      if (agent.shouldPlayFootstepSound()) sounds.playFootstep();
    }

    // Task assignment logic (every 5 seconds in sim mode)
    if (this.useSimulation) {
      this.taskTimer += dt;
      if (this.taskTimer > 5) {
        this.taskTimer = 0;
        this.assignTasks();
      }

      this.simTimer += dt;
      if (this.simTimer > 2) {
        this.simTimer = 0;
        this.simulateAgentActivity();
      }
    }

    // Check if agents completed their tasks (play completion chime)
    for (const agent of this.agents) {
      if (agent.state === AgentState.Idle) {
        const taskId = this.agentTasks.get(agent.config.name);
        if (taskId && !this.completedTasks.has(taskId)) {
          this.completedTasks.add(taskId);
          sounds.playCompletion();
          this.kanban.moveTask(taskId, 'review');
          agent.speechBubble = `✅ Done! Moving to review`;
          agent.speechTimer = 4;
          this.agentTasks.delete(agent.config.name);
        }
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
          agent.speechBubble = `📋 Taking: ${task.title}`;
          agent.speechTimer = 5;

          // Play task pickup sound
          this.renderer.getSoundSystem().playTaskPickup();

          // Walk to Kanban board area, then back to desk
          agent.walkTo(KANBAN_POSITION.x, KANBAN_POSITION.y, this.tileMap);

          setTimeout(() => {
            if (agent.state !== AgentState.Walking) {
              agent.walkTo(agent.config.deskX, agent.config.deskY + 1, this.tileMap);
              setTimeout(() => {
                agent.setState(AgentState.Typing);
                agent.speechBubble = `💻 ${task.title}`;
                agent.speechTimer = 10;
              }, 2000);
            }
          }, 3000);
        }
      }
    }
  }

  private simulateAgentActivity(): void {
    if (this.agents.length === 0) return;

    for (const agent of this.agents) {
      if (this.agentTasks.has(agent.config.name) && agent.state === AgentState.Idle) {
        agent.setState(AgentState.Typing);
        const task = this.kanban.getAgentTask(agent.config.name);
        if (task) agent.speechBubble = `💻 ${task.title}`;
        agent.speechTimer = 8;
      } else if (this.agentTasks.has(agent.config.name) && agent.state === AgentState.Typing) {
        if (Math.random() < 0.15) {
          agent.setState(AgentState.Idle);
        }
      }
    }

    for (const agent of this.agents) {
      if (!this.agentTasks.has(agent.config.name) && (agent.state === AgentState.Idle || agent.state === AgentState.Typing || agent.state === AgentState.Reading)) {
        const rand = Math.random();
        if (rand < 0.3) agent.setState(AgentState.Reading);
        else if (rand < 0.5) agent.setState(AgentState.Waiting);
      }
    }
  }

  addAgent(): void {
    if (this.nextAgentIndex >= this.deskSpots.length) return;
    const spot = this.deskSpots[this.nextAgentIndex];
    const config: AgentConfig = {
      name: AGENT_NAMES[this.nextAgentIndex],
      role: AGENT_ROLES[this.nextAgentIndex],
      deskX: spot.x, deskY: spot.y,
    };
    this.agents.push(new Agent(config, this.tileMap));
    this.nextAgentIndex++;
  }

  reset(): void {
    this.agents = [];
    this.nextAgentIndex = 0;
    this.simTimer = 0;
    this.taskTimer = 0;
    this.agentTasks.clear();
    this.completedTasks.clear();
    this.addAgent(); this.addAgent(); this.addAgent();
  }

  toggleKanban(): void {
    this.kanban.toggle();
  }

  toggleSound(): boolean {
    const sounds = this.renderer.getSoundSystem();
    return sounds.toggle();
  }

  private updateStatusBar(): void {
    const emoji: Record<string, string> = { idle: '😴', typing: '⌨️', walking: '🚶', reading: '📖', waiting: '⏳', error: '❌' };
    const mode = this.useSimulation ? 'SIM' : 'LIVE';
    const stats = this.kanban.getStats();
    this.statusBar.innerHTML = `
      <span style="color:#e94560;margin-right:4px">[${mode}]</span>
      <span style="color:#94a3b8;margin-right:8px">📋 ${stats.todo}→${stats.inProgress}→${stats.review}→${stats.done}</span>
    ` + this.agents.map(a => {
      const sc = a.state === AgentState.Typing || a.state === AgentState.Reading ? 'working'
        : a.state === AgentState.Waiting ? 'waiting' : a.state === AgentState.Error ? 'error' : 'idle';
      return `<div class="agent-status"><span class="status-dot ${sc}"></span><span>${a.config.role}</span><span>${emoji[a.state]}</span><span>${a.config.name}</span></div>`;
    }).join('');
  }

  private setupInteraction(): void {
    // Enable audio on first click (browser autoplay policy)
    const enableAudio = () => {
      this.renderer.getSoundSystem().resume();
      document.removeEventListener('click', enableAudio);
    };
    document.addEventListener('click', enableAudio);

    window.addEventListener('resize', () => this.renderer.resize(this.canvas));
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
      const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);

      for (const a of this.agents) {
        if (Math.round(a.x) === tx && Math.round(a.y) === ty) {
          const states = [AgentState.Typing, AgentState.Reading, AgentState.Waiting, AgentState.Idle];
          a.setState(states[(states.indexOf(a.state) + 1) % states.length]);
          return;
        }
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
      const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
      let found = false;
      for (const a of this.agents) {
        if (Math.round(a.x) === tx && Math.round(a.y) === ty) {
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (e.clientX + 12) + 'px';
          this.tooltip.style.top = (e.clientY + 12) + 'px';
          const task = this.agentTasks.get(a.config.name);
          const taskInfo = task ? this.kanban.tasks.find(t => t.id === task) : null;
          this.tooltip.innerHTML = `
            <strong>${a.config.name}</strong><br>
            Role: ${a.config.role}<br>
            State: ${a.state}<br>
            ${taskInfo ? `Task: ${taskInfo.title}<br>` : ''}
            Activity: ${a.speechBubble || 'Idle'}<br>
            Pos: (${a.x}, ${a.y})
          `;
          found = true; break;
        }
      }
      if (!found) this.tooltip.style.display = 'none';
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
