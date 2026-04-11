import { AgentConfig, AgentState, AgentRole, Task, PathNode } from '../types';
import { TileMap, KANBAN_BOARD } from './TileMap';
import { findPath } from './BFS';

export const ROLE_COLORS: Record<AgentRole, { body: string; accent: string }> = {
  Coder:    { body: '#4a90d9', accent: '#7ab5ff' },
  Reviewer: { body: '#d94a4a', accent: '#ff7a7a' },
  Designer: { body: '#d9a94a', accent: '#ffd97a' },
  Writer:   { body: '#4ad97a', accent: '#7affa9' },
  Tester:   { body: '#a94ad9', accent: '#d97aff' },
};

// Sub-states for task workflow
export enum TaskWorkflow {
  None = 'none',
  WalkingToKanban = 'walking_to_kanban',
  PickingTask = 'picking_task',
  WalkingToDesk = 'walking_to_desk',
  WorkingOnTask = 'working_on_task',
  WalkingToComplete = 'walking_to_complete',
  CompletingTask = 'completing_task',
  WalkingBackToDesk = 'walking_back_to_desk',
}

export class Agent {
  config: AgentConfig;
  x: number;
  y: number;
  state: AgentState;
  path: PathNode[] = [];
  pathIndex: number = 0;
  animFrame: number = 0;
  animTimer: number = 0;
  moveTimer: number = 0;
  stateTimer: number = 0;
  speechBubble: string | null = null;
  speechTimer: number = 0;
  facing: 'down' | 'up' | 'left' | 'right' = 'down';
  bobOffset: number = 0;
  id: number;

  // Task-related fields
  currentTask: Task | null = null;
  taskWorkflow: TaskWorkflow = TaskWorkflow.None;
  private map: TileMap | null = null;

  // Sound effect timers (rate limiting)
  private typingSoundTimer: number = 0;
  private footstepSoundTimer: number = 0;

  // Wander cooldown — seconds before agent considers wandering again
  private wanderCooldown: number = 0;

  // 🏃 迟到 / 🌆 下班离开
  hasArrivedToday = false; // 今天是否已经到达工位
  hasLeftOffice = false;   // 今天是否已下班离开

  private static nextId = 1;

  constructor(config: AgentConfig, map: TileMap) {
    this.id = Agent.nextId++;
    this.config = config;
    this.x = config.deskX;
    this.y = config.deskY + 1;
    this.state = AgentState.Idle;
    this.map = map;
    this.hasArrivedToday = true; // 默认已经在工位（除非被迟到逻辑覆盖）
  }

  update(dt: number, map: TileMap): void {
    this.map = map;
    this.animTimer += dt;
    this.stateTimer += dt;
    this.speechTimer -= dt;
    this.typingSoundTimer -= dt;
    this.footstepSoundTimer -= dt;
    if (this.speechTimer <= 0) this.speechBubble = null;

    switch (this.state) {
      case AgentState.Idle:
        this.animFrame = 0;
        if (this.stateTimer > 2 + Math.random() * 3) this.stateTimer = 0;
        break;

      case AgentState.Walking:
        this.moveTimer += dt;
        if (this.moveTimer > 0.8) {
          this.moveTimer = 0;
          this.pathIndex++;
          if (this.pathIndex < this.path.length) {
            const next = this.path[this.pathIndex];
            const dx = next.x - this.x;
            const dy = next.y - this.y;
            if (dx > 0) this.facing = 'right';
            else if (dx < 0) this.facing = 'left';
            else if (dy > 0) this.facing = 'down';
            else if (dy < 0) this.facing = 'up';
            this.x = next.x;
            this.y = next.y;
            this.animFrame = (this.animFrame + 1) % 4;
            this.footstepSoundTimer = 0; // reset to play footstep
          } else {
            this.onArrived();
          }
        }
        break;

      case AgentState.Typing:
        this.animFrame = Math.floor(this.animTimer * 12) % 4;
        if (this.stateTimer > 3 + Math.random() * 5) {
          if (this.taskWorkflow === TaskWorkflow.WorkingOnTask && this.currentTask) {
            this.startCompleteTask();
          } else {
            this.state = AgentState.Idle;
            this.stateTimer = 0;
          }
        }
        break;

      case AgentState.Reading:
        this.animFrame = Math.floor(this.animTimer * 3) % 2;
        if (this.stateTimer > 2 + Math.random() * 4) {
          this.state = AgentState.Typing;
          this.stateTimer = 0;
        }
        break;

      case AgentState.Waiting:
        this.animFrame = 0;
        if (this.stateTimer > 1.5) {
          this.speechBubble = '⏳ Waiting...';
          this.stateTimer = 0;
        }
        if (this.stateTimer > 3) {
          this.state = AgentState.Typing;
          this.stateTimer = 0;
          this.speechBubble = null;
        }
        break;

      case AgentState.Error:
        this.animFrame = Math.floor(this.animTimer * 4) % 2;
        if (this.stateTimer > 4) {
          this.state = AgentState.Idle;
          this.stateTimer = 0;
        }
        break;

      case AgentState.FetchingTask:
        this.animFrame = 0;
        break;

      case AgentState.趴桌睡觉:
        this.animFrame = 0;
        // 睡觉中 — 定时醒来
        if (this.stateTimer > 15 + Math.random() * 20) {
          this.state = AgentState.Idle;
          this.stateTimer = 0;
          this.speechBubble = '😪 睡醒了...下午继续搬砖';
          this.speechTimer = 4;
        }
        break;
    }

    this.bobOffset = Math.sin(this.animTimer * 3) * 0.5;
  }

  private onArrived(): void {
    switch (this.taskWorkflow) {
      case TaskWorkflow.WalkingToKanban:
        this.taskWorkflow = TaskWorkflow.PickingTask;
        this.state = AgentState.FetchingTask;
        this.stateTimer = 0;
        this.speechBubble = `📋 Got: ${this.currentTask?.title || 'task'}`;
        this.speechTimer = 3;
        setTimeout(() => {
          if (this.currentTask) {
            this.walkTo(this.config.deskX, this.config.deskY + 1, this.map!);
            this.taskWorkflow = TaskWorkflow.WalkingToDesk;
          }
        }, 800);
        break;

      case TaskWorkflow.WalkingToDesk:
        this.taskWorkflow = TaskWorkflow.WorkingOnTask;
        this.state = AgentState.Typing;
        this.stateTimer = 0;
        this.speechBubble = `💻 ${this.currentTask?.title}`;
        this.speechTimer = 5;
        break;

      case TaskWorkflow.WalkingToComplete:
        this.taskWorkflow = TaskWorkflow.CompletingTask;
        this.state = AgentState.FetchingTask;
        this.stateTimer = 0;
        this.speechBubble = `✅ Done: ${this.currentTask?.title}`;
        this.speechTimer = 3;
        setTimeout(() => {
          this.walkTo(this.config.deskX, this.config.deskY + 1, this.map!);
          this.taskWorkflow = TaskWorkflow.WalkingBackToDesk;
        }, 800);
        break;

      case TaskWorkflow.WalkingBackToDesk:
        this.taskWorkflow = TaskWorkflow.None;
        this.currentTask = null;
        this.state = AgentState.Idle;
        this.stateTimer = 0;
        this.speechBubble = '🎉 Task done!';
        this.speechTimer = 3;
        break;

      default:
        this.state = AgentState.Idle;
        this.stateTimer = 0;
        break;
    }
  }

  startFetchTask(task: Task): void {
    this.currentTask = task;
    this.taskWorkflow = TaskWorkflow.WalkingToKanban;
    this.walkTo(KANBAN_BOARD.x + 1, KANBAN_BOARD.y + 1, this.map!);
  }

  startCompleteTask(): void {
    if (!this.currentTask) return;
    this.taskWorkflow = TaskWorkflow.WalkingToComplete;
    this.walkTo(KANBAN_BOARD.x + 2, KANBAN_BOARD.y + 1, this.map!);
  }

  walkTo(tx: number, ty: number, map: TileMap): void {
    const path = findPath(map, Math.round(this.x), Math.round(this.y), tx, ty);
    if (path && path.length > 1) {
      this.path = path;
      this.pathIndex = 0;
      this.state = AgentState.Walking;
      this.moveTimer = 0;
    }
  }

  setState(state: AgentState): void {
    this.state = state;
    this.stateTimer = 0;
  }

  isAvailable(): boolean {
    return this.state === AgentState.Idle && this.currentTask === null;
  }

  /** Whether typing sound should play this frame */
  shouldPlayTypingSound(dt: number): boolean {
    this.typingSoundTimer -= dt;
    if (this.state === AgentState.Typing && this.typingSoundTimer <= 0) {
      this.typingSoundTimer = 0.15 + Math.random() * 0.1;
      return true;
    }
    return false;
  }

  /** Whether footstep sound should play this frame */
  shouldPlayFootstepSound(): boolean {
    if (this.state === AgentState.Walking && this.footstepSoundTimer <= 0) {
      this.footstepSoundTimer = 0.15;
      return true;
    }
    return false;
  }
}
