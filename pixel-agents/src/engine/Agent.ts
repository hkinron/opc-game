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

  // 🏃 迟到 / 🌆 下班离开 / 🏠 请假 / 🌙 周末加班
  hasArrivedToday = false; // 今天是否已经到达工位
  hasLeftOffice = false;   // 今天是否已下班离开
  isAbsent = false;         // 今天是否请假/居家办公（不出现）
  absenceReason = '';       // 请假原因
  isWeekendOvertime = false; // 今天是否周末加班（周末专属）

  // 🥱 打哈欠传染冷却
  lastYawnTime = 0; // 上次打哈欠的时间（秒），用于防止传染连锁反应

  // 🧋 桌上的奶茶杯（喝完后的残留）
  drinkOnDesk: string | null = null; // 桌上饮品名称
  drinkOnDeskTimer: number = 0;       // 饮品在桌上持续的时间（秒）

  // ☂️ 雨天打伞 — 下雨时从雨伞架拿伞
  hasUmbrella = false; // 是否拿着伞
  umbrellaGrabbedToday = false; // 今天是否已经拿过伞（避免重复拿）

  // 🎒 手持物品 — 根据时间和活动显示不同的手中道具
  carriedItem: string | null = null; // 'coffee' | 'bento' | 'laptop' | 'briefcase' | 'milktea' | null
  carriedItemTimer: number = 0; // 手持物品持续时间（秒）

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
    // 🧋 桌上奶茶杯倒计时
    if (this.drinkOnDeskTimer > 0) {
      this.drinkOnDeskTimer -= dt;
      if (this.drinkOnDeskTimer <= 0) {
        this.drinkOnDesk = null;
        this.drinkOnDeskTimer = 0;
      }
    }

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

      case AgentState.伸懒腰:
        this.animFrame = 0;
        // 伸懒腰动画持续几秒，然后自动恢复
        if (this.stateTimer > 4 + Math.random() * 3) {
          this.state = AgentState.Typing;
          this.stateTimer = 0;
        }
        break;

      case AgentState.打哈欠:
        this.animFrame = 0;
        // 打哈欠 2-4 秒，然后恢复
        if (this.stateTimer > 2 + Math.random() * 2) {
          this.state = AgentState.Idle;
          this.stateTimer = 0;
          this.speechBubble = '😪 哈欠连天...';
          this.speechTimer = 3;
        }
        break;

      case AgentState.打游戏中:
        this.animFrame = Math.floor(this.animTimer * 8) % 4; // 快速按键动画
        // 打游戏 20-40 秒，然后心满意足地回去
        if (this.stateTimer > 20 + Math.random() * 20) {
          this.state = AgentState.Idle;
          this.stateTimer = 0;
          const gameOverMsgs = [
            '🎮 通关了！爽！',
            '🎮 再来一局...',
            '🎮 手感真好！',
            '😤 又被 Boss 虐了...',
            '🎮 高分！我太强了',
          ];
          this.speechBubble = gameOverMsgs[Math.floor(Math.random() * gameOverMsgs.length)];
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
