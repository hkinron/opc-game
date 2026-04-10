// ============================================
// Pixel Agents - Animation System
// ============================================
// Manages frame-based sprite animations with state-driven transitions

export interface AnimationFrame {
  x: number;    // sprite sheet X (in pixels)
  y: number;    // sprite sheet Y (in pixels)
  w: number;    // frame width
  h: number;    // frame height
  duration: number; // frame duration in seconds
}

export interface Animation {
  frames: AnimationFrame[];
  loop: boolean;
  name: string;
}

export class Animator {
  private animations: Map<string, Animation> = new Map();
  private currentAnim: string | null = null;
  private currentFrame: number = 0;
  private frameTimer: number = 0;

  constructor() {}

  add(name: string, anim: Animation): void {
    this.animations.set(name, anim);
  }

  play(name: string): void {
    if (this.currentAnim === name) return;
    this.currentAnim = name;
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  update(dt: number): void {
    if (!this.currentAnim) return;
    const anim = this.animations.get(this.currentAnim);
    if (!anim) return;

    this.frameTimer += dt;
    const frame = anim.frames[this.currentFrame];
    if (frame && this.frameTimer >= frame.duration) {
      this.frameTimer -= frame.duration;
      if (anim.loop) {
        this.currentFrame = (this.currentFrame + 1) % anim.frames.length;
      } else {
        this.currentFrame = Math.min(this.currentFrame + 1, anim.frames.length - 1);
      }
    }
  }

  getFrame(): AnimationFrame | null {
    if (!this.currentAnim) return null;
    const anim = this.animations.get(this.currentAnim);
    if (!anim || !anim.frames[this.currentFrame]) return null;
    return anim.frames[this.currentFrame];
  }

  getCurrentName(): string | null {
    return this.currentAnim;
  }

  getFrameIndex(): number {
    return this.currentFrame;
  }
}

// ============================================
// Predefined pixel art sprite frames
// Each sprite is drawn procedurally, but we use animation frames for timing
// ============================================

export function createIdleAnimation(): Animation {
  return {
    name: 'idle',
    loop: true,
    frames: [
      { x: 0, y: 0, w: 16, h: 20, duration: 0.5 },
      { x: 16, y: 0, w: 16, h: 20, duration: 0.5 },
      { x: 0, y: 0, w: 16, h: 20, duration: 0.8 },
      { x: 32, y: 0, w: 16, h: 20, duration: 0.5 },
    ],
  };
}

export function createWalkingAnimation(): Animation {
  return {
    name: 'walking',
    loop: true,
    frames: [
      { x: 0, y: 20, w: 16, h: 20, duration: 0.15 },
      { x: 16, y: 20, w: 16, h: 20, duration: 0.15 },
      { x: 32, y: 20, w: 16, h: 20, duration: 0.15 },
      { x: 48, y: 20, w: 16, h: 20, duration: 0.15 },
    ],
  };
}

export function createTypingAnimation(): Animation {
  return {
    name: 'typing',
    loop: true,
    frames: [
      { x: 0, y: 40, w: 16, h: 20, duration: 0.1 },
      { x: 16, y: 40, w: 16, h: 20, duration: 0.08 },
      { x: 32, y: 40, w: 16, h: 20, duration: 0.12 },
      { x: 48, y: 40, w: 16, h: 20, duration: 0.08 },
    ],
  };
}

export function createReadingAnimation(): Animation {
  return {
    name: 'reading',
    loop: true,
    frames: [
      { x: 0, y: 60, w: 16, h: 20, duration: 0.6 },
      { x: 16, y: 60, w: 16, h: 20, duration: 0.6 },
    ],
  };
}

export function createErrorAnimation(): Animation {
  return {
    name: 'error',
    loop: true,
    frames: [
      { x: 0, y: 80, w: 16, h: 20, duration: 0.2 },
      { x: 16, y: 80, w: 16, h: 20, duration: 0.2 },
    ],
  };
}
