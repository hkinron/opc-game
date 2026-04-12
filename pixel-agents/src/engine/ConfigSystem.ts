// ============================================
// Pixel Agents - Configuration System
// ============================================
// 办公室布局设计 (参考 pablodelucca/pixel-agents + 设计原则)
// 设计原则: 空间层次 / 呼吸感 / 动线清晰 / 色彩统一
// 尺寸: 20×11 — 参考项目默认尺寸

export interface ThemeColors {
  background: string;
  wall: string;
  wallHighlight: string;
  wallShadow: string;
  floor: string;
  floorPattern: string;
  floorGrid: string;
  desk: string;
  deskTop: string;
  deskLeg: string;
  monitor: string;
  monitorScreen: string;
  accent: string;
  text: string;
  textMuted: string;
  header: string;
  headerBorder: string;
  statusbar: string;
  statusbarBorder: string;
}

// 暖色调地板 (参考项目配色: 左房米色 #c4a882, 右房棕色 #8a7058)
export const DEFAULT_THEME: ThemeColors = {
  background: '#2c2016',
  wall: '#3a3a52',
  wallHighlight: 'rgba(255,255,255,0.08)',
  wallShadow: 'rgba(0,0,0,0.25)',
  floor: '#b8a088',
  floorPattern: 'rgba(180,150,110,0.4)',
  floorGrid: 'rgba(0,0,0,0.06)',
  desk: '#8b6914',
  deskTop: '#a07820',
  deskLeg: '#6b5010',
  monitor: '#333',
  monitorScreen: '#5599cc',
  accent: '#e94560',
  text: '#e0d8cc',
  textMuted: '#a89888',
  header: '#1e1610',
  headerBorder: '#3a2a1a',
  statusbar: '#1e1610',
  statusbarBorder: '#3a2a1a',
};

export const CYBER_THEME: ThemeColors = {
  background: '#0a0a0a', wall: '#1a0a2e',
  wallHighlight: 'rgba(0,255,255,0.1)', wallShadow: 'rgba(255,0,255,0.1)',
  floor: '#0f1a0f', floorPattern: 'rgba(0,255,0,0.03)',
  floorGrid: 'rgba(0,255,0,0.08)', desk: '#1a4a1a',
  deskTop: '#2a6a2a', deskLeg: '#0a3a0a',
  monitor: '#00ff00', monitorScreen: '#00ff00', accent: '#00ff00',
  text: '#00ff00', textMuted: '#00aa00',
  header: '#0a1a0a', headerBorder: '#00ff00',
  statusbar: '#0a1a0a', statusbarBorder: '#00ff00',
};

export const SUNSET_THEME: ThemeColors = {
  background: '#2d1b69', wall: '#1a1040',
  wallHighlight: 'rgba(255,165,0,0.1)', wallShadow: 'rgba(255,69,0,0.1)',
  floor: '#4a2a5e', floorPattern: 'rgba(255,165,0,0.03)',
  floorGrid: 'rgba(255,165,0,0.05)', desk: '#8b5a14',
  deskTop: '#a06a20', deskLeg: '#6b4a10',
  monitor: '#333', monitorScreen: '#ff9944', accent: '#ff6b35',
  text: '#ffe0b2', textMuted: '#ffab91',
  header: '#1a0a40', headerBorder: '#4a1a8e',
  statusbar: '#1a0a40', statusbarBorder: '#4a1a8e',
};

export const THEMES: Record<string, ThemeColors> = {
  default: DEFAULT_THEME, cyber: CYBER_THEME, sunset: SUNSET_THEME,
};

// ============================================
// Layout Configurations
// ============================================
//
// 📐 20×11 专业办公室 — 两房间 + 中央走廊
//
// 设计思路 (参考 pablodelucca/pixel-agents):
// 1. 两房间分隔 — 中间隔墙 + 门洞，真实感
// 2. 暖色地板 — 左房米色(#c4a882) 右房棕色(#8a7058)
// 3. 工位对称 — 每间4工位，间距均匀
// 4. 底部功能区 — 休息区 / 茶水间 / 卫生间
// 5. 入口区域 — 电梯 + 前台
//
// 布局平面图:
// ┌──────────────────────────────────────────┐
// │ 白板 白板 │ 窗  │ 窗 │ 书架 书架 │      │ y=1
// │          │     │    │          │       │
// │ 💻  💻   │ 🪴  │ 🪴 │  💻  💻  │ 时钟  │ y=3 工位上排
// │          │     │    │          │       │
// │ 💻  💻   │     │    │  💻  💻  │       │ y=5 工位下排
// │          │     │    │          │       │
// ├── 隔墙 ──┼──🚪─┼────┼─── 隔墙 ─┤       │ y=7 隔墙(带门)
// │          │     │    │          │       │
// │ 🛋️🛋️🛋️  │走廊 │    │ ☕🧊📦   │       │ y=9 休息区+茶水间
// │ 前台    │电梯 │    │ 快递柜   │ 🚻    │ y=10 入口区
// └─────────┴─────┴────┴──────────┴───────┘

export interface OfficeLayout {
  name: string;
  width: number;
  height: number;
  desks: { x: number; y: number }[];
  furniture: { type: string; x: number; y: number }[];
}

export const DEFAULT_LAYOUT: OfficeLayout = {
  name: '双房间办公室',
  width: 20, height: 11,
  desks: [
    // ===== 办公区 A (左房间) =====
    { x: 2, y: 3 }, { x: 5, y: 3 },   // 上排
    { x: 2, y: 5 }, { x: 5, y: 5 },   // 下排
    // ===== 办公区 B (右房间) =====
    { x: 13, y: 3 }, { x: 16, y: 3 }, // 上排
    { x: 13, y: 5 }, { x: 16, y: 5 }, // 下排
  ],
  furniture: [
    // ========================================
    // 隔墙 (x=9) — 分隔两个房间
    // 上段 (y=1-6)
    { type: 'poster', x: 9, y: 1 },
    { type: 'poster', x: 9, y: 2 },
    { type: 'poster', x: 9, y: 3 },
    { type: 'poster', x: 9, y: 4 },
    { type: 'poster', x: 9, y: 5 },
    { type: 'poster', x: 9, y: 6 },
    // 门洞 (y=7-8)
    { type: 'door', x: 9, y: 7 },
    { type: 'door', x: 9, y: 8 },
    // 下段 (y=9-10)
    { type: 'poster', x: 9, y: 9 },

    // ========================================
    // 办公区 A (左房间) — 装饰
    { type: 'whiteboard', x: 1, y: 1 }, { type: 'whiteboard', x: 2, y: 1 },
    { type: 'window', x: 7, y: 1 },
    { type: 'plant', x: 7, y: 4 },
    { type: 'lamp', x: 3, y: 1 },
    { type: 'lamp', x: 3, y: 4 },
    // 打印机 (靠墙)
    { type: 'printer', x: 7, y: 5 },

    // 办公区 A — 桌面物品 (每个工位个性化)
    { type: 'deskcup', x: 3, y: 3 },     // 工位(2,3) 水杯
    { type: 'deskplant', x: 2, y: 2 },   // 工位(2,3) 盆栽
    { type: 'deskphoto', x: 6, y: 3 },   // 工位(5,3) 相框
    { type: 'deskplant', x: 5, y: 2 },   // 工位(5,3) 盆栽
    { type: 'deskcup', x: 3, y: 5 },     // 工位(2,5) 水杯
    { type: 'deskphoto', x: 6, y: 5 },   // 工位(5,5) 相框

    // ========================================
    // 办公区 B (右房间) — 装饰
    { type: 'window', x: 12, y: 1 },
    { type: 'bookshelf', x: 16, y: 1 }, { type: 'bookshelf', x: 17, y: 1 },
    { type: 'plant', x: 12, y: 4 },
    { type: 'lamp', x: 14, y: 1 },
    { type: 'lamp', x: 14, y: 4 },
    { type: 'clock', x: 18, y: 1 },

    // 办公区 B — 桌面物品
    { type: 'deskphoto', x: 14, y: 3 },  // 工位(13,3) 相框
    { type: 'deskplant', x: 13, y: 2 },  // 工位(13,3) 盆栽
    { type: 'deskcup', x: 17, y: 3 },    // 工位(16,3) 水杯
    { type: 'deskplant', x: 16, y: 2 },  // 工位(16,3) 盆栽
    { type: 'deskcup', x: 14, y: 5 },    // 工位(13,5) 水杯
    { type: 'deskphoto', x: 17, y: 5 },  // 工位(16,5) 相框

    // ========================================
    // 底部功能区 (y=9-10)
    // 🛋️ 休息区 (左下)
    { type: 'couch', x: 2, y: 9 }, { type: 'couch', x: 3, y: 9 }, { type: 'couch', x: 4, y: 9 },
    { type: 'couch', x: 2, y: 10 }, { type: 'couch', x: 3, y: 10 },
    { type: 'plant', x: 1, y: 9 }, { type: 'plant', x: 5, y: 9 },

    // 走廊地毯
    { type: 'carpet', x: 7, y: 9 }, { type: 'carpet', x: 8, y: 9 },
    { type: 'carpet', x: 7, y: 10 }, { type: 'carpet', x: 8, y: 10 },
    // 书架 (走廊旁)
    { type: 'bookshelf', x: 6, y: 9 },

    // ☕ 茶水间 (右中)
    { type: 'coffee', x: 13, y: 9 },
    { type: 'fridge', x: 14, y: 9 },
    { type: 'microwave', x: 15, y: 9 },
    { type: 'snackbar', x: 16, y: 9 },
    { type: 'watercooler', x: 12, y: 9 },
    { type: 'trash', x: 17, y: 9 },
    { type: 'plant', x: 11, y: 9 },

    // 📦 快递柜 (右下)
    { type: 'packagelocker', x: 13, y: 10 }, { type: 'packagelocker', x: 14, y: 10 },

    // 🚻 卫生间 (最右)
    { type: 'restroom', x: 17, y: 10 }, { type: 'restroom', x: 18, y: 10 },

    // ========================================
    // 入口区域 (y=10 底部)
    // 🏢 前台 (左侧)
    { type: 'receptiondesk', x: 1, y: 10 },
    // 🛗 电梯 (中央偏左)
    { type: 'elevator', x: 7, y: 10 }, { type: 'elevator', x: 8, y: 10 },
    // 🪧 导向标识 (电梯旁)
    { type: 'signpost', x: 10, y: 10 },
  ],
};

export const OPEN_PLAN_LAYOUT: OfficeLayout = {
  name: 'Open Plan',
  width: 15, height: 9,
  desks: [
    { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 2 }, { x: 11, y: 2 },
    { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 8, y: 5 }, { x: 11, y: 5 },
  ],
  furniture: [
    { type: 'coffee', x: 7, y: 3 }, { type: 'couch', x: 1, y: 7 },
    { type: 'couch', x: 2, y: 7 }, { type: 'whiteboard', x: 1, y: 1 },
    { type: 'bookshelf', x: 13, y: 1 }, { type: 'plant', x: 14, y: 4 },
  ],
};

export const LAYOUTS: Record<string, OfficeLayout> = {
  default: DEFAULT_LAYOUT,
  'open-plan': OPEN_PLAN_LAYOUT,
};

// ============================================
// Agent Skin Configurations
// ============================================

export interface AgentSkin {
  name: string;
  body: string;
  accent: string;
  hair: string;
  accessory: string;
  legs: string;
}

export const AGENT_SKINS: Record<string, AgentSkin[]> = {
  default: [
    { name: 'Coder', body: '#4a90d9', accent: '#7ab5ff', hair: '#444', accessory: 'glasses', legs: '#335' },
    { name: 'Reviewer', body: '#d94a4a', accent: '#ff7a7a', hair: '#444', accessory: 'magnifier', legs: '#335' },
    { name: 'Designer', body: '#d9a94a', accent: '#ffd97a', hair: '#444', accessory: 'palette', legs: '#335' },
    { name: 'Writer', body: '#4ad97a', accent: '#7affa9', hair: '#444', accessory: 'pen', legs: '#335' },
    { name: 'Tester', body: '#a94ad9', accent: '#d97aff', hair: '#444', accessory: 'bug', legs: '#335' },
  ],
  pastel: [
    { name: 'Coder', body: '#a8d8ea', accent: '#d4f0f7', hair: '#f5e6ca', accessory: 'glasses', legs: '#c3e0e5' },
    { name: 'Reviewer', body: '#f8b4c8', accent: '#fce4ec', hair: '#e8d5b7', accessory: 'magnifier', legs: '#f0c4d4' },
    { name: 'Designer', body: '#ffd3b6', accent: '#ffe5d0', hair: '#d4a574', accessory: 'palette', legs: '#f5c7a3' },
    { name: 'Writer', body: '#dcedc1', accent: '#e8f5e9', hair: '#8d6e63', accessory: 'pen', legs: '#c5e1a5' },
    { name: 'Tester', body: '#e8daef', accent: '#f3e5f5', hair: '#4a4a4a', accessory: 'bug', legs: '#d2b4de' },
  ],
};

// ============================================
// Config Manager
// ============================================

export class ConfigManager {
  private theme: ThemeColors = DEFAULT_THEME;
  private layout: OfficeLayout = DEFAULT_LAYOUT;
  private skins: AgentSkin[] = AGENT_SKINS.default;

  setTheme(name: string): boolean {
    if (THEMES[name]) { this.theme = THEMES[name]; return true; }
    return false;
  }

  setLayout(name: string): boolean {
    if (LAYOUTS[name]) { this.layout = LAYOUTS[name]; return true; }
    return false;
  }

  setSkins(name: string): boolean {
    if (AGENT_SKINS[name]) { this.skins = AGENT_SKINS[name]; return true; }
    return false;
  }

  getTheme(): ThemeColors { return this.theme; }
  getLayout(): OfficeLayout { return this.layout; }
  getSkins(): AgentSkin[] { return this.skins; }
  getAvailableThemes(): string[] { return Object.keys(THEMES); }
  getAvailableLayouts(): string[] { return Object.keys(LAYOUTS); }
  getAvailableSkins(): string[] { return Object.keys(AGENT_SKINS); }
}
