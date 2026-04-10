import { TileMap } from './TileMap';
import { Agent } from './Agent';
import { Renderer } from './Renderer';
import { AgentConfig, AgentRole, AgentState } from '../types';

const AGENT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
const AGENT_ROLES: AgentRole[] = [AgentRole.Coder, AgentRole.Reviewer, AgentRole.Designer, AgentRole.Writer, AgentRole.Tester, AgentRole.Coder];
const DESK_SPOTS = [{ x: 3, y: 3 }, { x: 6, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 7 }, { x: 6, y: 7 }, { x: 9, y: 7 }];

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
  private nextAgentIndex = 0;

  constructor(canvas: HTMLCanvasElement, statusBar: HTMLElement, tooltip: HTMLElement) {
    this.canvas = canvas;
    this.statusBar = statusBar;
    this.tooltip = tooltip;
    this.tileMap = new TileMap(13, 11);
    this.renderer = new Renderer(canvas, this.tileMap);
    this.setupInteraction();
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
    this.simTimer += dt;
    if (this.simTimer > 2) { this.simTimer = 0; this.simulateAgentActivity(); }
  }

  private simulateAgentActivity(): void {
    if (this.agents.length === 0) return;
    const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
    if (agent.state === AgentState.Idle || agent.state === AgentState.Typing || agent.state === AgentState.Reading) {
      const rand = Math.random();
      if (rand < 0.4) agent.setState(AgentState.Typing);
      else if (rand < 0.6) agent.setState(AgentState.Reading);
      else if (rand < 0.75) { agent.setState(AgentState.Waiting); agent.speechBubble = '🤔 Need review...'; agent.speechTimer = 5; }
      else if (rand < 0.85) { agent.setState(AgentState.Error); agent.speechBubble = '💥 Build failed!'; agent.speechTimer = 4; }
      else {
        const spot = DESK_SPOTS[Math.floor(Math.random() * DESK_SPOTS.length)];
        const wx = Math.max(1, Math.min(spot.x + Math.floor(Math.random() * 3) - 1, this.tileMap.width - 2));
        const wy = Math.max(1, Math.min(spot.y + Math.floor(Math.random() * 3) - 1, this.tileMap.height - 2));
        if (this.tileMap.isWalkable(wx, wy)) agent.walkTo(wx, wy, this.tileMap);
      }
    }
  }

  addAgent(): void {
    if (this.nextAgentIndex >= DESK_SPOTS.length) return;
    const spot = DESK_SPOTS[this.nextAgentIndex];
    const config: AgentConfig = { name: AGENT_NAMES[this.nextAgentIndex], role: AGENT_ROLES[this.nextAgentIndex], deskX: spot.x, deskY: spot.y };
    this.agents.push(new Agent(config, this.tileMap));
    this.nextAgentIndex++;
  }

  reset(): void {
    this.agents = []; this.nextAgentIndex = 0; this.simTimer = 0;
    this.addAgent(); this.addAgent(); this.addAgent();
  }

  private updateStatusBar(): void {
    const emoji: Record<string, string> = { idle: '😴', typing: '⌨️', walking: '🚶', reading: '📖', waiting: '⏳', error: '❌' };
    this.statusBar.innerHTML = this.agents.map(a => {
      const sc = a.state === AgentState.Typing || a.state === AgentState.Reading ? 'working'
        : a.state === AgentState.Waiting ? 'waiting' : a.state === AgentState.Error ? 'error' : 'idle';
      return `<div class="agent-status"><span class="status-dot ${sc}"></span><span>${a.config.role}</span><span>${emoji[a.state]}</span><span>${a.config.name}</span></div>`;
    }).join('');
  }

  private setupInteraction(): void {
    window.addEventListener('resize', () => this.renderer.resize(this.canvas));
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rect.left) / this.renderer.tileSize);
      const ty = Math.floor((e.clientY - rect.top) / this.renderer.tileSize);
      for (const a of this.agents) {
        if (Math.round(a.x) === tx && Math.round(a.y) === ty) {
          const states = [AgentState.Typing, AgentState.Reading, AgentState.Waiting, AgentState.Idle];
          a.setState(states[(states.indexOf(a.state) + 1) % states.length]);
          break;
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
          this.tooltip.innerHTML = `<strong>${a.config.name}</strong><br>Role: ${a.config.role}<br>State: ${a.state}<br>Pos: (${a.x}, ${a.y})`;
          found = true; break;
        }
      }
      if (!found) this.tooltip.style.display = 'none';
    });
    document.getElementById('btn-add')?.addEventListener('click', () => this.addAgent());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.reset());
  }
}
