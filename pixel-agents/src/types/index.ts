export enum TileType {
  Floor = 0, Wall = 1, Desk = 2, Plant = 3,
  Couch = 4, Whiteboard = 5, Bookshelf = 6, Printer = 7, Coffee = 8, Kanban = 9,
  Window = 10, Clock = 11, Poster = 12, Carpet = 13, Lamp = 14,
  WaterCooler = 15, Fridge = 16, TrashCan = 17, Door = 18,
  MeetingTable = 19, Microwave = 20, SnackBar = 21,
  Elevator = 22, ReceptionDesk = 23,
  Restroom = 24, Signpost = 25,
  PackageLocker = 26,
  // 🧑‍💻 工位个人物品
  DeskCup = 27,       // 桌面水杯
  DeskPlant = 28,     // 桌面小盆栽
  DeskPhoto = 29,     // 桌面相框
  // 🏢 入口区
  UmbrellaStand = 30, // 雨伞架
  AttendanceMachine = 31, // 打卡机
  // 📌 公告板
  BulletinBoard = 32, // 软木公告栏
  VendingMachine = 33, // 自动售货机
  // 📞 电话亭
  PhoneBooth = 34, // 电话亭（透明玻璃小隔间）
  // 🖥️ 服务器机房
  ServerRack = 35, // 服务器机柜（带闪烁LED）
  ServerRoomGlass = 36, // 机房玻璃隔断（半透明）
  // 🏷️ 区域名牌
  ZoneLabel = 37, // 地面团队分区标识
  // 🏖️ 请假牌
  AbsentSign = 38, // 工位上的「请假中」牌子
  // 🍽️ 午餐区
  LunchTable = 39, // 走廊午餐桌（带椅子）
  // 🏓 娱乐区
  PingPong = 40, // 乒乓球桌（绿色桌面+球网）
  // 🎂 生日庆祝
  BirthdayCake = 41, // 生日蛋糕（放在工位上）
  // 🚪 入口地垫
  WelcomeMat = 42, // 电梯口迎宾地垫（"Welcome"字样）
  // 🏢 会议室玻璃隔断
  MeetingGlass = 43, // 会议室半透明玻璃墙（能看到里面开会）
  // 📋 会议室白板
  MeetingWhiteboard = 44, // 会议室里的白板（带议程和便利贴）
  // 🪑 茶水间吧台椅 — 高脚凳，打工人在茶水间短暂休息的地方
  BarStool = 45,
  // 🛋️ 访客等候区 — 前台旁边的接待等候空间
  VisitorSofa = 46, // 访客专用沙发（比工位沙发更正式）
  CompanyLogo = 47, // 公司Logo墙 — 前台背景上的发光logo
  // 🧾 杂志架 — 访客等候区的阅读材料
  MagazineRack = 48,
  // 🌀 天花板空调出风口 — 每个办公室都有的中央空调，带动态出风效果
  AirConditioner = 49,
  // 🧯 灭火器 — 墙上必备的消防设备，红色醒目，真实办公室安全感来源
  FireExtinguisher = 50,
  // ➡️ 地面导向箭头 — 地毯上的方向指示箭头，真实办公室标配
  FloorArrow = 51,
  // 📺 休息区壁挂电视 — 挂在沙发区墙上的电视，播放新闻/屏保
  WallTV = 52,
  // 📊 KPI看板 — 挂在墙上的绩效考核板，打工人看了就心累
  KPIBoard = 53,
  // 🌿 窗台绿植 — 窗户旁的小盆栽，打工人最爱的风景线
  WindowPlant = 54,
  // 💡 天花板 LED 灯盘 — 办公室顶部嵌入式照明，带暖色光晕，随昼夜自动开关
  CeilingLight = 55,
  // 🖨️ 打印机卡纸 — 打印机故障状态，亮红灯，吐出纸张
  PrinterJam = 56,
  // 🚪 会议室玻璃门 — 区别于普通玻璃隔断，有门把手+PUSH标识+开关动画
  MeetingDoor = 57,
  // 🎮 复古游戏机 — 休息区摸鱼圣地，CRT显示器+手柄
  GameConsole = 58,
}

export enum AgentState {
  Idle = 'idle', Walking = 'walking', Typing = 'typing',
  Reading = 'reading', Waiting = 'waiting', Error = 'error',
  FetchingTask = 'fetching_task',
  摸鱼中 = '摸鱼中',
  趴桌睡觉 = 'desk_nap',
  加班中 = 'overtime',
  伸懒腰 = 'stretching',
  打哈欠 = 'yawning',
  打游戏中 = 'gaming',
}

export enum AgentRole {
  Coder = 'Coder', Reviewer = 'Reviewer', Designer = 'Designer',
  Writer = 'Writer', Tester = 'Tester',
}

export type TaskState = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string | null;  // agent name
  state: TaskState;
  priority: 'low' | 'medium' | 'high';
}

export interface PathNode { x: number; y: number; }

export interface AgentConfig {
  name: string; role: AgentRole; deskX: number; deskY: number;
}

export interface TileConfig {
  name: string; color: string; borderColor?: string; walkable: boolean;
}
