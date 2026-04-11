// ============================================
// Pixel Agents - Office Cat 🐱
// ============================================
import { TileMap } from './TileMap';
import { findPath } from './BFS';

export enum CatState {
  Wandering = 'wandering',
  Sleeping = 'sleeping',
  BeingPet = 'beingPet',
  Eating = 'eating',
  Zoomies = 'zoomies',
}

export class OfficeCat {
  x: number = 5;
  y: number = 5;
  state: CatState = CatState.Wandering;
  facing: 'left' | 'right' = 'right';
  path: Array<{ x: number; y: number }> = [];
  pathIdx: number = 0;
  moveTimer: number = 0;
  stateTimer: number = 0;
  animFrame: number = 0;
  animTimer: number = 0;
  bobOffset: number = 0;
  speechBubble: string | null = null;
  speechTimer: number = 0;
  petAgent: string | null = null;
  lastZoomies: number = 0;

  private readonly sleepSpots = [
    { x: 6, y: 5, msg: '😴 在地毯上晒太阳...' },
    { x: 7, y: 5, msg: '😴 呼噜呼噜...' },
    { x: 1, y: 6, msg: '😴 沙发真舒服...' },
  ];
  private readonly eatSpot = { x: 10, y: 6 };
  private wanderTargets = [
    { x: 5, y: 5 }, { x: 6, y: 4 }, { x: 7, y: 5 }, { x: 4, y: 5 },
    { x: 3, y: 4 }, { x: 8, y: 4 }, { x: 5, y: 6 }, { x: 6, y: 7 },
    { x: 9, y: 5 }, { x: 2, y: 6 }, { x: 1, y: 6 }, { x: 3, y: 5 },
  ];

  constructor() {}

  update(dt: number, map: TileMap): void {
    this.animTimer += dt;
    this.stateTimer += dt;
    this.speechTimer -= dt;
    if (this.speechTimer <= 0) this.speechBubble = null;
    this.bobOffset = Math.sin(this.animTimer * 3) * 0.5;

    switch (this.state) {
      case CatState.Wandering:
        this.animFrame = Math.floor(this.animTimer * 8) % 4;
        this.moveTimer += dt;
        if (this.moveTimer > 0.5) {
          this.moveTimer = 0;
          this.pathIdx++;
          if (this.pathIdx < this.path.length) {
            const n = this.path[this.pathIdx];
            if (n.x > this.x) this.facing = 'right';
            else if (n.x < this.x) this.facing = 'left';
            this.x = n.x;
            this.y = n.y;
          } else {
            this.decideNextState(map);
          }
        }
        break;
      case CatState.Sleeping:
        this.animFrame = 0;
        if (this.stateTimer > 15 + Math.random() * 20) {
          this.state = CatState.Wandering;
          this.stateTimer = 0;
          this.pickWanderTarget(map);
        }
        break;
      case CatState.BeingPet:
        this.animFrame = Math.floor(this.animTimer * 3) % 2;
        if (this.stateTimer > 5 + Math.random() * 3) {
          this.petAgent = null;
          this.state = CatState.Wandering;
          this.stateTimer = 0;
          this.pickWanderTarget(map);
        }
        break;
      case CatState.Eating:
        this.animFrame = Math.floor(this.animTimer * 6) % 3;
        if (this.stateTimer > 4 + Math.random() * 3) {
          this.state = CatState.Wandering;
          this.stateTimer = 0;
          this.pickWanderTarget(map);
        }
        break;
      case CatState.Zoomies:
        this.animFrame = Math.floor(this.animTimer * 15) % 4;
        this.moveTimer += dt;
        if (this.moveTimer > 0.2) {
          this.moveTimer = 0;
          this.pathIdx++;
          if (this.pathIdx < this.path.length) {
            const n = this.path[this.pathIdx];
            if (n.x > this.x) this.facing = 'right';
            else if (n.x < this.x) this.facing = 'left';
            this.x = n.x;
            this.y = n.y;
          } else {
            this.state = CatState.Wandering;
            this.stateTimer = 0;
            this.lastZoomies = Date.now();
            this.pickWanderTarget(map);
          }
        }
        break;
    }
  }

  private decideNextState(map: TileMap): void {
    const r = Math.random();
    if (r < 0.35) {
      this.state = CatState.Sleeping;
      this.stateTimer = 0;
      const s = this.sleepSpots[Math.floor(Math.random() * this.sleepSpots.length)];
      this.speechBubble = s.msg;
      this.speechTimer = 10;
      this.goTo(s.x, s.y, map);
    } else if (r < 0.55) {
      this.state = CatState.Eating;
      this.stateTimer = 0;
      this.speechBubble = '🐟 吃罐罐...';
      this.speechTimer = 5;
      this.goTo(this.eatSpot.x, this.eatSpot.y, map);
    } else if (r < 0.65 && Date.now() - this.lastZoomies > 60000) {
      this.state = CatState.Zoomies;
      this.stateTimer = 0;
      this.speechBubble = '💨 疯狂跑酷!!!';
      this.speechTimer = 4;
      this.pickRandomTarget(map);
    } else {
      this.pickWanderTarget(map);
    }
  }

  private pickWanderTarget(map: TileMap): void {
    const s = this.wanderTargets[Math.floor(Math.random() * this.wanderTargets.length)];
    if (map.isWalkable(s.x, s.y)) this.goTo(s.x, s.y, map);
  }

  private pickRandomTarget(map: TileMap): void {
    for (let tries = 0; tries < 20; tries++) {
      const x = 1 + Math.floor(Math.random() * (map.width - 2));
      const y = 1 + Math.floor(Math.random() * (map.height - 2));
      if (map.isWalkable(x, y)) { this.goTo(x, y, map); return; }
    }
  }

  goTo(tx: number, ty: number, map: TileMap): void {
    const path = findPath(map, Math.round(this.x), Math.round(this.y), tx, ty);
    if (path && path.length > 1) {
      this.path = path;
      this.pathIdx = 0;
      this.state = CatState.Wandering;
      this.moveTimer = 0;
    }
  }

  pet(agentName: string): boolean {
    if (this.state === CatState.Sleeping || this.state === CatState.BeingPet) {
      this.state = CatState.BeingPet;
      this.petAgent = agentName;
      this.stateTimer = 0;
      this.speechBubble = `${agentName} 在撸我... 😻`;
      this.speechTimer = 5;
      return true;
    }
    return false;
  }
}
