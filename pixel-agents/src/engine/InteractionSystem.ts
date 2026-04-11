// ============================================
// Pixel Agents - Agent & Object Interactions
// ============================================

import { Agent } from './Agent';
import { TileMap, TileType } from './TileMap';
import { AgentState } from '../types';

// ==================== Agent-Chat Conversations ====================

const CHAT_PAIRS = [
  { a: 'Hey, did you see the PR?', b: 'Yeah, left some comments 👀' },
  { a: 'The build is broken again...', b: 'Not my code this time 😅' },
  { a: 'Coffee break?', b: 'Way ahead of you ☕' },
  { a: 'Can you review my PR?', b: 'Sure, give me 5 min' },
  { a: 'I found a bug in prod', b: '...again? 🫠' },
  { a: 'This design looks great!', b: 'Thanks! Took 3 iterations' },
  { a: 'Anyone want to pair program?', b: 'Let\'s go! 🤝' },
  { a: 'The tests are finally passing', b: 'Celebration time! 🎉' },
  { a: 'I need help with the API', b: 'I\'m free, what\'s up?' },
  { a: 'Deployed to staging', b: 'Fingers crossed 🤞' },
  { a: 'Who deleted the database?', b: 'It was already like that!' },
  { a: 'New ticket just dropped', b: 'Of course it did 💀' },
  { a: 'I think we need a refactor', b: 'Let\'s not break everything' },
  { a: 'The client wants changes', b: 'When don\'t they? 😤' },
  { a: 'Weekend plans?', b: 'Sleep. Just sleep 😴' },
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
  type: 'coffee' | 'couch' | 'whiteboard' | 'bookshelf' | 'printer' | 'plant' | 'desk';
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
    type: 'coffee', x: 7, y: 5, label: 'Coffee Machine', emoji: '☕',
    actionText: 'Brewing coffee...', actionDuration: 5, actionState: AgentState.Waiting,
    nearbyTile: { x: 6, y: 5 },
  }],
  couch: [{
    type: 'couch', x: 1, y: 5, label: 'Couch', emoji: '🛋️',
    actionText: 'Relaxing...', actionDuration: 8, actionState: AgentState.Idle,
    nearbyTile: { x: 2, y: 4 },
  }],
  whiteboard: [{
    type: 'whiteboard', x: 1, y: 1, label: 'Whiteboard', emoji: '📝',
    actionText: 'Brainstorming...', actionDuration: 6, actionState: AgentState.Reading,
    nearbyTile: { x: 2, y: 2 },
  }],
  bookshelf: [{
    type: 'bookshelf', x: 10, y: 1, label: 'Bookshelf', emoji: '📚',
    actionText: 'Reading docs...', actionDuration: 5, actionState: AgentState.Reading,
    nearbyTile: { x: 9, y: 2 },
  }],
  printer: [{
    type: 'printer', x: 10, y: 9, label: 'Printer', emoji: '🖨️',
    actionText: 'Printing...', actionDuration: 4, actionState: AgentState.Waiting,
    nearbyTile: { x: 9, y: 9 },
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

        if (dist < proximity && a.state !== AgentState.Walking && b.state !== AgentState.Walking) {
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
