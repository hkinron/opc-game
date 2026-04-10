import { TileMap, TILE_CONFIG } from './TileMap';
import { Agent, ROLE_COLORS } from './Agent';
import { TileType, AgentState } from '../types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private tileMap: TileMap;
  tileSize: number = 32;

  constructor(canvas: HTMLCanvasElement, tileMap: TileMap) {
    this.ctx = canvas.getContext('2d')!;
    this.tileMap = tileMap;
    this.resize(canvas);
  }

  resize(canvas: HTMLCanvasElement): void {
    const headerH = 44, statusH = 34;
    const availW = window.innerWidth, availH = window.innerHeight - headerH - statusH;
    this.tileSize = Math.max(16, Math.min(40, Math.floor(Math.min(availW / this.tileMap.width, availH / this.tileMap.height))));
    const w = this.tileMap.width * this.tileSize, h = this.tileMap.height * this.tileSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(agents: Agent[], time: number): void {
    const ctx = this.ctx, ts = this.tileSize;
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const type = this.tileMap.tiles[y][x], px = x * ts, py = y * ts;
        ctx.fillStyle = TILE_CONFIG[type].color;
        ctx.fillRect(px, py, ts, ts);
        if (type === TileType.Floor) {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          if ((x + y) % 2 === 0) ctx.fillRect(px, py, ts, ts);
          ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.strokeRect(px, py, ts, ts);
        }
        if (type === TileType.Wall) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px, py, ts, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px, py + ts - 2, ts, 2);
        }
        if (type === TileType.Desk) this.drawDesk(px, py, ts);
        if (type === TileType.Plant) this.drawPlant(px, py, ts, time);
        if (type === TileType.Couch) this.drawCouch(px, py, ts);
        if (type === TileType.Whiteboard) this.drawWhiteboard(px, py, ts);
        if (type === TileType.Bookshelf) this.drawBookshelf(px, py, ts);
        if (type === TileType.Printer) this.drawPrinter(px, py, ts, time);
        if (type === TileType.Coffee) this.drawCoffee(px, py, ts, time);
      }
    }
    [...agents].sort((a, b) => a.y - b.y).forEach(a => this.drawAgent(a, ts));
  }

  private drawDesk(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a07820'; c.fillRect(x + 2, y + 4, ts - 4, ts - 8);
    c.fillStyle = '#6b5010'; c.fillRect(x + 3, y + ts - 6, 3, 4); c.fillRect(x + ts - 6, y + ts - 6, 3, 4);
    c.fillStyle = '#333'; c.fillRect(x + ts / 2 - 4, y + 6, 8, 6);
    c.fillStyle = '#5599cc'; c.fillRect(x + ts / 2 - 3, y + 7, 6, 4);
    c.fillStyle = 'rgba(85,153,204,0.3)'; c.fillRect(x + ts / 2 - 4, y + 5, 8, 8);
  }

  private drawPlant(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx, sway = Math.sin(t * 2);
    c.fillStyle = '#8b4513'; c.fillRect(x + ts / 2 - 4, y + ts - 10, 8, 8);
    c.fillStyle = '#3a8a2a'; c.fillRect(x + ts / 2 - 2 + sway, y + 6, 4, ts - 16);
    c.fillStyle = '#4aaa3a'; c.fillRect(x + ts / 2 - 5 + sway, y + 4, 4, 6); c.fillRect(x + ts / 2 + 1 + sway, y + 2, 4, 8);
  }

  private drawCouch(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#a04040'; c.fillRect(x + 2, y + ts / 2 - 4, ts - 4, ts / 2 - 2);
    c.fillStyle = '#8b3a3a'; c.fillRect(x + 2, y + ts / 2 + 2, ts - 4, 4);
    c.fillStyle = '#b05050'; c.fillRect(x + 4, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6); c.fillRect(x + ts / 2 + 2, y + ts / 2 - 2, ts / 2 - 6, ts / 2 - 6);
  }

  private drawWhiteboard(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#d0d0e0'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#e8e8f0'; c.fillRect(x + 4, y + 4, ts - 8, ts - 8);
    c.fillStyle = '#333'; c.fillRect(x + 6, y + 8, ts - 14, 2); c.fillRect(x + 6, y + 13, ts - 20, 2); c.fillRect(x + 6, y + 18, ts - 16, 2);
  }

  private drawBookshelf(x: number, y: number, ts: number): void {
    const c = this.ctx;
    c.fillStyle = '#4a2a10'; c.fillRect(x + 2, y + 2, ts - 4, ts - 4);
    c.fillStyle = '#5c3a1e'; c.fillRect(x + 3, y + ts / 2 - 1, ts - 6, 2);
    ['#d94a4a', '#4a90d9', '#d9a94a', '#4ad97a', '#a94ad9'].forEach((cl, i) => { c.fillStyle = cl; c.fillRect(x + 4 + i * 6, y + 4, 4, ts / 2 - 6); });
    ['#4a90d9', '#d9a94a', '#4ad97a'].forEach((cl, i) => { c.fillStyle = cl; c.fillRect(x + 4 + i * 7, y + ts / 2 + 1, 5, ts / 2 - 7); });
  }

  private drawPrinter(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#555'; c.fillRect(x + 4, y + 8, ts - 8, ts - 12);
    c.fillStyle = '#666'; c.fillRect(x + 6, y + 10, ts - 12, 6);
    if (Math.sin(t * 0.5) > 0) { c.fillStyle = '#fff'; c.fillRect(x + ts / 2 - 3, y + ts - 8, 6, 6); }
  }

  private drawCoffee(x: number, y: number, ts: number, t: number): void {
    const c = this.ctx;
    c.fillStyle = '#8b6914'; c.fillRect(x + 6, y + ts / 2, ts - 12, ts / 2 - 4);
    c.fillStyle = '#f0f0f0'; c.fillRect(x + ts / 2 - 3, y + ts / 2 + 2, 6, 6);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    const sy = y + ts / 2 + Math.sin(t * 3) * 2;
    c.fillRect(x + ts / 2 - 2, sy, 1, 4); c.fillRect(x + ts / 2 + 1, sy + 1, 1, 3);
  }

  private drawAgent(a: Agent, ts: number): void {
    const ctx = this.ctx;
    const px = a.x * ts + ts / 2, py = a.y * ts + ts / 2 + a.bobOffset;
    const col = ROLE_COLORS[a.config.role];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath();
    ctx.ellipse(px, py + ts / 2 - 2, ts / 3, ts / 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.body; const bw = ts / 2.5, bh = ts / 2.5;
    ctx.fillRect(px - bw, py - bh / 2, bw * 2, bh);
    ctx.fillStyle = '#e8c39e'; const hs = ts / 3.5;
    ctx.fillRect(px - hs, py - hs * 2, hs * 2, hs * 2);
    ctx.fillStyle = '#444'; ctx.fillRect(px - hs, py - hs * 2, hs * 2, 3);
    ctx.fillStyle = '#333';
    const ex = a.facing === 'left' ? -2 : a.facing === 'right' ? 2 : 0;
    ctx.fillRect(px - 3 + ex, py - hs - 1, 2, 2); ctx.fillRect(px + 1 + ex, py - hs - 1, 2, 2);
    switch (a.state) {
      case AgentState.Typing:
        ctx.fillStyle = col.accent; const ao = Math.sin(a.animFrame * Math.PI / 2) * 3;
        ctx.fillRect(px - bw - 2, py - 2 + ao, 3, 6); ctx.fillRect(px + bw - 1, py - 2 - ao, 3, 6); break;
      case AgentState.Walking:
        ctx.fillStyle = '#335'; const lo = Math.sin(a.animFrame * Math.PI / 2) * 3;
        ctx.fillRect(px - 3, py + bh / 2, 3, 4 + lo); ctx.fillRect(px, py + bh / 2, 3, 4 - lo); break;
      case AgentState.Reading:
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.strokeRect(px - 5, py - hs - 2, 4, 3); ctx.strokeRect(px + 1, py - hs - 2, 4, 3); break;
      case AgentState.Waiting:
        ctx.fillStyle = '#fbbf24'; ctx.font = `${ts / 2}px monospace`; ctx.textAlign = 'center';
        ctx.fillText('?', px, py - hs * 2 - 4); break;
      case AgentState.Error:
        ctx.fillStyle = '#ef4444'; ctx.font = `${ts / 2}px monospace`; ctx.textAlign = 'center';
        ctx.fillText('!', px, py - hs * 2 - 4); break;
    }
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.config.name, px, py + bh / 2 + 12);
    const emoji: Record<string, string> = { idle: '😴', walking: '🚶', typing: '⌨️', reading: '📖', waiting: '⏳', error: '❌' };
    ctx.font = '10px sans-serif'; ctx.fillText(emoji[a.state], px, py - hs * 2 - 8);
    if (a.speechBubble) this.drawSpeechBubble(px, py - hs * 3 - 20, a.speechBubble);
  }

  private drawSpeechBubble(x: number, y: number, text: string): void {
    const ctx = this.ctx;
    ctx.font = '10px monospace'; const tw = ctx.measureText(text).width + 12, th = 18;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - th, tw, th, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x + 4, y); ctx.fill();
    ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 6);
  }
}
