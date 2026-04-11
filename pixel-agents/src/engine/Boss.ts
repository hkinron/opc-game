// ============================================
// Pixel Agents - Boss NPC (领导巡查)
// ============================================
// The boss randomly appears and patrols the office.
// Agents nearby will switch to "working" mode when they detect the boss!

import { TileMap, TILE_CONFIG } from './TileMap';
import { findPath } from './BFS';

export enum BossState {
  Hidden = 'hidden',
  Walking = 'walking',
  Patrolling = 'patrolling',
  Leaving = 'leaving',
}

export interface BossPatrolPoint {
  x: number;
  y: number;
}

export class Boss {
  x: number = 0;
  y: number = 0;
  state: BossState = BossState.Hidden;
  facing: 'left' | 'right' = 'right';
  moveTimer: number = 0;
  visibleTimer: number = 0;
  patrolPath: BossPatrolPoint[] = [];
  patrolIndex: number = 0;
  speechBubble: string | null = null;
  speechTimer: number = 0;
  bobOffset: number = 0;
  private path: { x: number; y: number }[] = [];
  private pathIndex: number = 0;
  private appearanceInterval: number = 60; // seconds until next appearance
  private appearanceTimer: number = 0;
  private maxPatrolTime: number = 20; // seconds boss stays visible
  private patrolTimeElapsed: number = 0;
  private map: TileMap | null = null;

  constructor() {
    this.appearanceTimer = 30 + Math.random() * 60; // first appearance 30-90s
  }

  update(dt: number, map: TileMap): void {
    this.map = map;
    this.moveTimer += dt;
    this.patrolTimeElapsed += dt;
    this.speechTimer -= dt;
    if (this.speechTimer <= 0) this.speechBubble = null;
    this.bobOffset = Math.sin(Date.now() / 300) * 0.5;

    switch (this.state) {
      case BossState.Hidden:
        this.appearanceTimer -= dt;
        if (this.appearanceTimer <= 0) {
          this.enterOffice(map);
        }
        break;

      case BossState.Walking:
        this.moveTimer += dt;
        if (this.moveTimer > 0.6) {
          this.moveTimer = 0;
          this.pathIndex++;
          if (this.pathIndex < this.path.length) {
            const next = this.path[this.pathIndex];
            this.facing = next.x > this.x ? 'right' : 'left';
            this.x = next.x;
            this.y = next.y;
          } else {
            this.state = BossState.Patrolling;
            this.patrolTimeElapsed = 0;
            this.speechBubble = '👀 大家工作怎么样了？';
            this.speechTimer = 5;
            this.generatePatrolRoute(map);
          }
        }
        break;

      case BossState.Patrolling:
        if (this.patrolTimeElapsed >= this.maxPatrolTime) {
          this.leaveOffice(map);
          break;
        }
        // Move to next patrol point
        if (this.moveTimer > 2) {
          this.moveTimer = 0;
          this.patrolIndex++;
          if (this.patrolIndex < this.patrolPath.length) {
            const target = this.patrolPath[this.patrolIndex];
            const path = findPath(map, Math.round(this.x), Math.round(this.y), target.x, target.y);
            if (path && path.length > 1) {
              this.path = path;
              this.pathIndex = 0;
              this.state = BossState.Walking;
              this.moveTimer = 0;
            }
          } else {
            // Regenerate patrol route
            this.generatePatrolRoute(map);
            this.patrolIndex = 0;
          }
        }
        break;

      case BossState.Leaving:
        this.moveTimer += dt;
        if (this.moveTimer > 0.6) {
          this.moveTimer = 0;
          this.pathIndex++;
          if (this.pathIndex < this.path.length) {
            const next = this.path[this.pathIndex];
            this.x = next.x;
            this.y = next.y;
          } else {
            this.state = BossState.Hidden;
            this.appearanceTimer = 45 + Math.random() * 90; // 45-135s until next appearance
            this.speechBubble = null;
          }
        }
        break;
    }
  }

  /** Boss enters from elevator */
  private enterOffice(map: TileMap): void {
    // Start at elevator position
    this.x = 6;
    this.y = 9;
    this.state = BossState.Walking;
    this.moveTimer = 0;
    this.patrolTimeElapsed = 0;
    this.speechBubble = '💼 我来看看大家的工作进度';
    this.speechTimer = 4;

    // Path to a central office area
    const targetX = 5 + Math.floor(Math.random() * 3);
    const targetY = 4 + Math.floor(Math.random() * 3);
    const path = findPath(map, Math.round(this.x), Math.round(this.y), targetX, targetY);
    if (path && path.length > 1) {
      this.path = path;
      this.pathIndex = 0;
    }
  }

  /** Generate a patrol route around the office */
  private generatePatrolRoute(map: TileMap): void {
    this.patrolPath = [];
    const centerPoints: BossPatrolPoint[] = [
      { x: 3, y: 3 }, { x: 6, y: 3 }, { x: 9, y: 3 },
      { x: 3, y: 6 }, { x: 6, y: 6 }, { x: 9, y: 6 },
      { x: 5, y: 5 }, { x: 7, y: 5 },
    ];

    // Pick 3-4 random points to visit
    const shuffled = centerPoints.sort(() => Math.random() - 0.5);
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      if (map.inBounds(shuffled[i].x, shuffled[i].y) && map.isWalkable(shuffled[i].x, shuffled[i].y)) {
        this.patrolPath.push(shuffled[i]);
      }
    }

    if (this.patrolPath.length === 0) {
      // Fallback
      this.patrolPath = [{ x: 6, y: 5 }];
    }

    this.patrolIndex = 0;
  }

  /** Boss leaves through elevator */
  private leaveOffice(map: TileMap): void {
    this.state = BossState.Leaving;
    this.moveTimer = 0;
    this.speechBubble = '👋 好好工作，我下次再来';
    this.speechTimer = 4;

    const path = findPath(map, Math.round(this.x), Math.round(this.y), 6, 10);
    if (path && path.length > 1) {
      this.path = path;
      this.pathIndex = 0;
    } else {
      // Fallback: just hide
      this.state = BossState.Hidden;
      this.appearanceTimer = 45 + Math.random() * 90;
      this.speechBubble = null;
    }
  }

  /** Check if an agent is close to the boss */
  isNearby(agentX: number, agentY: number, radius: number = 3): boolean {
    if (this.state === BossState.Hidden) return false;
    const dx = Math.abs(agentX - this.x);
    const dy = Math.abs(agentY - this.y);
    return dx <= radius && dy <= radius;
  }

  isVisible(): boolean {
    return this.state !== BossState.Hidden;
  }
}
