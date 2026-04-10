// Pixel Agents Server - WebSocket + JSONL Log Parser
// Receives Claude Code / Codex events and broadcasts to frontend clients

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { createReadStream } from 'fs';
import { watch, promises as fs } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 8787;

// ============================================
// Agent Event Types (parsed from JSONL)
// ============================================

/**
 * Event emitted when an agent's state changes
 */
export interface AgentEvent {
  agentId: string;
  type: 'state_change' | 'file_write' | 'file_read' | 'command' | 'error' | 'waiting';
  state?: 'idle' | 'walking' | 'typing' | 'reading' | 'waiting' | 'error';
  file?: string;
  command?: string;
  message?: string;
  timestamp: number;
}

// ============================================
// JSONL Log Parser
// ============================================

export class JSONLParser extends EventEmitter {
  private logPath: string;
  private lastOffset: number = 0;
  private watcher: ReturnType<typeof watch> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(logPath: string) {
    super();
    this.logPath = logPath;
  }

  /**
   * Start watching the JSONL log file for changes
   */
  start(): void {
    // Try fs.watch first, fall back to polling
    try {
      this.watcher = watch(this.logPath, async (eventType) => {
        if (eventType === 'change') await this.readNewLines();
      });
    } catch {
      // Fall back to polling
      this.pollTimer = setInterval(() => this.readNewLines(), 1000);
    }
    // Initial read
    this.readNewLines();
  }

  stop(): void {
    this.watcher?.close();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async readNewLines(): Promise<void> {
    try {
      const stat = await fs.stat(this.logPath);
      if (stat.size <= this.lastOffset) return;

      const stream = createReadStream(this.logPath, {
        start: this.lastOffset,
        end: stat.size - 1,
        encoding: 'utf-8',
      });

      let buffer = '';
      stream.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) this.processLine(line);
        }
      });

      stream.on('end', () => {
        this.lastOffset = stat.size;
        if (buffer.trim()) this.processLine(buffer);
        this.lastOffset = stat.size;
      });
    } catch (err) {
      // File might not exist yet
    }
  }

  private processLine(line: string): void {
    try {
      const event = JSON.parse(line);
      const agentEvent = this.parseClaudeCodeEvent(event);
      if (agentEvent) {
        this.emit('event', agentEvent);
      }
    } catch {
      // Skip malformed lines
    }
  }

  /**
   * Parse Claude Code JSONL event into AgentEvent
   * Claude Code emits JSONL lines with various event types
   */
  private parseClaudeCodeEvent(event: any): AgentEvent | null {
    const timestamp = Date.now();

    // Subagent_spawn - agent created
    if (event.type === 'subagent_spawn') {
      return {
        agentId: event.subagent_id || event.id || 'agent-1',
        type: 'state_change',
        state: 'idle',
        message: `Agent spawned: ${event.name || 'unknown'}`,
        timestamp,
      };
    }

    // Subagent_summary - agent completed
    if (event.type === 'subagent_summary') {
      return {
        agentId: event.subagent_id || event.id || 'agent-1',
        type: 'state_change',
        state: 'idle',
        message: event.summary || 'Task completed',
        timestamp,
      };
    }

    // Tool use - agent is doing something
    if (event.type === 'tool_use' || event.tool_use) {
      const tool = event.tool_use || event;
      const toolName = tool.name || tool.tool || 'unknown';

      if (toolName === 'Write' || toolName === 'write') {
        return {
          agentId: event.agent_id || event.subagent_id || 'agent-1',
          type: 'file_write',
          state: 'typing',
          file: tool.path || tool.file_path || 'unknown',
          timestamp,
        };
      }

      if (toolName === 'Read' || toolName === 'read' || toolName === 'Grep' || toolName === 'grep') {
        return {
          agentId: event.agent_id || event.subagent_id || 'agent-1',
          type: 'file_read',
          state: 'reading',
          file: tool.path || tool.file_path || 'unknown',
          timestamp,
        };
      }

      if (toolName === 'Bash' || toolName === 'bash' || toolName === 'Exec') {
        return {
          agentId: event.agent_id || event.subagent_id || 'agent-1',
          type: 'command',
          state: 'typing',
          command: tool.command || tool.cmd || tool.input || '',
          timestamp,
        };
      }
    }

    // Error events
    if (event.type === 'error' || event.error) {
      return {
        agentId: event.agent_id || event.subagent_id || 'agent-1',
        type: 'error',
        state: 'error',
        message: event.error?.message || event.message || 'Unknown error',
        timestamp,
      };
    }

    // Waiting for human approval
    if (event.type === 'user_response' || event.type === 'permission') {
      return {
        agentId: event.agent_id || event.subagent_id || 'agent-1',
        type: 'waiting',
        state: 'waiting',
        message: event.message || 'Waiting for approval...',
        timestamp,
      };
    }

    return null;
  }
}

// ============================================
// WebSocket Server
// ============================================

interface Client {
  ws: WebSocket;
  agentId?: string;
}

export class AgentServer {
  private wss: WebSocketServer;
  private clients: Set<Client> = new Set();
  private parser: JSONLParser | null = null;
  private eventHistory: AgentEvent[] = [];
  private agentStates: Map<string, AgentEvent> = new Map();

  constructor(port: number = 8787) {
    this.wss = new WebSocketServer({ port });
  }

  /**
   * Start watching a Claude Code JSONL log file
   */
  watchLogFile(logPath: string): void {
    this.parser = new JSONLParser(logPath);
    this.parser.on('event', (event: AgentEvent) => this.broadcast(event));
    this.parser.start();
    console.log(`Watching: ${logPath}`);
  }

  /**
   * Manually push an event (for API integration)
   */
  pushEvent(event: AgentEvent): void {
    this.broadcast(event);
  }

  private broadcast(event: AgentEvent): void {
    // Update agent state
    this.agentStates.set(event.agentId, event);

    // Store in history (last 100 events)
    this.eventHistory.push(event);
    if (this.eventHistory.length > 100) this.eventHistory.shift();

    // Broadcast to all clients
    const message = JSON.stringify({ type: 'event', data: event });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  start(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client: Client = { ws };
      this.clients.add(client);
      console.log(`Client connected (${this.clients.size} total)`);

      // Send current state of all agents
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          agents: Array.from(this.agentStates.values()),
          history: this.eventHistory,
        },
      }));

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'register') {
            client.agentId = msg.agentId;
          }
          if (msg.type === 'event') {
            // Frontend can also push events
            this.pushEvent(msg.data);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        console.log(`Client disconnected (${this.clients.size} total)`);
      });
    });

    console.log(`WebSocket server running on port ${this.wss.address().port}`);
  }

  stop(): void {
    this.parser?.stop();
    this.wss.close();
  }
}

// ============================================
// CLI Entry Point
// ============================================

const logFile = process.argv[2];
const server = new AgentServer(Number(PORT));

if (logFile) {
  server.watchLogFile(logFile);
} else {
  console.log('No log file specified. Server will accept manual events via WebSocket.');
  console.log('Usage: node src/index.js [path-to-jsonl-log]');
}

server.start();

// Graceful shutdown
process.on('SIGINT', () => { server.stop(); process.exit(0); });
process.on('SIGTERM', () => { server.stop(); process.exit(0); });
