// ============================================
// Pixel Agents - Configuration System
// ============================================
// 办公室布局设计 (参考 pablodelucca/pixel-agents + 设计原则)
// 设计原则: 空间层次 / 呼吸感 / 动线清晰 / 色彩统一
// 尺寸: 20×13 — 增加高度，确保底部功能区不被外墙覆盖

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
// 📐 20×13 专业办公室 — 两房间 + 完整入口区
//
// 关键修复: 之前 height=11，y=10 是最底行 = 外墙，
// 前台/电梯/卫生间全放在 y=10，被墙覆盖了！
// 现在 height=13，家具放 y=11，y=12 才是底墙。
//
// 布局平面图:
// ┌───────────────────────────────────────────────┐
// │ 白板 白板 │  🪴  │  🪴  │ 书架 书架 │ 时钟  │  y=1
// │                                             │
// │ 💻  💻   │     │      │  💻  💻   │        │  y=3
// │                                             │
// │ 💻  💻   │     │      │  💻  💻   │        │  y=5
// │                                             │
// ├── 隔墙 ──┼──🚪─┼──────┼─── 隔墙 ──┤        │  y=7
// │                                             │
// │ 🛋️🛋️🛋️  │走廊 │      │ ☕🧊📦    │  🚻   │  y=9
// │                                             │
// │ 前台 🏢 │🛗电梯│      │ 📦快递柜  │        │  y=11 入口区
// └─────────┴──────┴──────┴───────────┴────────┘  y=12 底墙

export interface OfficeLayout {
  name: string;
  width: number;
  height: number;
  desks: { x: number; y: number }[];
  furniture: { type: string; x: number; y: number }[];
}

export const DEFAULT_LAYOUT: OfficeLayout = {
  name: '双房间办公室',
  width: 20, height: 13,
  desks: [
    // ===== 办公区 A (左房间) =====
    { x: 2, y: 3 }, { x: 5, y: 3 },   // 上排
    { x: 2, y: 5 }, { x: 5, y: 5 },   // 下排
    // ===== 办公区 B (右房间) =====
    { x: 16, y: 3 }, { x: 18, y: 3 }, // 上排
    { x: 13, y: 5 }, { x: 16, y: 5 }, // 下排
  ],
  furniture: [
    // ========================================
    // 走廊地面 — 🧶 地毯（真实办公室走廊铺地毯，减少脚步声）
    // 上走廊 (x=8-10, y=2-6)
    { type: 'carpet', x: 8, y: 2 }, { type: 'carpet', x: 9, y: 2 }, { type: 'carpet', x: 10, y: 2 },
    { type: 'carpet', x: 8, y: 3 }, { type: 'carpet', x: 9, y: 3 }, { type: 'carpet', x: 10, y: 3 },
    { type: 'carpet', x: 8, y: 4 }, { type: 'carpet', x: 9, y: 4 }, { type: 'carpet', x: 10, y: 4 },
    { type: 'carpet', x: 8, y: 5 }, { type: 'carpet', x: 9, y: 5 }, { type: 'carpet', x: 10, y: 5 },
    { type: 'carpet', x: 8, y: 6 }, { type: 'carpet', x: 9, y: 6 }, { type: 'carpet', x: 10, y: 6 },
    // 走廊中部门洞区域
    { type: 'carpet', x: 8, y: 7 }, { type: 'carpet', x: 10, y: 7 },
    { type: 'carpet', x: 8, y: 8 }, { type: 'carpet', x: 10, y: 8 },
    // 下走廊 (x=8-10, y=9-10)
    { type: 'carpet', x: 8, y: 9 }, { type: 'carpet', x: 9, y: 9 }, { type: 'carpet', x: 10, y: 9 },
    { type: 'carpet', x: 8, y: 10 }, { type: 'carpet', x: 9, y: 10 }, { type: 'carpet', x: 10, y: 10 },

    // 🍽️ 午餐桌 — 走廊里的午餐区，打工人们围坐吃饭聊八卦的地方
    // 放在下走廊靠右 (10,9)，茶水间旁边，方便拿完饭坐下来吃
    { type: 'lunchtable', x: 10, y: 9 },

    // ========================================
    // 隔墙 (x=9) — 分隔两个房间
    // 上段 (y=1-6) — 海报替代为半透明隔断，更现代
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
    { type: 'poster', x: 9, y: 10 },

    // ========================================
    // 办公区 A (左房间) — 装饰
    { type: 'whiteboard', x: 1, y: 1 }, { type: 'whiteboard', x: 2, y: 1 },
    { type: 'window', x: 7, y: 1 },
    { type: 'plant', x: 7, y: 4 },
    { type: 'lamp', x: 3, y: 1 },
    { type: 'lamp', x: 3, y: 4 },
    // 💡 天花板灯盘 (左房间) — 真实办公室的 LED 嵌入式照明，昼夜呼吸调光
    { type: 'ceilinglight', x: 4, y: 1 },
    { type: 'ceilinglight', x: 5, y: 4 },
    // 打印机 (靠墙)
    { type: 'printer', x: 7, y: 5 },
    // 🧯 灭火器 — 左房间隔墙边 (1,7)，真实办公室安全标配
    { type: 'fireextinguisher', x: 1, y: 8 },

    // 🖥️ 服务器机房 — 左房间左下角，玻璃围起来的小机房，真实科技公司标配
    // 位置: x=2-3, y=6-7，用半透明玻璃隔断围起来，里面放服务器机柜
    // 玻璃墙 (左侧) — walkable 的半透明玻璃
    { type: 'serverroomglass', x: 2, y: 6 },
    { type: 'serverroomglass', x: 2, y: 7 },
    // 服务器机柜 (玻璃里面)
    { type: 'serverrack', x: 3, y: 6 },
    { type: 'serverrack', x: 3, y: 7 },

    // 办公区 A — 桌面物品
    { type: 'deskcup', x: 3, y: 3 },
    { type: 'deskplant', x: 2, y: 2 },
    { type: 'deskphoto', x: 6, y: 3 },
    { type: 'deskplant', x: 5, y: 2 },
    { type: 'deskcup', x: 3, y: 5 },
    { type: 'deskphoto', x: 6, y: 5 },

    // ========================================
    // 办公区 B (右房间) — 装饰
    { type: 'window', x: 11, y: 1 },
    { type: 'bookshelf', x: 16, y: 1 }, { type: 'bookshelf', x: 17, y: 1 },
    { type: 'plant', x: 12, y: 4 },
    { type: 'lamp', x: 14, y: 1 },
    { type: 'lamp', x: 14, y: 5 },
    { type: 'clock', x: 18, y: 1 },
    // 💡 天花板灯盘 (右房间)
    { type: 'ceilinglight', x: 14, y: 2 },
    { type: 'ceilinglight', x: 15, y: 5 },
    // 💡 天花板灯盘 (走廊) — 连接两个房间的主通道
    { type: 'ceilinglight', x: 9, y: 3 },
    { type: 'ceilinglight', x: 9, y: 5 },

    // ➡️ 导向箭头 (走廊关键路口) — 打工人找路必备
    // (8,2) → 指向茶水间方向 | (10,2) → 指向办公区
    { type: 'floorarrow', x: 8, y: 2 },
    { type: 'floorarrow', x: 10, y: 2 },
    // (8,5) → 指向休息区 | (10,5) → 指向电梯
    { type: 'floorarrow', x: 8, y: 5 },
    { type: 'floorarrow', x: 10, y: 5 },

    // 🏷️ 团队分区标识 — 走廊地面上的彩色团队标签，真实办公室标配
    // 放在下走廊 (8,8)，正对门口，走进来第一眼就能看到团队分区
    { type: 'zonelabel', x: 8, y: 8 },

    // 办公区 B — 桌面物品
    { type: 'deskphoto', x: 17, y: 3 },
    { type: 'deskplant', x: 15, y: 2 },
    { type: 'deskcup', x: 17, y: 5 },
    { type: 'deskplant', x: 16, y: 2 },
    { type: 'deskphoto', x: 18, y: 5 },

    // ========================================
    // 底部功能区 (y=9-11)
    // 🛋️ 休息区 (左下) — 沙发 + 电视 + 绿植，真实办公室休息区
    { type: 'couch', x: 2, y: 9 }, { type: 'couch', x: 3, y: 9 }, { type: 'couch', x: 4, y: 9 },
    { type: 'plant', x: 1, y: 9 }, { type: 'plant', x: 5, y: 9 },
    // 📺 壁挂电视 — 沙发正上方的墙上 (3,8)，摸鱼时看电视新闻/屏保
    { type: 'walltv', x: 3, y: 8 },
    // 书架 (休息区旁)
    { type: 'bookshelf', x: 6, y: 9 },

    // 📞 电话亭 — 走廊里的玻璃小隔间 (6,8)，打电话/面试专用
    { type: 'phonebooth', x: 6, y: 8 },

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
    // 📊 KPI 看板 — 挂在走廊上方的绩效考核板，打工人看了就心累
    // 放在顶部墙壁 x=9 — 正对走廊上方，走进办公室第一眼就能看到
    { type: 'kpiboard', x: 9, y: 0 },

    // ========================================
    // 🌀 空调出风口 — 走廊天花板上的中央空调，打工人夏天的命都是它给的
    // 放在走廊顶部 (9,1)，正对走廊上方，真实办公室走廊都有空调
    { type: 'airconditioner', x: 9, y: 1 },

    // 🌿 窗台绿植 — 放在窗户旁边的绿植，打工人最爱的风景线
    // 左房间窗户 (7,1) 旁边放一盆
    { type: 'windowplant', x: 6, y: 1 },

    // ========================================
    // 入口区域 (y=11 — 倒数第二行，确保不被底墙覆盖)
    // 🚪 WELCOME 地垫 — 电梯出来的走廊中央，迎宾专用
    { type: 'welcomemat', x: 9, y: 10 },
    // 🚪 WELCOME 地垫 — 电梯门口正前方，踩一踩再进办公室
    { type: 'welcomemat', x: 9, y: 11 },

    // 🏢 前台 (左侧)
    { type: 'receptiondesk', x: 2, y: 11 }, { type: 'receptiondesk', x: 3, y: 11 },
    // 🛗 电梯 (中央偏左)
    { type: 'elevator', x: 7, y: 11 }, { type: 'elevator', x: 8, y: 11 },
    // 🪧 导向标识 (电梯旁)
    { type: 'signpost', x: 10, y: 11 },
    // 🌿 入口绿植
    { type: 'plant', x: 5, y: 11 }, { type: 'plant', x: 16, y: 11 },

    // 🏓 乒乓球桌 — 休息区经典配置，打工人下午摸鱼圣地
    // 放在休息区沙发旁边 (1,7)，旁边有足够空间走动
    { type: 'pingpong', x: 1, y: 6 },
    // 🎮 复古游戏机 — 打工人的终极摸鱼圣地，CRT显示器+游戏手柄+闪烁屏幕
    // 放在左房间休息区 (1,8)，紧挨着乒乓球桌和灭火器，形成完整的摸鱼角
    { type: 'gameconsole', x: 1, y: 8 },
    // 🪑 茶水间吧台椅 — 打工人接完咖啡坐会儿歇脚的地方
    // 茶水间 y=9 是设备行，y=10 前面放凳子
    { type: 'barstool', x: 13, y: 11 },
    { type: 'barstool', x: 14, y: 11 },
    { type: 'barstool', x: 15, y: 10 },

    // ========================================
    // 📋 会议室白板 — 挂在会议室墙上的议程板，开会时显示会议计时器
    // 放在会议室右侧 (17,2)，靠近会议桌但不会挡住入口
    { type: 'meetingwhiteboard', x: 17, y: 2 },

    // ========================================
    // 🏢 会议室玻璃隔断 — 用半透明玻璃围出会议室空间
    // 会议室区域: 会议桌在 x=13-15, y=1-2
    // 玻璃是 walkable 的，不会阻挡通行，但有半透明视觉效果
    // 左侧玻璃隔断 (x=12，分隔办公区和会议室)
    { type: 'meetingglass', x: 12, y: 1 },
    { type: 'meetingglass', x: 12, y: 2 },
    // 🚪 会议室玻璃门 — 入口 (12,3)，有门把手和 PUSH 标识，带开关动画
    { type: 'meetingdoor', x: 12, y: 3 },
    // 底部玻璃 (y=3，会议桌下方)
    { type: 'meetingglass', x: 13, y: 3 },
    { type: 'meetingglass', x: 14, y: 3 },
    { type: 'meetingglass', x: 15, y: 3 },

    // 🪑 会议桌 — 会议室的核心！没有桌子的会议室就像没有床的卧室
    // 2格横桌，带椅子和笔记本电脑，开会时投影仪光束打在桌上
    { type: 'meetingtable', x: 14, y: 1 },
    { type: 'meetingtable', x: 15, y: 1 },
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
