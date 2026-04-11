// ============================================
// Pixel Agents - Configuration System
// ============================================
// 参考: pablodelucca/pixel-agents — 两房间办公室布局
// 布局: 20×11 双房间 + 中间隔墙 + 门洞

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

export const DEFAULT_THEME: ThemeColors = {
  background: '#2c2016',
  wall: '#3a3a52',
  wallHighlight: 'rgba(255,255,255,0.08)',
  wallShadow: 'rgba(0,0,0,0.25)',
  // 暖色地板 (参考项目: 米色 #c4a882 / 棕色 #8a7058)
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
// 20×11 双房间办公室 (参考 pablodelucca/pixel-agents)
//
// ┌─────────────────────────────────────────────┐
// │ 🪴   办公区 A         │  办公区 B    📦   │
// │      4 工位   🖥️     │   4 工位           │
// │  ┌──┐ ┌──┐           │           ┌──┐┌──┐  │
// │  │💻│ │💻│           │           │💻││💻│  │
// │  └──┘ └──┘           │           └──┘└──┘  │
// │                       │  ┌──┐ ┌──┐          │
// │  ┌──┐ ┌──┐           │  │💻│ │💻│          │
// │  │💻│ │💻│           │  └──┘ └──┘          │
// │  └──┘ └──┘           │                     │
// │                       │  ☕ 🛋️              │
// ├───────  隔墙 ─🚪──────┼─────────────────────┤
// │ 🛋️ 休息区   │  走廊   │  茶水间    │ 🚻    │
// │  沙发      │         │ 咖啡/冰箱  │ 卫生间 │
// └────────────┴─────────┴────────────┴────────┘
//
// 左房间: x=1-9 (暖色地板)
// 右房间: x=11-18 (深色地板)
// 隔墙: x=10 (带门洞 y=5-6)

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
    // 上排 (面朝上)
    { x: 3, y: 2 }, { x: 6, y: 2 },
    // 下排 (面朝下)
    { x: 3, y: 5 }, { x: 6, y: 5 },
    // ===== 办公区 B (右房间) =====
    // 上排 (面朝上)
    { x: 13, y: 2 }, { x: 16, y: 2 },
    // 下排 (面朝下)
    { x: 13, y: 5 }, { x: 16, y: 5 },
  ],
  furniture: [
    // ========================================
    // 隔墙 (x=10) — 分隔两个房间，留门洞
    // 上段墙 (y=1-4)
    { type: 'poster', x: 10, y: 1 },
    { type: 'poster', x: 10, y: 2 },
    { type: 'poster', x: 10, y: 3 },
    { type: 'poster', x: 10, y: 4 },
    // 门洞 (y=5-6)
    { type: 'door', x: 10, y: 5 },
    { type: 'door', x: 10, y: 6 },
    // 下段墙 (y=7-9)
    { type: 'poster', x: 10, y: 7 },
    { type: 'poster', x: 10, y: 8 },
    { type: 'poster', x: 10, y: 9 },

    // ========================================
    // 办公区 A (左房间) — 桌面物品
    { type: 'deskcup', x: 4, y: 2 },   // 工位(3,2)
    { type: 'deskplant', x: 3, y: 1 },
    { type: 'deskphoto', x: 7, y: 2 }, // 工位(6,2)
    { type: 'deskplant', x: 6, y: 1 },
    { type: 'deskcup', x: 4, y: 5 },   // 工位(3,5)
    { type: 'deskphoto', x: 7, y: 5 }, // 工位(6,5)

    // 办公区 A — 装饰
    { type: 'whiteboard', x: 1, y: 1 }, { type: 'whiteboard', x: 2, y: 1 },
    { type: 'bookshelf', x: 8, y: 1 }, { type: 'bookshelf', x: 9, y: 1 },
    { type: 'kanban', x: 4, y: 1 }, { type: 'kanban', x: 5, y: 1 },
    { type: 'window', x: 1, y: 4 }, { type: 'window', x: 2, y: 4 },
    { type: 'plant', x: 9, y: 4 },
    { type: 'lamp', x: 4, y: 1 },
    { type: 'lamp', x: 4, y: 4 },
    // 打印机
    { type: 'printer', x: 9, y: 2 }, { type: 'printer', x: 9, y: 3 },

    // ========================================
    // 办公区 B (右房间) — 桌面物品
    { type: 'deskphoto', x: 14, y: 2 },// 工位(13,2)
    { type: 'deskplant', x: 13, y: 1 },
    { type: 'deskcup', x: 17, y: 2 },  // 工位(16,2)
    { type: 'deskplant', x: 16, y: 1 },
    { type: 'deskcup', x: 14, y: 5 },  // 工位(13,5)
    { type: 'deskphoto', x: 17, y: 5 },// 工位(16,5)

    // 办公区 B — 装饰
    { type: 'window', x: 18, y: 1 }, { type: 'window', x: 18, y: 2 },
    { type: 'bookshelf', x: 11, y: 1 }, { type: 'bookshelf', x: 12, y: 1 },
    { type: 'plant', x: 11, y: 4 },
    { type: 'lamp', x: 14, y: 1 },
    { type: 'lamp', x: 14, y: 4 },
    // 时钟
    { type: 'clock', x: 15, y: 1 },
    // 装饰画
    { type: 'poster', x: 17, y: 1 },

    // ========================================
    // 底部区域 (y=7-9)
    // 🛋️ 休息区 (左下)
    { type: 'couch', x: 2, y: 8 }, { type: 'couch', x: 3, y: 8 }, { type: 'couch', x: 4, y: 8 },
    { type: 'couch', x: 2, y: 9 }, { type: 'couch', x: 3, y: 9 },
    { type: 'plant', x: 1, y: 8 }, { type: 'plant', x: 5, y: 8 },
    { type: 'bookshelf', x: 6, y: 8 }, { type: 'bookshelf', x: 7, y: 8 },
    // 地毯区域 (走廊)
    { type: 'carpet', x: 8, y: 7 }, { type: 'carpet', x: 9, y: 7 },
    { type: 'carpet', x: 8, y: 8 }, { type: 'carpet', x: 9, y: 8 },
    { type: 'carpet', x: 8, y: 9 }, { type: 'carpet', x: 9, y: 9 },

    // ☕ 茶水间 (右下)
    { type: 'coffee', x: 13, y: 8 },
    { type: 'fridge', x: 13, y: 9 },
    { type: 'microwave', x: 14, y: 8 },
    { type: 'snackbar', x: 15, y: 8 },
    { type: 'watercooler', x: 12, y: 8 },
    { type: 'trash', x: 15, y: 9 },
    { type: 'plant', x: 11, y: 8 },

    // 🚻 卫生间 (最右)
    { type: 'restroom', x: 17, y: 8 }, { type: 'restroom', x: 18, y: 8 },

    // ========================================
    // 入口区域 (y=10 — 最底部)
    { type: 'elevator', x: 8, y: 10 }, { type: 'elevator', x: 9, y: 10 },
    { type: 'receptiondesk', x: 5, y: 10 }, { type: 'receptiondesk', x: 6, y: 10 },
    { type: 'packagelocker', x: 13, y: 10 }, { type: 'packagelocker', x: 14, y: 10 },
    { type: 'plant', x: 3, y: 10 }, { type: 'plant', x: 16, y: 10 },
    // 导向标识
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
