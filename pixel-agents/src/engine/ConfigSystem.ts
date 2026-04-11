// ============================================
// Pixel Agents - Configuration System
// ============================================
// Manage themes, layouts, and agent skins via config objects

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
  background: '#1a1a2e',
  wall: '#2a2a3e',
  wallHighlight: 'rgba(255,255,255,0.1)',
  wallShadow: 'rgba(0,0,0,0.2)',
  floor: '#4a4a6a',
  floorPattern: 'rgba(255,255,255,0.03)',
  floorGrid: 'rgba(255,255,255,0.05)',
  desk: '#8b6914',
  deskTop: '#a07820',
  deskLeg: '#6b5010',
  monitor: '#333',
  monitorScreen: '#5599cc',
  accent: '#e94560',
  text: '#e0e0e0',
  textMuted: '#94a3b8',
  header: '#16213e',
  headerBorder: '#0f3460',
  statusbar: '#16213e',
  statusbarBorder: '#0f3460',
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
// 20×14 中型办公室 — 按真实办公室逻辑分区
//
// 平面布局 (俯视图):
// ┌─────────────────────────────────────────┐
// │  会议室 [玻璃房]  │  窗  │   窗         │
// │  ┌──────────┐     │      │              │
// │  │ 会议桌   │     │      │   书架       │
// │  └──────────┘     │      │              │
// │───────────────────┼──────┼──────────────│ ← 分隔墙 + 门
// │   工位区 A        │ 走廊 │  工位区 B     │
// │  [ ][ ][ ]        │      │  [ ][ ][ ]    │
// │  [ ][ ][ ]        │      │  [ ][ ][ ]    │
// │───────────────────┼──────┼──────────────│
// │                   │      │              │
// │   休息区          │ 走廊 │  茶水间       │
// │   沙发            │      │  咖啡/冰箱    │
// │                   │      │              │
// │───┬──────────┬────┼──────┼──────────────│
// │ 洗 │  前台    │ 电梯     │  快递柜      │
// │ 手 │  接待台  │          │              │
// └───┴──────────┴──────────┴───────────────┘
//
// y:0         y:7          y:13
//
// x:0       x:7  x:9 x:11       x:19

export interface OfficeLayout {
  name: string;
  width: number;
  height: number;
  desks: { x: number; y: number }[];
  furniture: { type: string; x: number; y: number }[];
}

export const DEFAULT_LAYOUT: OfficeLayout = {
  name: '中型办公室',
  width: 20, height: 14,
  desks: [
    // 工位区 A (面朝上，y=4) — 上排
    { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 },
    // 工位区 A (面朝下，y=6) — 下排
    { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 6, y: 6 },
    // 工位区 B (面朝上，y=4) — 上排
    { x: 12, y: 4 }, { x: 14, y: 4 }, { x: 16, y: 4 },
    // 工位区 B (面朝下，y=6) — 下排
    { x: 12, y: 6 }, { x: 14, y: 6 }, { x: 16, y: 6 },
  ],
  furniture: [
    // ========================================
    // 会议室 (左上角 x:1-7, y:1-3)
    // 会议室地面用 carpet 区分
    { type: 'carpet', x: 1, y: 1 }, { type: 'carpet', x: 2, y: 1 }, { type: 'carpet', x: 3, y: 1 },
    { type: 'carpet', x: 4, y: 1 }, { type: 'carpet', x: 5, y: 1 }, { type: 'carpet', x: 6, y: 1 }, { type: 'carpet', x: 7, y: 1 },
    { type: 'carpet', x: 1, y: 2 }, { type: 'carpet', x: 2, y: 2 }, { type: 'carpet', x: 3, y: 2 },
    { type: 'carpet', x: 4, y: 2 }, { type: 'carpet', x: 5, y: 2 }, { type: 'carpet', x: 6, y: 2 }, { type: 'carpet', x: 7, y: 2 },
    { type: 'carpet', x: 1, y: 3 }, { type: 'carpet', x: 2, y: 3 }, { type: 'carpet', x: 3, y: 3 },
    { type: 'carpet', x: 4, y: 3 }, { type: 'carpet', x: 5, y: 3 }, { type: 'carpet', x: 6, y: 3 }, { type: 'carpet', x: 7, y: 3 },
    // 会议桌 3×2 (居中)
    { type: 'meetingtable', x: 3, y: 1 }, { type: 'meetingtable', x: 4, y: 1 }, { type: 'meetingtable', x: 5, y: 1 },
    { type: 'meetingtable', x: 3, y: 2 }, { type: 'meetingtable', x: 4, y: 2 }, { type: 'meetingtable', x: 5, y: 2 },
    // 会议室白板
    { type: 'whiteboard', x: 6, y: 3 }, { type: 'whiteboard', x: 7, y: 3 },
    // 会议室门 (右侧)
    { type: 'door', x: 7, y: 2 },

    // ========================================
    // 分隔墙 (y=7) — 把办公区和底部分开，留门
    { type: 'carpet', x: 1, y: 7 }, { type: 'carpet', x: 2, y: 7 }, { type: 'carpet', x: 3, y: 7 },
    { type: 'carpet', x: 4, y: 7 }, { type: 'carpet', x: 5, y: 7 }, { type: 'carpet', x: 6, y: 7 },
    { type: 'carpet', x: 8, y: 7 }, // 走廊处留门
    { type: 'carpet', x: 11, y: 7 }, { type: 'carpet', x: 12, y: 7 }, { type: 'carpet', x: 13, y: 7 },
    { type: 'carpet', x: 14, y: 7 }, { type: 'carpet', x: 15, y: 7 }, { type: 'carpet', x: 16, y: 7 },
    { type: 'carpet', x: 17, y: 7 }, { type: 'carpet', x: 18, y: 7 },
    // 墙段
    { type: 'poster', x: 7, y: 7 },  // 走廊左侧的墙
    { type: 'poster', x: 10, y: 7 }, // 走廊中间
    { type: 'poster', x: 11, y: 7 },

    // ========================================
    // 中央走廊 (x:9, 从 y=1 贯穿到底)
    { type: 'carpet', x: 9, y: 1 }, { type: 'carpet', x: 9, y: 2 }, { type: 'carpet', x: 9, y: 3 },
    { type: 'carpet', x: 9, y: 4 }, { type: 'carpet', x: 9, y: 5 }, { type: 'carpet', x: 9, y: 6 },
    // (y=7 已经在上面定义了)
    { type: 'carpet', x: 9, y: 8 }, { type: 'carpet', x: 9, y: 9 },
    { type: 'carpet', x: 9, y: 10 }, { type: 'carpet', x: 9, y: 11 }, { type: 'carpet', x: 9, y: 12 },

    // ========================================
    // 工位区 A 个人物品
    { type: 'deskcup', x: 3, y: 4 },   // 工位(2,4)
    { type: 'deskplant', x: 2, y: 3 },
    { type: 'deskphoto', x: 5, y: 4 }, // 工位(4,4)
    { type: 'deskcup', x: 7, y: 4 },   // 工位(6,4)
    { type: 'deskcup', x: 3, y: 6 },   // 工位(2,6)
    { type: 'deskplant', x: 2, y: 7 },
    { type: 'deskplant', x: 5, y: 6 }, // 工位(4,6)
    { type: 'deskphoto', x: 7, y: 6 }, // 工位(6,6)

    // 工位区 B 个人物品
    { type: 'deskcup', x: 13, y: 4 },  // 工位(12,4)
    { type: 'deskphoto', x: 15, y: 4 },// 工位(14,4)
    { type: 'deskplant', x: 15, y: 3 },
    { type: 'deskcup', x: 17, y: 4 },  // 工位(16,4)
    { type: 'deskplant', x: 13, y: 6 },// 工位(12,6)
    { type: 'deskcup', x: 15, y: 6 },  // 工位(14,6)
    { type: 'deskplant', x: 17, y: 6 },// 工位(16,6)

    // ========================================
    // 看板墙 (办公区上方墙面，工位区 A 上方)
    { type: 'kanban', x: 3, y: 1 }, { type: 'kanban', x: 4, y: 1 },
    { type: 'kanban', x: 5, y: 1 }, { type: 'kanban', x: 6, y: 1 },

    // ========================================
    // 休息区 (左下 x:1-8, y:8-10)
    { type: 'couch', x: 2, y: 9 }, { type: 'couch', x: 3, y: 9 }, { type: 'couch', x: 4, y: 9 },
    { type: 'couch', x: 2, y: 10 }, { type: 'couch', x: 3, y: 10 },
    // 休息区绿植
    { type: 'plant', x: 1, y: 8 }, { type: 'plant', x: 6, y: 8 },
    // 书架 (休息区墙面)
    { type: 'bookshelf', x: 5, y: 8 }, { type: 'bookshelf', x: 6, y: 8 },

    // ========================================
    // 茶水间 (右下 x:12-18, y:8-10)
    // 茶水间地面
    { type: 'carpet', x: 12, y: 8 }, { type: 'carpet', x: 13, y: 8 }, { type: 'carpet', x: 14, y: 8 },
    { type: 'carpet', x: 15, y: 8 }, { type: 'carpet', x: 16, y: 8 }, { type: 'carpet', x: 17, y: 8 }, { type: 'carpet', x: 18, y: 8 },
    { type: 'carpet', x: 12, y: 9 }, { type: 'carpet', x: 13, y: 9 }, { type: 'carpet', x: 14, y: 9 },
    { type: 'carpet', x: 15, y: 9 }, { type: 'carpet', x: 16, y: 9 }, { type: 'carpet', x: 17, y: 9 }, { type: 'carpet', x: 18, y: 9 },
    { type: 'carpet', x: 12, y: 10 }, { type: 'carpet', x: 13, y: 10 }, { type: 'carpet', x: 14, y: 10 },
    { type: 'carpet', x: 15, y: 10 }, { type: 'carpet', x: 16, y: 10 }, { type: 'carpet', x: 17, y: 10 }, { type: 'carpet', x: 18, y: 10 },
    // 茶水间设备 — 沿墙摆放
    { type: 'coffee', x: 18, y: 8 },
    { type: 'microwave', x: 18, y: 9 },
    { type: 'fridge', x: 18, y: 10 },
    { type: 'snackbar', x: 12, y: 8 },
    { type: 'watercooler', x: 11, y: 9 },
    { type: 'trash', x: 12, y: 10 },
    // 茶水间绿植
    { type: 'plant', x: 11, y: 8 },

    // ========================================
    // 底部区域 (y=11-12)
    // 🚻 卫生间 (最左侧)
    { type: 'restroom', x: 1, y: 11 }, { type: 'restroom', x: 2, y: 11 },
    // 🏢 前台接待台 (左侧中间)
    { type: 'receptiondesk', x: 5, y: 11 }, { type: 'receptiondesk', x: 6, y: 11 },
    // 🛗 电梯 (中央)
    { type: 'elevator', x: 8, y: 11 }, { type: 'elevator', x: 9, y: 11 },
    { type: 'elevator', x: 10, y: 11 }, { type: 'elevator', x: 11, y: 11 },
    // 📦 快递柜 (右侧)
    { type: 'packagelocker', x: 15, y: 11 }, { type: 'packagelocker', x: 16, y: 11 },
    { type: 'packagelocker', x: 17, y: 11 }, { type: 'packagelocker', x: 18, y: 11 },

    // ========================================
    // 窗户 (顶部外墙 y=1, 工位区B上方)
    { type: 'window', x: 12, y: 1 }, { type: 'window', x: 14, y: 1 }, { type: 'window', x: 16, y: 1 },
    // 时钟 (走廊尽头)
    { type: 'clock', x: 9, y: 12 },
    // 导向标识 (走廊中央)
    { type: 'signpost', x: 10, y: 7 },
    // 顶灯
    { type: 'lamp', x: 4, y: 1 }, { type: 'lamp', x: 14, y: 1 },
    { type: 'lamp', x: 4, y: 5 }, { type: 'lamp', x: 14, y: 5 },
    { type: 'lamp', x: 3, y: 9 }, { type: 'lamp', x: 15, y: 9 },
    // 装饰画
    { type: 'poster', x: 1, y: 1 },
    { type: 'poster', x: 18, y: 1 },
    // 打印机 (工位区B右侧)
    { type: 'printer', x: 18, y: 4 }, { type: 'printer', x: 18, y: 5 },
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
