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
  background: '#0a0a0a',
  wall: '#1a0a2e',
  wallHighlight: 'rgba(0,255,255,0.1)',
  wallShadow: 'rgba(255,0,255,0.1)',
  floor: '#0f1a0f',
  floorPattern: 'rgba(0,255,0,0.03)',
  floorGrid: 'rgba(0,255,0,0.08)',
  desk: '#1a4a1a',
  deskTop: '#2a6a2a',
  deskLeg: '#0a3a0a',
  monitor: '#00ff00',
  monitorScreen: '#00ff00',
  accent: '#00ff00',
  text: '#00ff00',
  textMuted: '#00aa00',
  header: '#0a1a0a',
  headerBorder: '#00ff00',
  statusbar: '#0a1a0a',
  statusbarBorder: '#00ff00',
};

export const SUNSET_THEME: ThemeColors = {
  background: '#2d1b69',
  wall: '#1a1040',
  wallHighlight: 'rgba(255,165,0,0.1)',
  wallShadow: 'rgba(255,69,0,0.1)',
  floor: '#4a2a5e',
  floorPattern: 'rgba(255,165,0,0.03)',
  floorGrid: 'rgba(255,165,0,0.05)',
  desk: '#8b5a14',
  deskTop: '#a06a20',
  deskLeg: '#6b4a10',
  monitor: '#333',
  monitorScreen: '#ff9944',
  accent: '#ff6b35',
  text: '#ffe0b2',
  textMuted: '#ffab91',
  header: '#1a0a40',
  headerBorder: '#4a1a8e',
  statusbar: '#1a0a40',
  statusbarBorder: '#4a1a8e',
};

export const THEMES: Record<string, ThemeColors> = {
  default: DEFAULT_THEME,
  cyber: CYBER_THEME,
  sunset: SUNSET_THEME,
};

// ============================================
// Layout Configurations
// ============================================

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
    // 上排工位（面朝上）
    { x: 3, y: 5 }, { x: 7, y: 5 }, { x: 11, y: 5 }, { x: 15, y: 5 },
    // 下排工位（面朝下）
    { x: 3, y: 9 }, { x: 7, y: 9 }, { x: 11, y: 9 }, { x: 15, y: 9 },
  ],
  furniture: [
    // ===== 入口区域 (底部 y=11-12) =====
    { type: 'elevator', x: 9, y: 12 },
    { type: 'elevator', x: 10, y: 12 },
    { type: 'receptiondesk', x: 12, y: 12 },
    // 地毯走廊 — 从电梯口贯穿到办公区
    { type: 'carpet', x: 9, y: 11 }, { type: 'carpet', x: 10, y: 11 },
    { type: 'carpet', x: 9, y: 10 }, { type: 'carpet', x: 10, y: 10 },
    // 入口两侧绿植
    { type: 'plant', x: 7, y: 12 }, { type: 'plant', x: 14, y: 12 },
    // 📦 快递柜 (入口旁)
    { type: 'packagelocker', x: 15, y: 11 },
    { type: 'packagelocker', x: 15, y: 12 },
    // ☂️ 雨伞架 (入口左侧)
    { type: 'umbrella', x: 7, y: 11 },
    // 📱 打卡机 (入口右侧墙边)
    { type: 'attendancemachine', x: 13, y: 11 },

    // ===== 办公区 (y=4-9, x=1-16) =====
    // 🧑‍💻 工位个人物品 — 每个工位都有自己的特色
    // 工位1: 水杯 + 小盆栽
    { type: 'deskcup', x: 4, y: 5 }, { type: 'deskplant', x: 3, y: 4 },
    // 工位2: 相框 + 水杯
    { type: 'deskphoto', x: 8, y: 5 }, { type: 'deskcup', x: 7, y: 4 },
    // 工位3: 小盆栽 + 水杯
    { type: 'deskplant', x: 12, y: 5 }, { type: 'deskcup', x: 11, y: 4 },
    // 工位4: 水杯
    { type: 'deskcup', x: 16, y: 5 },
    // 工位5: 水杯 + 小盆栽
    { type: 'deskcup', x: 4, y: 9 }, { type: 'deskplant', x: 3, y: 10 },
    // 工位6: 相框 + 小盆栽
    { type: 'deskphoto', x: 8, y: 9 }, { type: 'deskplant', x: 7, y: 10 },
    // 工位7: 水杯 + 相框
    { type: 'deskcup', x: 11, y: 10 }, { type: 'deskphoto', x: 12, y: 9 },
    // 工位8: 水杯
    { type: 'deskcup', x: 16, y: 9 },

    // 💼 看板墙 (工位上方墙面)
    { type: 'kanban', x: 3, y: 3 },
    { type: 'kanban', x: 4, y: 3 },
    { type: 'kanban', x: 5, y: 3 },
    { type: 'kanban', x: 6, y: 3 },

    // ===== 茶水间 (右下角 x=13-18, y=8-10) =====
    { type: 'coffee', x: 16, y: 8 },
    { type: 'microwave', x: 17, y: 8 },
    { type: 'snackbar', x: 17, y: 9 },
    { type: 'fridge', x: 16, y: 10 },
    { type: 'trash', x: 18, y: 8 },
    { type: 'watercooler', x: 15, y: 10 },
    // 茶水间绿植
    { type: 'plant', x: 14, y: 8 },

    // ===== 休息区 (左下角 x=1-6, y=10-12) =====
    { type: 'couch', x: 2, y: 11 }, { type: 'couch', x: 3, y: 11 }, { type: 'couch', x: 4, y: 11 },
    { type: 'couch', x: 2, y: 12 }, { type: 'couch', x: 3, y: 12 },
    { type: 'plant', x: 1, y: 10 }, { type: 'plant', x: 5, y: 10 },

    // ===== 会议室 (右上角 x=13-18, y=1-4) =====
    // 会议室地面用 carpet 区分
    { type: 'carpet', x: 13, y: 1 }, { type: 'carpet', x: 14, y: 1 }, { type: 'carpet', x: 15, y: 1 },
    { type: 'carpet', x: 16, y: 1 }, { type: 'carpet', x: 17, y: 1 }, { type: 'carpet', x: 18, y: 1 },
    { type: 'carpet', x: 13, y: 2 }, { type: 'carpet', x: 14, y: 2 }, { type: 'carpet', x: 15, y: 2 },
    { type: 'carpet', x: 16, y: 2 }, { type: 'carpet', x: 17, y: 2 }, { type: 'carpet', x: 18, y: 2 },
    { type: 'carpet', x: 13, y: 3 }, { type: 'carpet', x: 14, y: 3 }, { type: 'carpet', x: 15, y: 3 },
    { type: 'carpet', x: 16, y: 3 }, { type: 'carpet', x: 17, y: 3 }, { type: 'carpet', x: 18, y: 3 },
    { type: 'carpet', x: 13, y: 4 }, { type: 'carpet', x: 14, y: 4 }, { type: 'carpet', x: 15, y: 4 },
    { type: 'carpet', x: 16, y: 4 }, { type: 'carpet', x: 17, y: 4 }, { type: 'carpet', x: 18, y: 4 },
    // 会议桌 3x2
    { type: 'meetingtable', x: 14, y: 2 }, { type: 'meetingtable', x: 15, y: 2 }, { type: 'meetingtable', x: 16, y: 2 },
    { type: 'meetingtable', x: 14, y: 3 }, { type: 'meetingtable', x: 15, y: 3 }, { type: 'meetingtable', x: 16, y: 3 },
    // 会议室白板
    { type: 'whiteboard', x: 17, y: 1 }, { type: 'whiteboard', x: 18, y: 1 },
    // 会议室时钟
    { type: 'clock', x: 13, y: 1 },

    // ===== 办公区墙面装饰 (y=1) =====
    // 左上：白板 + 书架
    { type: 'whiteboard', x: 2, y: 1 }, { type: 'whiteboard', x: 3, y: 1 },
    { type: 'bookshelf', x: 7, y: 1 }, { type: 'bookshelf', x: 8, y: 1 },
    // 装饰画
    { type: 'poster', x: 1, y: 1 },
    { type: 'poster', x: 9, y: 1 },
    // 窗户
    { type: 'window', x: 10, y: 1 }, { type: 'window', x: 11, y: 1 },

    // ===== 其他 =====
    // 🖨️ 打印机 (办公区右侧)
    { type: 'printer', x: 18, y: 5 }, { type: 'printer', x: 18, y: 6 },
    // 🚻 卫生间 (左侧)
    { type: 'restroom', x: 1, y: 6 },
    // 🪧 导向标识
    { type: 'signpost', x: 9, y: 7 },
    // 💡 顶灯
    { type: 'lamp', x: 5, y: 2 }, { type: 'lamp', x: 11, y: 2 },
    { type: 'lamp', x: 5, y: 7 }, { type: 'lamp', x: 11, y: 7 },
    { type: 'lamp', x: 5, y: 11 }, { type: 'lamp', x: 14, y: 9 },
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
