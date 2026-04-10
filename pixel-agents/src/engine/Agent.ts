import { AgentConfig, AgentState, AgentRole } from '../types';
import { TileMap } from './TileMap';
import { findPath, PathNode } from './BFS';

export const ROLE_COLORS: Record<AgentRole, { body: string; accent: string }> = {
  Coder:    { body: '#4a90d9', accent: '#7ab5ff' },
  Reviewer: { body: '#d94a4a', accent: '#ff7a7a' },
  Designer: { body: '#d9a94a', accent: '#ffd97a' },
  Writer:   { body: '#4ad97a', accent: '#7affa9' },
  Tester:   { body: '#a94ad9', accent: '#d97aff' },
};

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

  private static nextId = 1;

  constructor(config: AgentConfig, map: TileMap) {
    this.id = Agent.nextId++;
    this.config = config;
    this.x = config.deskX;
    this.y = config.deskY + 1;
    this.state = AgentState.Idle;
  }

  update(dt: number, map: TileMap): void {
    this.animTimer += dt;
    this.stateTimer += dt;
    this.speechTimer -= dt;
    if (this.speechTimer <= 0) this.speechBubble = null;

    switch (this.state) {
      case AgentState.Idle:
        this.animFrame = 0;
        if (this.stateTimer > 2 + Math.random() * 3) this.stateTimer = 0;
        break;

      case AgentState.Walking:
        this.moveTimer += dt;
        if (this.moveTimer > 0.15) {
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
          } else {
            this.state = AgentState.Typing;
            this.stateTimer = 0;
          }
        }
        break;

      case AgentState.Typing:
        this.animFrame = Math.floor(this.animTimer * 12) % 4;
        if (this.stateTimer > 3 + Math.random() * 5) {
          this.state = AgentState.Idle;
          this.stateTimer = 0;
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
    }

    this.bobOffset = Math.sin(this.animTimer * 3) * 0.5;
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
}
