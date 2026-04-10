// ============================================
// Pixel Agents - Particle Effects System
// ============================================

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0..1 remaining
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'float' | 'burst' | 'steam' | 'code';
  rotation: number;
  rotSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Emit particles at a position
   */
  emit(config: {
    x: number;
    y: number;
    count: number;
    type: Particle['type'];
    color?: string;
    colors?: string[];
    speed?: number;
    size?: number;
    spread?: number;
    life?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'radial';
  }): void {
    const {
      x, y, count, type,
      color = '#fbbf24',
      colors = undefined,
      speed = 1,
      size = 2,
      spread = Math.PI * 2,
      life = 1,
      direction = 'radial',
    } = config;

    for (let i = 0; i < count; i++) {
      const angle = direction === 'up' ? -Math.PI / 2 + (Math.random() - 0.5) * spread
        : direction === 'down' ? Math.PI / 2 + (Math.random() - 0.5) * spread
        : direction === 'left' ? Math.PI + (Math.random() - 0.5) * spread
        : direction === 'right' ? 0 + (Math.random() - 0.5) * spread
        : Math.random() * Math.PI * 2;

      const spd = speed * (0.5 + Math.random());
      const p: Particle = {
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        maxLife: life * (0.5 + Math.random() * 0.5),
        size: size * (0.5 + Math.random()),
        color: colors ? colors[Math.floor(Math.random() * colors.length)] : color,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      };

      // Adjust velocity based on type
      if (type === 'steam') {
        p.vy = -spd * 0.5;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.size = size * (1 + Math.random());
      }
      if (type === 'code') {
        p.vy = -spd * 0.8;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.size = 3;
      }
      if (type === 'burst') {
        p.vx = Math.cos(angle) * spd * 2;
        p.vy = Math.sin(angle) * spd * 2;
      }

      this.particles.push(p);
    }
  }

  /**
   * Update and render all particles
   */
  updateAndRender(dt: number): void {
    const ctx = this.ctx;

    // Update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= dt / p.maxLife;

      // Gravity for sparks
      if (p.type === 'spark' || p.type === 'burst') {
        p.vy += 0.05;
      }
      if (p.type === 'code') {
        p.vy -= 0.01; // float up
        p.vx *= 0.98; // slow down
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Render
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'spark':
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'code':
          // Render as tiny pixel characters
          ctx.font = `${p.size * 3}px monospace`;
          ctx.fillStyle = p.color;
          const chars = ['0', '1', '{', '}', '</>', ';', 'fn', '=>'];
          ctx.fillText(chars[Math.floor(p.x * 7) % chars.length], -p.size, p.size);
          break;
        case 'float':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'burst':
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'steam':
          ctx.fillStyle = `rgba(255,255,255,${p.life * 0.5})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1 + (1 - p.life)), 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  get count(): number {
    return this.particles.length;
  }
}
