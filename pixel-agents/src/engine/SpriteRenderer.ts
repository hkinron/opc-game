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

    // === 💤 趴桌睡觉 — 午休经典场景 ===
    if (state === 'desk_nap') {
      // 重新画一个趴着的姿势：身体前倾，头趴在手臂上
      // 清除之前的身体部分（用阴影色覆盖）
      ctx.fillStyle = 'rgba(0,0,0,0.01)'; // 轻微覆盖
      // 趴着的身体 — 压低
      pxl(4, 10, body, 8, 5);
      // 手臂趴在桌上
      pxl(3, 11, body, 4, 2);
      pxl(9, 11, body, 4, 2);
      // 头侧趴在手臂上
      pxl(5, 9, '#e8c39e', 6, 4);
      // 头发覆盖头部上方
      pxl(5, 8, hairColor, 6, 2);
      // 闭着的眼睛（一条线）
      pxl(6, 10, '#1e293b', 2, 1);
      pxl(9, 10, '#1e293b', 2, 1);
      // 嘴巴微张
      pxl(7, 11, '#c2410c', 2, 1);
      // 腿缩短（坐着趴）
      pxl(5, 14, legs, 2, 3);
      pxl(9, 14, legs, 2, 3);
      pxl(4, 16, '#1e293b', 3, 1);
      pxl(9, 16, '#1e293b', 3, 1);
      // 💤 睡觉符号 — 浮动动画
      const zzOff = Math.sin(time * 2) * 2;
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💤', px + 8 * p, oy + 2 * p + zzOff);
      // Zzz 小符号
      ctx.fillStyle = 'rgba(148,163,184,0.4)';
      ctx.font = '4px monospace';
      ctx.fillText('z', px + 10 * p, oy + 4 * p + zzOff * 0.5);
    }

    // 🙆 伸懒腰 — 下午犯困经典动作，站起来双臂高举
    if (state === 'stretching') {
      const stretchPhase = Math.sin(time * 3); // -1 to 1, 伸-缩循环
      const stretchAmount = Math.max(0, stretchPhase); // 0 to 1

      // 身体挺直（比正常站姿略高）
      pxl(4, 7, body, 8, 7);
      // 衬衫细节
      pxl(7, 8, shadeColor(body, 20), 2, 4);

      // 双臂高举过头 — 伸懒腰标志动作
      const armRaise = stretchAmount * 4; // 0-4 像素的抬起量
      // 左臂
      pxl(1, 5 - armRaise, body, 2, 5);
      // 左手
      pxl(1, 4 - armRaise, '#e8c39e', 2, 2);
      // 右臂
      pxl(13, 5 - armRaise, body, 2, 5);
      // 右手
      pxl(13, 4 - armRaise, '#e8c39e', 2, 2);

      // 腿 — 伸直（比正常站姿长一点）
      pxl(5, 13, legs, 2, 5);
      pxl(9, 13, legs, 2, 5);
      pxl(4, 17, '#1e293b', 3, 1);
      pxl(9, 17, '#1e293b', 3, 1);

      // 头部 — 微微后仰
      pxl(5, 1, '#e8c39e', 6, 7);
      pxl(5, 0, hairColor, 6, 2);
      // 头发
      if (role === AgentRole.Designer) {
        pxl(4, 1, hairColor, 1, 6);
        pxl(11, 1, hairColor, 1, 6);
      } else {
        pxl(5, 0, hairColor, 6, 2);
      }
      // 眼睛 — 眯着（享受伸懒腰的感觉）
      pxl(6, 3, '#1e293b', 2, 1);
      pxl(9, 3, '#1e293b', 2, 1);
      // 嘴巴 — 打哈欠（张开）
      if (stretchAmount > 0.5) {
        pxl(7, 6, '#8b0000', 2, 2); // 张开的嘴
        pxl(7, 7, '#c2410c', 2, 1); // 舌头
      } else {
        pxl(7, 7, '#c2410c', 2, 1);
      }

      // 💨 伸懒腰特效 — 身体周围的能量波动
      if (stretchAmount > 0.3) {
        const glowAlpha = stretchAmount * 0.15;
        ctx.fillStyle = `rgba(255,255,200,${glowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(px, py - 2 * p, 10 * p, 14 * p, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ✨ 伸懒腰完成时的小星星
      if (stretchAmount > 0.8) {
        ctx.fillStyle = 'rgba(255,215,0,0.6)';
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨', px + 10 * p, oy);
      }

      // 重新画角色配件（glasses, etc.）
      this.drawAccessory(ctx, px, py, role, accessory, p, ox, oy, animFrame, time, state);
    }

    // 🥱 打哈欠 — 下午犯困灵魂出窍，嘴巴张大大的
    if (state === 'yawning') {
      const yawnPhase = Math.sin(time * 2); // 张嘴→闭嘴循环
      const mouthOpen = Math.max(0, yawnPhase); // 0 to 1

      // 身体 — 稍微佝偻（困了的姿态）
      pxl(4, 9, body, 8, 6);
      pxl(7, 10, shadeColor(body, 20), 2, 3);

      // 手臂 — 一只手捂嘴
      pxl(2, 10, body, 2, 4);
      pxl(12, 10, body, 2, 4);
      // 捂嘴的手
      pxl(6, 6 - mouthOpen, '#e8c39e', 4, 2);

      // 腿
      pxl(5, 14, legs, 2, 4);
      pxl(9, 14, legs, 2, 4);
      pxl(4, 17, '#1e293b', 3, 1);
      pxl(9, 17, '#1e293b', 3, 1);

      // 头部 — 微微仰起
      pxl(5, 2, '#e8c39e', 6, 6);
      pxl(5, 1, hairColor, 6, 2);
      if (role === AgentRole.Designer) {
        pxl(4, 2, hairColor, 1, 5);
        pxl(11, 2, hairColor, 1, 5);
      }

      // 眼睛 — 困得眯成一条缝
      pxl(6, 4, '#1e293b', 2, 1);
      pxl(9, 4, '#1e293b', 2, 1);

      // 嘴巴 — 张得大大的打哈欠
      if (mouthOpen > 0.3) {
        const mouthH = 1 + Math.floor(mouthOpen * 2);
        pxl(7, 6, '#8b0000', 2, mouthH); // 口腔内部
        if (mouthOpen > 0.6) {
          pxl(7, 6 + mouthH - 1, '#c2410c', 2, 1); // 舌头
        }
        // 打哈欠挤出的眼泪
        if (mouthOpen > 0.7) {
          ctx.fillStyle = 'rgba(100,180,255,0.6)';
          ctx.fillRect(px - 4 * p, oy + 5 * p, p, p);
          ctx.fillRect(px + 4 * p, oy + 5 * p, p, p);
        }
      } else {
        pxl(7, 7, '#c2410c', 2, 1);
      }

      // 💨 打哈欠呼气效果
      if (mouthOpen > 0.5) {
        const breathAlpha = mouthOpen * 0.15;
        ctx.fillStyle = `rgba(200,220,255,${breathAlpha})`;
        ctx.beginPath();
        ctx.ellipse(px + 5 * p, oy + 6 * p, 4 * p, 2 * p, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 😴 Zzz 粒子 — 头顶飘
      const zzY = oy - 3 * p + Math.sin(time * 1.5) * 2;
      ctx.fillStyle = `rgba(148,163,184,${0.3 + mouthOpen * 0.4})`;
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('😴', px + 9 * p, zzY);
      ctx.font = '4px monospace';
      ctx.fillText('z', px + 12 * p, zzY + 2);

      // 重新画角色配件
      this.drawAccessory(ctx, px, py, role, accessory, p, ox, oy, animFrame, time, state);
    }

    // 🥱 打哈欠 — 下午犯困灵魂动作，嘴巴张得大大的
    if (state === 'yawning') {
      const yawnPhase = Math.sin(time * 2.5); // -1 to 1, 打哈欠的张嘴-闭嘴循环
      const mouthOpen = Math.max(0, yawnPhase); // 0 to 1, 嘴巴张开程度
      const eyeSquint = Math.max(0, yawnPhase * 0.7); // 眼睛眯起程度

      // 身体 — 稍微佝偻（困了的姿势）
      pxl(4, 9, body, 8, 6);
      // 衬衫细节
      pxl(7, 10, shadeColor(body, 20), 2, 3);

      // 手臂 — 一只手捂嘴打哈欠
      pxl(2, 10, body, 2, 5);
      pxl(12, 10, body, 2, 5);
      // 捂嘴的手
      const handY = 7 - mouthOpen * 2;
      pxl(6, handY, '#e8c39e', 4, 2);

      // 腿 — 站直但懒散
      pxl(5, 14, legs, 2, 4);
      pxl(9, 14, legs, 2, 4);
      pxl(4, 17, '#1e293b', 3, 1);
      pxl(9, 17, '#1e293b', 3, 1);

      // 头部 — 微微后仰
      pxl(5, 2, '#e8c39e', 6, 7);
      pxl(5, 1, hairColor, 6, 2);
      if (role === AgentRole.Designer) {
        pxl(4, 2, hairColor, 1, 6);
        pxl(11, 2, hairColor, 1, 6);
      }

      // 眼睛 — 半闭半开（困得睁不开）
      const eyeH = Math.max(1, 2 - Math.floor(eyeSquint * 2));
      pxl(6, 4, '#1e293b', 2, eyeH);
      pxl(9, 4, '#1e293b', 2, eyeH);

      // 嘴巴 — 张得大大的打哈欠
      if (mouthOpen > 0.3) {
        const mouthH = 1 + Math.floor(mouthOpen * 3);
        pxl(7, 7, '#8b0000', 2, mouthH); // 口腔
        if (mouthOpen > 0.6) {
          pxl(7, 7 + mouthH - 1, '#c2410c', 2, 1); // 舌头
        }
        // 眼泪 — 打哈欠打出的眼泪
        if (mouthOpen > 0.7) {
          ctx.fillStyle = 'rgba(100,180,255,0.5)';
          const tearY = oy + (5 + Math.sin(time * 4) * 1) * p;
          ctx.fillRect(px - 3 * p, tearY, p, p);
          ctx.fillRect(px + 3 * p, tearY + p, p, p);
        }
      } else {
        pxl(7, 7, '#c2410c', 2, 1);
      }

      // 💨 哈欠的"气" — 从嘴里呼出的气
      if (mouthOpen > 0.5) {
        const breathAlpha = mouthOpen * 0.12;
        ctx.fillStyle = `rgba(200,220,255,${breathAlpha})`;
        ctx.beginPath();
        ctx.ellipse(px + 4 * p, oy + 7 * p, 4 * p, 3 * p, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px - 4 * p, oy + 7 * p, 3 * p, 2 * p, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 😴 Zzz 符号 — 打哈欠专属
      const zzAlpha = 0.3 + mouthOpen * 0.4;
      const zzY = oy - 2 * p + Math.sin(time * 1.5) * 2;
      ctx.fillStyle = `rgba(148,163,184,${zzAlpha})`;
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('😴', px + 8 * p, zzY);
      ctx.font = '3px monospace';
      ctx.fillText('z', px + 11 * p, zzY + 3);
      ctx.fillText('z', px + 12 * p, zzY + 1);

      // 重新画角色配件
      this.drawAccessory(ctx, px, py, role, accessory, p, ox, oy, animFrame, time, state);
    }

    // 🎮 打游戏中 — 双手握着手柄，身体微微前倾，专注地盯着屏幕
    if (state === 'gaming') {
      const buttonMash = Math.sin(time * 8); // 快速按键的节奏

      // 身体 — 微微前倾，像打游戏时那样
      pxl(4, 8, body, 8, 6);
      pxl(5, 8, accent, 6, 1); // 衣服领口

      // 手臂 — 双手向前伸，握着手柄
      const armExtend = 1 + Math.floor(buttonMash * 0.5);
      pxl(2, 9 + armExtend, body, 3, 2);
      pxl(11, 9 + armExtend, body, 3, 2);

      // 🎮 游戏手柄 — 双手各握一个
      pxl(1, 10 + armExtend, '#222', 3, 2);
      pxl(2, 10 + armExtend, '#444', 1, 1); // 按钮
      pxl(12, 10 + armExtend, '#222', 3, 2);
      pxl(12, 10 + armExtend, '#444', 1, 1); // 按钮

      // 头 — 微微低着，盯着屏幕
      pxl(5, 5, '#e8c39e', 6, 5);
      pxl(5, 4, hairColor, 6, 2);

      // 眼睛 — 专注地盯着前方（向下看屏幕）
      pxl(6, 7, '#1e293b', 1, 1);
      pxl(9, 7, '#1e293b', 1, 1);
      pxl(6, 6, '#1e293b', 1, 1);
      pxl(9, 6, '#1e293b', 1, 1);

      // 嘴巴 — 紧张或兴奋
      if (buttonMash > 0.5) {
        pxl(7, 8, '#c2410c', 2, 1); // 兴奋：张嘴
      } else if (buttonMash < -0.5) {
        pxl(7, 8, '#8b0000', 2, 1); // 紧张：咬嘴唇
      } else {
        pxl(7, 8, '#c2410c', 2, 1); // 专注：抿嘴
      }

      // 腿 — 微微晃动
      const legWiggle = Math.floor(Math.sin(time * 5) * 0.5);
      pxl(5, 14, legs, 2, 3);
      pxl(9, 14, legs, 2, 3);
      pxl(4 + legWiggle, 16, '#1e293b', 3, 1);
      pxl(9 - legWiggle, 16, '#1e293b', 3, 1);

      // 🎮 游戏特效
      if (Math.sin(time * 10) > 0.7) {
        ctx.fillStyle = 'rgba(233,69,96,0.6)';
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎮', px + 8 * p, oy - 2 * p);
      }

      // 重新画角色配件
      this.drawAccessory(ctx, px, py, role, accessory, p, ox, oy, animFrame, time, state);
    }
  }

  /**
   * 🎒 绘制手持物品 — 根据 carriedItem 在角色手上画不同道具
   * 咖啡杯 / 奶茶杯 / 外卖盒 / 笔记本电脑 / 公文包
   */
  static drawCarriedItem(
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    carriedItem: string | null,
    p: number, ox: number, oy: number,
    time: number, facing: string
  ): void {
    if (!carriedItem) return;

    const pxl = (x: number, y: number, color: string, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * p, oy + y * p, w * p, h * p);
    };

    // 手持物品画在角色右侧手上 (x=13-15, y=11-15)
    const bob = Math.sin(time * 3) * 0.3; // 走路时轻微晃动

    switch (carriedItem) {
      case 'coffee': {
        // ☕ 咖啡杯 — 纸杯 + 盖子 + 蒸汽
        const cupX = 13;
        const cupY = 11 + bob;
        // 杯身（白色纸杯）
        pxl(cupX, cupY, '#f5f5f5', 3, 3);
        pxl(cupX + 1, cupY + 1, '#e0e0e0', 1, 1); // 杯身阴影
        // 杯盖（棕色塑料盖）
        pxl(cupX, cupY - 1, '#8d6e63', 3, 1);
        pxl(cupX + 1, cupY - 2, '#8d6e63', 1, 1); // 盖子突起
        // ☕ 咖啡杯套（瓦楞纸套）
        pxl(cupX, cupY + 1, '#a1887f', 3, 1);
        // 蒸汽（2 缕上升的白汽）
        const steamPhase = Math.sin(time * 4);
        if (steamPhase > -0.5) {
          ctx.fillStyle = `rgba(255,255,255,${0.3 + steamPhase * 0.15})`;
          ctx.font = '4px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('~', px + 1 * p, oy + (cupY - 3) * p + Math.sin(time * 2) * p);
          ctx.fillText('~', px + 3 * p, oy + (cupY - 2) * p + Math.sin(time * 2.5 + 1) * p);
        }
        break;
      }
      case 'milktea': {
        // 🧋 奶茶杯 — 透明塑料杯 + 吸管 + 封口膜
        const cupX = 13;
        const cupY = 11 + bob;
        // 杯身（半透明）
        ctx.fillStyle = 'rgba(255,224,178,0.7)';
        ctx.fillRect(ox + cupX * p, oy + cupY * p, 3 * p, 4 * p);
        ctx.strokeStyle = 'rgba(200,180,150,0.5)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(ox + cupX * p, oy + cupY * p, 3 * p, 4 * p);
        // 奶茶液体颜色
        pxl(cupX, cupY + 1, '#d7a86e', 3, 2);
        // 封口膜（粉色）
        pxl(cupX, cupY - 1, '#f48fb1', 3, 1);
        // 吸管（绿色，斜着插）
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = p * 0.6;
        ctx.beginPath();
        ctx.moveTo(ox + (cupX + 2) * p, oy + (cupY - 1) * p);
        ctx.lineTo(ox + (cupX + 3) * p, oy + (cupY - 4) * p);
        ctx.stroke();
        // 珍珠（底部小圆点）
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.arc(ox + (cupX + 1) * p, oy + (cupY + 3) * p, p * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bento': {
        // 🍱 外卖盒 — 白色方形餐盒 + 红色logo
        const boxX = 13;
        const boxY = 12 + bob;
        // 盒子主体
        pxl(boxX, boxY, '#fafafa', 4, 3);
        // 盒子边缘阴影
        pxl(boxX, boxY + 2, '#e0e0e0', 4, 1);
        // 盖子（淡蓝色）
        pxl(boxX, boxY - 1, '#bbdefb', 4, 1);
        // 红色外卖logo贴纸
        pxl(boxX + 1, boxY, '#e53935', 2, 1);
        // 提手（塑料袋）
        ctx.strokeStyle = 'rgba(200,200,200,0.6)';
        ctx.lineWidth = p * 0.5;
        ctx.beginPath();
        ctx.arc(ox + (boxX + 2) * p, oy + (boxY - 2) * p, 2 * p, Math.PI, 0);
        ctx.stroke();
        break;
      }
      case 'laptop': {
        // 💻 笔记本电脑 — 夹在手臂下的银色笔记本
        const lapX = 12;
        const lapY = 9 + bob;
        // 笔记本主体（银灰色）
        pxl(lapX, lapY, '#b0bec5', 4, 3);
        pxl(lapX + 1, lapY + 1, '#90a4ae', 2, 1); // 键盘区
        // 品牌logo（小方块）
        pxl(lapX + 2, lapY, '#ffffff', 1, 1);
        // 手臂夹住
        pxl(lapX - 1, lapY, body, 1, 3);
        break;
      }
      case 'briefcase': {
        // 💼 公文包 — 手提的黑色皮包
        const bagX = 13;
        const bagY = 13 + bob;
        // 包体
        pxl(bagX, bagY, '#5d4037', 4, 3);
        // 包的轮廓线
        pxl(bagX, bagY, '#4e342e', 1, 3);
        pxl(bagX + 3, bagY, '#4e342e', 1, 3);
        pxl(bagX + 1, bagY, '#4e342e', 2, 1);
        pxl(bagX + 1, bagY + 2, '#4e342e', 2, 1);
        // 锁扣
        pxl(bagX + 1, bagY + 1, '#ffd54f', 2, 1);
        // 提手
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = p;
        ctx.beginPath();
        ctx.arc(ox + (bagX + 2) * p, oy + (bagY - 1) * p, 1.5 * p, Math.PI, 0);
        ctx.stroke();
        break;
      }
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
