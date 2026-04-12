// ============================================
// Pixel Agents - Agent & Object Interactions
// ============================================

import { Agent } from './Agent';
import { TileMap, TileType } from './TileMap';
import { AgentState } from '../types';

// ==================== Agent-Chat Conversations ====================

const CHAT_PAIRS = [
  { a: '你看了那个 PR 没？', b: '看了，留了几条评论 👀' },
  { a: '构建又挂了...', b: '这次不是我写的代码 😅' },
  { a: '喝咖啡不？', b: '早就在喝了 ☕' },
  { a: '能帮我 review 一下 PR 吗？', b: '行，给我 5 分钟' },
  { a: '线上出了个 bug', b: '……又来？🫠' },
  { a: '这个设计挺不错的！', b: '谢谢！改了 3 版才定下来' },
  { a: '有人想结对编程吗？', b: '来来来！🤝' },
  { a: '测试终于全过了', b: '庆祝一下！🎉' },
  { a: '这个 API 我不太会用', b: '我有空，怎么了？' },
  { a: '已经部署到 staging 了', b: '祈祷别出问题 🤞' },
  { a: '谁把数据库删了？', b: '我拿到就是这样的！' },
  { a: '新需求来了', b: '不出所料 💀' },
  { a: '我觉得得重构一下', b: '别把东西搞坏了就行' },
  { a: '客户又改需求了', b: '习以为常了 😤' },
  { a: '周末干嘛？', b: '睡觉。就想睡觉 😴' },
  { a: '今天的 commit 好多', b: '疯狂星期四 🤪' },
  { a: '这个 bug 我找不到原因', b: '我帮你看看？' },
  { a: '谁动了我的配置？', b: '不是我，真的不是' },
  // 🧑‍💻 打工人共鸣事件
  { a: '需求又改了，这是第几版了？', b: '记不清了，反正不是最后一版 🤣' },
  { a: '这个 bug 我上周就提了！', b: '产品说下个版本再说... 💀' },
  { a: '下班前能搞定吗？', b: '你猜？我猜不能 😮‍💨' },
  { a: '外卖到了！谁去拿？', b: '上次就是我拿的！这次你去！' },
  { a: '帮我带杯咖啡呗~', b: '你自己没长腿吗... 好吧 🙄' },
  { a: '网络又断了！！！', b: 'IT 说在修了（第三次了）' },
  { a: '空调太冷了吧...', b: '我都穿外套了你信吗 🥶' },
  { a: '今天几号来着？', b: '发薪日！等等，是下周五 😭' },
  { a: '还有几天放假？', b: '别说了，越说越绝望' },
  { a: '我在写一个超酷的功能！', b: '产品经理：砍掉' },
  { a: '这个技术方案绝了！', b: '上线前记得回滚 😂' },
  { a: '你桌面好干净啊', b: '因为我把东西都塞抽屉了 🤫' },
  { a: '你养的那盆花还好吗？', b: '快死了，跟我一样缺水（咖啡）' },
  { a: '晚上加班吗？', b: '加啊，不然明天怎么交差 😮‍💨' },
  { a: '你看了昨晚的比赛没？', b: '看了！在工位偷偷看的 🤫' },
  { a: '中午吃啥？', b: '别问我，我都吃了一个月外卖了' },
  { a: '我想辞职去开咖啡店', b: '醒醒，你连咖啡机都不会修' },
  { a: '今天的晨会好长...', b: '我觉得可以直接取消，真的' },
  { a: '我的代码一次就跑通了！', b: '不可能！你是不是没编译？' },
];

export interface Conversation {
  agentA: string;
  agentB: string;
  textA: string;
  textB: string;
  timer: number;
  phase: 'a_talking' | 'pause' | 'b_talking' | 'done';
  phaseTimer: number;
}

// ==================== Office Object Interactions ====================

export interface InteractableObject {
  type: 'coffee' | 'couch' | 'whiteboard' | 'bookshelf' | 'printer' | 'plant' | 'desk' | 'microwave' | 'snackbar' | 'meetingtable' | 'restroom' | 'signpost' | 'packagelocker' | 'watercooler' | 'umbrella' | 'attendancemachine' | 'bulletinboard' | 'vendingmachine' | 'phonebooth' | 'serverrack' | 'airconditioner' | 'fireextinguisher' | 'floorarrow' | 'walltv' | 'kpiboard';
  x: number;
  y: number;
  label: string;
  emoji: string;
  actionText: string;
  actionDuration: number;
  actionState: AgentState;
  nearbyTile: { x: number; y: number }; // where agent stands to interact
}

const OBJECT_INTERACTIONS: Record<string, InteractableObject[]> = {
  coffee: [{
    type: 'coffee', x: 7, y: 5, label: '咖啡机', emoji: '☕',
    actionText: '煮咖啡...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 6, y: 5 },
  }],
  couch: [{
    type: 'couch', x: 3, y: 9, label: '沙发', emoji: '🛋️',
    actionText: '躺平摸鱼中...', actionDuration: 8, actionState: AgentState.Idle,
    nearbyTile: { x: 3, y: 8 },
  }],
  whiteboard: [{
    type: 'whiteboard', x: 1, y: 1, label: '白板', emoji: '📝',
    actionText: '头脑风暴中...', actionDuration: 6, actionState: AgentState.Reading,
    nearbyTile: { x: 2, y: 2 },
  }],
  bookshelf: [{
    type: 'bookshelf', x: 16, y: 1, label: '书架', emoji: '📚',
    actionText: '查文档中...', actionDuration: 5, actionState: AgentState.Reading,
    nearbyTile: { x: 15, y: 2 },
  }],
  printer: [{
    type: 'printer', x: 7, y: 5, label: '打印机', emoji: '🖨️',
    actionText: '打印文件...', actionDuration: 4, actionState: AgentState.Waiting,
    nearbyTile: { x: 6, y: 5 },
  }],
  meetingtable: [{
    type: 'meetingtable', x: 10, y: 1, label: '会议室', emoji: '🏢',
    actionText: '开会中...', actionDuration: 8, actionState: AgentState.Waiting,
    nearbyTile: { x: 8, y: 2 },
  }],
  microwave: [{
    type: 'microwave', x: 15, y: 9, label: '微波炉', emoji: '🔥',
    actionText: '加热午餐...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 14, y: 8 },
  }],
  snackbar: [{
    type: 'snackbar', x: 16, y: 9, label: '零食柜', emoji: '🍪',
    actionText: '摸鱼吃零食...', actionDuration: 4, actionState: AgentState.Idle,
    nearbyTile: { x: 15, y: 8 },
  }],
  restroom: [{
    type: 'restroom', x: 17, y: 10, label: '卫生间', emoji: '🚻',
    actionText: '带薪上厕所...', actionDuration: 6, actionState: AgentState.Idle,
    nearbyTile: { x: 16, y: 10 },
  }],
  signpost: [{
    type: 'signpost', x: 10, y: 11, label: '导向标识', emoji: '🪧',
    actionText: '看路牌中...', actionDuration: 3, actionState: AgentState.Reading,
    nearbyTile: { x: 9, y: 10 },
  }],
  packagelocker: [{
    type: 'packagelocker', x: 13, y: 10, label: '快递柜', emoji: '📦',
    actionText: '取快递中...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 12, y: 10 },
  }],
  watercooler: [{
    type: 'watercooler', x: 12, y: 9, label: '饮水机', emoji: '💧',
    actionText: '接水喝...', actionDuration: 4, actionState: AgentState.Waiting,
    nearbyTile: { x: 11, y: 9 },
  }],
  umbrella: [{
    type: 'umbrella', x: 4, y: 10, label: '雨伞架', emoji: '☂️',
    actionText: '放/拿雨伞...', actionDuration: 3, actionState: AgentState.Waiting,
    nearbyTile: { x: 4, y: 9 },
  }],
  attendancemachine: [{
    type: 'attendancemachine', x: 12, y: 10, label: '打卡机', emoji: '📱',
    actionText: '滴！打卡成功！', actionDuration: 3, actionState: AgentState.Typing,
    nearbyTile: { x: 11, y: 10 },
  }],
  bulletinboard: [{
    type: 'bulletinboard', x: 3, y: 4, label: '公告栏', emoji: '📌',
    actionText: '看看有什么通知...', actionDuration: 5, actionState: AgentState.Reading,
    nearbyTile: { x: 3, y: 5 },
  }],
  vendingmachine: [{
    type: 'vendingmachine', x: 13, y: 9, label: '自动售货机', emoji: '🥤',
    actionText: '选个饮料...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 12, y: 9 },
  }],
  phonebooth: [{
    type: 'phonebooth', x: 6, y: 8, label: '电话亭', emoji: '📞',
    actionText: '接电话中...', actionDuration: 8, actionState: AgentState.Waiting,
    nearbyTile: { x: 5, y: 9 },
  }],
  serverrack: [{
    type: 'serverrack', x: 3, y: 6, label: '服务器机房', emoji: '🖥️',
    actionText: '紧急修复服务器...', actionDuration: 8, actionState: AgentState.Typing,
    nearbyTile: { x: 3, y: 8 },
  }],
  airconditioner: [{
    type: 'airconditioner', x: 3, y: 1, label: '中央空调', emoji: '🌀',
    actionText: '好冷/好热...', actionDuration: 3, actionState: AgentState.Waiting,
    nearbyTile: { x: 3, y: 2 },
  }],
  fireextinguisher: [{
    type: 'fireextinguisher', x: 1, y: 8, label: '灭火器', emoji: '🧯',
    actionText: '安全检查中...', actionDuration: 3, actionState: AgentState.Reading,
    nearbyTile: { x: 2, y: 8 },
  }],
  floorarrow: [{
    type: 'floorarrow', x: 8, y: 7, label: '导向箭头', emoji: '➡️',
    actionText: '看路标中...', actionDuration: 2, actionState: AgentState.Idle,
    nearbyTile: { x: 8, y: 7 },
  }],
  walltv: [{
    type: 'walltv', x: 3, y: 8, label: '壁挂电视', emoji: '📺',
    actionText: '摸鱼看电视...', actionDuration: 8, actionState: AgentState.Idle,
    nearbyTile: { x: 3, y: 8 },
  }],
  kpiboard: [{
    type: 'kpiboard', x: 10, y: 8, label: 'KPI看板', emoji: '📊',
    actionText: '看看这个月KPI达标没...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 9, y: 8 },
  }],
};

export class InteractionSystem {
  private conversations: Conversation[] = [];
  private conversationCooldown: Map<string, number> = new Map();
  private clickInteractions: Map<string, { agent: string; object: InteractableObject; timer: number }> = new Map();

  /**
   * Check for nearby agents and start conversations
   */
  checkAgentProximity(agents: Agent[], proximity: number = 2.5): void {
    const now = Date.now();
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i], b = agents[j];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

        if (dist < proximity && a.state !== AgentState.Walking && b.state !== AgentState.Walking && a.state !== AgentState.趴桌睡觉 && b.state !== AgentState.趴桌睡觉) {
          // Check if they're already chatting
          const pairKey = [a.id, b.id].sort().join('-');
          const cooldown = this.conversationCooldown.get(pairKey) || 0;

          if (now > cooldown && !this.conversations.find(c => c.agentA === pairKey)) {
            this.startConversation(a, b);
          }
        }
      }
    }
  }

  /**
   * Start a conversation between two agents
   */
  private startConversation(a: Agent, b: Agent): void {
    const pair = CHAT_PAIRS[Math.floor(Math.random() * CHAT_PAIRS.length)];
    const pairKey = [a.id, b.id].sort().join('-');

    this.conversations.push({
      agentA: pairKey,
      agentB: pairKey,
      textA: pair.a,
      textB: pair.b,
      timer: 0,
      phase: 'a_talking',
      phaseTimer: 0,
    });

    // Show agent A's text
    a.speechBubble = `${b.config.name}: ${pair.a}`;
    a.speechTimer = 4;

    // Agent B responds after a pause
    setTimeout(() => {
      if (b.state !== AgentState.Walking) {
        b.speechBubble = `${a.config.name}: ${pair.b}`;
        b.speechTimer = 4;

        // Both face each other
        if (a.x < b.x) { a.facing = 'right'; b.facing = 'left'; }
        else { a.facing = 'left'; b.facing = 'right'; }

        // Set cooldown (30 seconds before they chat again)
        this.conversationCooldown.set(pairKey, Date.now() + 30000);
      }
    }, 2000);

    // Remove conversation after it's done
    setTimeout(() => {
      this.conversations = this.conversations.filter(c => c.agentA !== pairKey);
    }, 5000);
  }

  /**
   * Handle click on an office object — dispatch nearest idle agent
   */
  handleObjectClick(tileX: number, tileY: number, agents: Agent[], tileMap: TileMap): boolean {
    // Find which object was clicked
    const obj = Object.values(OBJECT_INTERACTIONS).flat().find(o =>
      (Math.abs(o.x - tileX) <= 1 && Math.abs(o.y - tileY) <= 1) ||
      (o.nearbyTile.x === tileX && o.nearbyTile.y === tileY)
    );

    if (!obj) return false;

    // Find nearest available agent
    const available = agents.filter(a => a.state === AgentState.Idle && !a.currentTask);
    if (available.length === 0) return false;

    const nearest = available.sort((a, b) => {
      const da = Math.abs(a.x - obj.nearbyTile.x) + Math.abs(a.y - obj.nearbyTile.y);
      const db = Math.abs(b.x - obj.nearbyTile.x) + Math.abs(b.y - obj.nearbyTile.y);
      return da - db;
    })[0];

    // Send agent to interact with object
    if (tileMap.isWalkable(obj.nearbyTile.x, obj.nearbyTile.y)) {
      nearest.walkTo(obj.nearbyTile.x, obj.nearbyTile.y, tileMap);
      nearest.speechBubble = `${obj.emoji} ${obj.actionText}`;
      nearest.speechTimer = 3;

      // After arriving, stay and interact
      setTimeout(() => {
        if (nearest.state === AgentState.Idle || nearest.state === AgentState.Waiting) {
          nearest.setState(obj.actionState);
          nearest.speechBubble = `${obj.emoji} ${obj.actionText}`;
          nearest.speechTimer = obj.actionDuration;

          // After interaction, maybe wander or go back
          setTimeout(() => {
            if (nearest.state === obj.actionState) {
              nearest.setState(AgentState.Idle);
              // 50% chance to go back to desk
              if (Math.random() < 0.5) {
                nearest.walkTo(nearest.config.deskX, nearest.config.deskY + 1, tileMap);
              }
            }
          }, obj.actionDuration * 1000);
        }
      }, 3000);

      return true;
    }

    return false;
  }

  /**
   * Get interactable objects (for highlighting on hover)
   */
  getInteractableAt(tileX: number, tileY: number): InteractableObject | null {
    return Object.values(OBJECT_INTERACTIONS).flat().find(o =>
      (Math.abs(o.x - tileX) <= 1 && Math.abs(o.y - tileY) <= 1) ||
      (o.nearbyTile.x === tileX && o.nearbyTile.y === tileY)
    ) || null;
  }

  /**
   * Get all interactable objects for the renderer
   */
  getAllObjects(): InteractableObject[] {
    return Object.values(OBJECT_INTERACTIONS).flat();
  }
}
