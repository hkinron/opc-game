// ============================================
// Pixel Agents - Pixel Art Sprite System
// ============================================
// Procedural pixel art sprites per role
// Each sprite is a 16x20 pixel grid drawn pixel-by-pixel

import { AgentRole, AgentState } from '../types';

// Sprite pixel grid: each color maps to a pixel position
// Format: [x, y, colorKey]
// Grid is 16 wide x 20 tall, centered on agent

export const ROLE_SPRITES: Record<AgentRole, {
  body: string;     // body/shirt color key
  hair: string;     // hair style
  accessory: string; // role-specific accessory
  legs: string;     // pants/shoes color
}> = {
  Coder: {
    body: '#3b82f6',
    hair: '#1e293b',
    accessory: 'glasses',
    legs: '#334155',
  },
  Reviewer: {
    body: '#ef4444',
    hair: '#78350f',
    accessory: 'magnifier',
    legs: '#44403c',
  },
  Designer: {
    body: '#f59e0b',
    hair: '#be185d',
    accessory: 'palette',
    legs: '#713f12',
  },
  Writer: {
    body: '#22c55e',
    hair: '#a16207',
    accessory: 'pen',
    legs: '#365314',
  },
  Tester: {
    body: '#a855f7',
    hair: '#374151',
    accessory: 'bug',
    legs: '#4a1d6a',
  },
};

export class SpriteRenderer {
  /**
   * Draw a pixel art agent sprite at the given canvas position
   */
  static drawAgent(
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    role: AgentRole,
    state: AgentState,
    animFrame: number,
    facing: string,
    time: number
  ): void {
    const sprite = ROLE_SPRITES[role];
    const p = Math.max(1, Math.floor(2)); // pixel size
    const ox = px - 8 * p; // offset x (center 16px sprite)
    const oy = py - 12 * p; // offset y (center ~20px sprite)

    // Helper to draw a pixel rect
    const pxl = (x: number, y: number, color: string, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * p, oy + y * p, w * p, h * p);
    };

    const { body, hair, accessory, legs } = sprite;

    // === SHADOW ===
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 10 * p, 6 * p, 2 * p, 0, 0, Math.PI * 2);
    ctx.fill();

    // === LEGS ===
    const walkOffset = state === 'walking' ? Math.sin(animFrame * Math.PI / 2) * 2 : 0;
    pxl(5, 14, legs, 2, 4 + (state === 'walking' ? walkOffset : 0));
    pxl(9, 14, legs, 2, 4 - (state === 'walking' ? walkOffset : 0));
    // Shoes
    pxl(4, 17 + (state === 'walking' ? walkOffset : 0), '#1e293b', 3, 1);
    pxl(9, 17 - (state === 'walking' ? walkOffset : 0), '#1e293b', 3, 1);

    // === BODY ===
    // Torso
    pxl(4, 8, body, 8, 7);
    // Shirt detail
    pxl(7, 9, shadeColor(body, 20), 2, 4);
    // Arms
    const typingOffset = state === 'typing' ? Math.sin(animFrame * Math.PI / 2) * 2 : 0;
    if (state === 'walking') {
      const armSwing = Math.sin(animFrame * Math.PI / 2) * 2;
      pxl(2, 9 + armSwing, body, 2, 5);
      pxl(12, 9 - armSwing, body, 2, 5);
    } else {
      pxl(2, 9, body, 2, 5);
      pxl(12, 9, body, 2, 5);
    }
    // Hands
    pxl(2, 13 + (state === 'typing' ? typingOffset : 0), '#e8c39e', 2, 2);
    pxl(12, 13 - (state === 'typing' ? typingOffset : 0), '#e8c39e', 2, 2);

    // === HEAD ===
    pxl(5, 2, '#e8c39e', 6, 7); // face

    // Hair
    const hairColor = hair;
    pxl(5, 1, hairColor, 6, 2); // top
    if (role === AgentRole.Designer) {
      // Long hair
      pxl(4, 2, hairColor, 1, 6);
      pxl(11, 2, hairColor, 1, 6);
    } else if (role === AgentRole.Writer) {
      // Short curly
      pxl(4, 2, hairColor, 1, 3);
      pxl(11, 2, hairColor, 1, 3);
      pxl(4, 3, hairColor, 1, 2);
      pxl(11, 3, hairColor, 1, 2);
    } else {
      // Default short
      pxl(5, 1, hairColor, 6, 2);
    }

    // Eyes
    const eyeX = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    pxl(6 + eyeX, 4, '#ffffff', 2, 2);
    pxl(9 + eyeX, 4, '#ffffff', 2, 2);
    pxl(6 + eyeX, 5, '#1e293b', 1, 1);
    pxl(9 + eyeX, 5, '#1e293b', 1, 1);

    // Mouth
    if (state === 'error') {
      pxl(7, 7, '#ef4444', 2, 1);
    } else if (state === 'waiting') {
      pxl(7, 7, '#94a3b8', 2, 1);
    } else {
      pxl(7, 7, '#c2410c', 2, 1);
    }

    // === ROLE ACCESSORIES ===
    this.drawAccessory(ctx, px, py, role, accessory, p, ox, oy, animFrame, time, state);

    // === STATE INDICATORS ===
    if (state === 'typing') {
      // Keyboard glow
      const glow = 0.2 + Math.sin(time * 8) * 0.1;
      ctx.fillStyle = `rgba(59,130,246,${glow})`;
      ctx.fillRect(px - 6 * p, py + 2 * p, 12 * p, 2 * p);
    }

    if (state === 'error') {
      // Red flash
      const flash = Math.sin(time * 6) > 0 ? 0.15 : 0;
      ctx.fillStyle = `rgba(239,68,68,${flash})`;
      ctx.beginPath();
      ctx.arc(px, py, 10 * p, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static drawAccessory(
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    role: AgentRole,
    accessory: string,
    p: number,
    ox: number, oy: number,
    animFrame: number,
    time: number,
    state: AgentState
  ): void {
    const pxl = (x: number, y: number, color: string, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * p, oy + y * p, w * p, h * p);
    };

    switch (accessory) {
      case 'glasses':
        // Glasses
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = p;
        ctx.strokeRect(ox + 5 * p, oy + 4 * p, 3 * p, 2 * p);
        ctx.strokeRect(ox + 9 * p, oy + 4 * p, 3 * p, 2 * p);
        ctx.beginPath();
        ctx.moveTo(ox + 8 * p, oy + 5 * p);
        ctx.lineTo(ox + 9 * p, oy + 5 * p);
        ctx.stroke();
        break;

      case 'magnifier':
        // Magnifying glass in hand
        const magX = 13;
        const magY = 11 + Math.sin(time * 3) * 0.5;
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = p;
        ctx.beginPath();
        ctx.arc(ox + magX * p, oy + magY * p, 2 * p, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(147,197,253,0.4)';
        ctx.beginPath();
        ctx.arc(ox + magX * p, oy + magY * p, 2 * p, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(ox + (magX + 1.5) * p, oy + (magY + 1.5) * p);
        ctx.lineTo(ox + (magX + 3) * p, oy + (magY + 3) * p);
        ctx.stroke();
        break;

      case 'palette':
        // Color palette
        const palY = 12 + Math.sin(time * 2) * 0.5;
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(ox + 14 * p, oy + palY * p, 3 * p, 2 * p, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Paint dots
        ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'].forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(ox + (13 + i % 2 * 2) * p, oy + (palY - 0.5 + Math.floor(i / 2)) * p, p * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
        break;

      case 'pen':
        // Pen in hand
        const penAngle = Math.sin(time * 4) * 0.1;
        ctx.save();
        ctx.translate(ox + 14 * p, oy + 11 * p);
        ctx.rotate(penAngle);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-p, -p, p * 0.7, p * 4);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-p, -p, p * 0.7, p);
        ctx.restore();
        break;

      case 'bug':
        // Bug icon (for tester)
        const bugY = 11 + Math.sin(time * 2.5) * 1;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ox + 14 * p, oy + bugY * p, 2 * p, 0, Math.PI * 2);
        ctx.fill();
        // Bug legs
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(ox + 12 * p, oy + bugY * p);
        ctx.lineTo(ox + 11 * p, oy + (bugY - 1) * p);
        ctx.moveTo(ox + 16 * p, oy + bugY * p);
        ctx.lineTo(ox + 17 * p, oy + (bugY - 1) * p);
        ctx.moveTo(ox + 12 * p, oy + (bugY + 0.5) * p);
        ctx.lineTo(ox + 11 * p, oy + (bugY + 1.5) * p);
        ctx.moveTo(ox + 16 * p, oy + (bugY + 0.5) * p);
        ctx.lineTo(ox + 17 * p, oy + (bugY + 1.5) * p);
        ctx.stroke();
        break;
    }
  }
}

/**
 * Lighten or darken a color by percentage
 */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
