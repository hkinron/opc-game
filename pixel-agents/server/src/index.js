// Pixel Agents Server - WebSocket + JSONL Log Parser + REST API
// Receives Claude Code / Codex events and broadcasts to frontend clients

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { createReadStream, readFileSync } from 'fs';
import { watch, promises as fs, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 8787;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Plugin System
// ============================================

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }

  register(plugin) {
    this.plugins.set(plugin.name, plugin);
    console.log(`Plugin registered: ${plugin.name} v${plugin.version}`);
    if (plugin.onRegister) plugin.onRegister(this);
  }

  hook(event, handler) {
    if (!this.hooks.has(event)) this.hooks.set(event, []);
    this.hooks.get(event).push(handler);
  }

  async emit(event, data) {
    const handlers = this.hooks.get(event) || [];
    let result = data;
    for (const handler of handlers) {
      result = await handler(result);
    }
    return result;
  }

  getPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description || '',
      enabled: p.enabled !== false,
    }));
  }
}

const pluginManager = new PluginManager();

// Register built-in plugins

// Theme plugin - customize colors
pluginManager.register({
  name: 'default-theme',
  version: '1.0.0',
  description: 'Default dark theme',
  colors: {
    background: '#1a1a2e',
    wall: '#2a2a3e',
    floor: '#4a4a6a',
    desk: '#8b6914',
    accent: '#e94560',
  },
});

// Layout plugin - customize office layout
pluginManager.register({
  name: 'default-layout',
  version: '1.0.0',
  description: 'Default 6-desk office layout',
  layout: {
    width: 13,
    height: 11,
    desks: [
      { x: 3, y: 3 }, { x: 6, y: 3 }, { x: 9, y: 3 },
      { x: 3, y: 7 }, { x: 6, y: 7 }, { x: 9, y: 7 },
    ],
    furniture: [
      { type: 'plant', x: 4, y: 5 }, { type: 'coffee', x: 7, y: 5 },
      { type: 'plant', x: 10, y: 5 }, { type: 'couch', x: 1, y: 5 },
      { type: 'couch', x: 2, y: 5 }, { type: 'whiteboard', x: 1, y: 1 },
      { type: 'whiteboard', x: 2, y: 1 }, { type: 'bookshelf', x: 10, y: 1 },
      { type: 'bookshelf', x: 11, y: 1 }, { type: 'printer', x: 10, y: 9 },
    ],
  },
});

// ============================================
// REST API + HTTP Server
// ============================================

const httpServer = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Route handling
  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    // GET /api/health
    if (path === '/api/health' && method === 'GET') {
      json({ status: 'ok', uptime: process.uptime(), clients: agentServer.clientCount });
    }

    // GET /api/agents - list all known agents
    else if (path === '/api/agents' && method === 'GET') {
      json({ agents: Array.from(agentServer.agentStates.entries()).map(([id, state]) => ({
        id, ...state,
      }))});
    }

    // POST /api/agents/:id/state - update agent state
    else if (path.startsWith('/api/agents/') && path.endsWith('/state') && method === 'POST') {
      const agentId = path.split('/')[3];
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          agentServer.pushEvent({
            agentId, type: 'state_change', state: data.state,
            message: data.message, timestamp: Date.now(),
          });
          json({ ok: true, agentId, state: data.state });
        } catch (e) {
          json({ error: 'Invalid JSON' }, 400);
        }
      });
    }

    // GET /api/tasks - list all tasks
    else if (path === '/api/tasks' && method === 'GET') {
      json({ tasks: agentServer.taskHistory });
    }

    // POST /api/tasks - add a task
    else if (path === '/api/tasks' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const task = JSON.parse(body);
          agentServer.pushEvent({
            agentId: 'system', type: 'task_change',
            state: 'idle', message: `New task: ${task.title || 'unnamed'}`,
            task, timestamp: Date.now(),
          });
          json({ ok: true, task });
        } catch (e) {
          json({ error: 'Invalid JSON' }, 400);
        }
      });
    }

    // GET /api/events - get recent event history
    else if (path === '/api/events' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      json({ events: agentServer.eventHistory.slice(-limit) });
    }

    // POST /api/events - push a custom event
    else if (path === '/api/events' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const event = JSON.parse(body);
          agentServer.pushEvent(event);
          json({ ok: true, event });
        } catch (e) {
          json({ error: 'Invalid JSON' }, 400);
        }
      });
    }

    // GET /api/plugins - list plugins
    else if (path === '/api/plugins' && method === 'GET') {
      json({ plugins: pluginManager.getPlugins() });
    }

    // POST /api/events - push event via plugin
    else if (path === '/api/plugins' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const plugin = JSON.parse(body);
          pluginManager.register(plugin);
          json({ ok: true, plugin: plugin.name });
        } catch (e) {
          json({ error: 'Invalid JSON' }, 400);
        }
      });
    }

    // GET / - API info
    else if (path === '/' && method === 'GET') {
      json({
        name: 'Pixel Agents Server',
        version: '0.2.0',
        endpoints: {
          'GET /api/health': 'Server status',
          'GET /api/agents': 'List all agents',
          'POST /api/agents/:id/state': 'Update agent state',
          'GET /api/tasks': 'List all tasks',
          'POST /api/tasks': 'Add a new task',
          'GET /api/events': 'Get event history',
          'POST /api/events': 'Push a custom event',
          'GET /api/plugins': 'List plugins',
          'POST /api/plugins': 'Register a plugin',
        },
        websocket: `ws://localhost:${PORT}`,
      });
    }

    // 404
    else {
      json({ error: 'Not found', path }, 404);
    }
  } catch (e) {
    json({ error: e.message }, 500);
  }
});

// ============================================
// Agent Event Types
// ============================================

export class JSONLParser extends EventEmitter {
  // ... (same as before)
  constructor(logPath) {
    super();
    this.logPath = logPath;
    this.lastOffset = 0;
    this.watcher = null;
    this.pollTimer = null;
  }

  start() {
    try {
      this.watcher = watch(this.logPath, async (eventType) => {
        if (eventType === 'change') await this.readNewLines();
      });
    } catch {
      this.pollTimer = setInterval(() => this.readNewLines(), 1000);
    }
    this.readNewLines();
  }

  stop() {
    this.watcher?.close();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  async readNewLines() {
    try {
      const stat = await fs.stat(this.logPath);
      if (stat.size <= this.lastOffset) return;
      const stream = createReadStream(this.logPath, {
        start: this.lastOffset, end: stat.size - 1, encoding: 'utf-8',
      });
      let buffer = '';
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) { if (line.trim()) this.processLine(line); }
      });
      stream.on('end', () => { this.lastOffset = stat.size; if (buffer.trim()) this.processLine(buffer); this.lastOffset = stat.size; });
    } catch { /* File might not exist */ }
  }

  processLine(line) {
    try {
      const event = JSON.parse(line);
      const agentEvent = this.parseClaudeCodeEvent(event);
      if (agentEvent) this.emit('event', agentEvent);
    } catch { /* Skip malformed */ }
  }

  parseClaudeCodeEvent(event) {
    const timestamp = Date.now();
    if (event.type === 'subagent_spawn') {
      return { agentId: event.subagent_id || event.id || 'agent-1', type: 'state_change', state: 'idle', message: `Agent spawned: ${event.name || 'unknown'}`, timestamp };
    }
    if (event.type === 'subagent_summary') {
      return { agentId: event.subagent_id || event.id || 'agent-1', type: 'state_change', state: 'idle', message: event.summary || 'Task completed', timestamp };
    }
    if (event.type === 'tool_use' || event.tool_use) {
      const tool = event.tool_use || event;
      const toolName = tool.name || tool.tool || 'unknown';
      if (toolName === 'Write' || toolName === 'write') {
        return { agentId: event.agent_id || event.subagent_id || 'agent-1', type: 'file_write', state: 'typing', file: tool.path || tool.file_path || 'unknown', timestamp };
      }
      if (toolName === 'Read' || toolName === 'read' || toolName === 'Grep') {
        return { agentId: event.agent_id || event.subagent_id || 'agent-1', type: 'file_read', state: 'reading', file: tool.path || tool.file_path || 'unknown', timestamp };
      }
      if (toolName === 'Bash' || toolName === 'bash' || toolName === 'Exec') {
        return { agentId: event.agent_id || event.subagent_id || 'agent-1', type: 'command', state: 'typing', command: tool.command || tool.cmd || tool.input || '', timestamp };
      }
    }
    if (event.type === 'error' || event.error) {
      return { agentId: event.agent_id || event.subagent_id || 'agent-1', type: 'error', state: 'error', message: event.error?.message || event.message || 'Unknown error', timestamp };
    }
    if (event.type === 'user_response' || event.type === 'permission') {
      return { agentId: event.agent_id || event.subagent_id || 'agent-1', type: 'waiting', state: 'waiting', message: event.message || 'Waiting for approval...', timestamp };
    }
    return null;
  }
}

// ============================================
// WebSocket + Agent Server
// ============================================

export class AgentServer {
  constructor(httpServerInstance, port = 8787) {
    this.wss = new WebSocketServer({ server: httpServerInstance });
    this.clients = new Set();
    this.parser = null;
    this.eventHistory = [];
    this.agentStates = new Map();
    this.taskHistory = [];
  }

  get clientCount() { return this.clients.size; }

  watchLogFile(logPath) {
    this.parser = new JSONLParser(logPath);
    this.parser.on('event', (event) => this.broadcast(event));
    this.parser.start();
    console.log(`Watching: ${logPath}`);
  }

  pushEvent(event) {
    this.broadcast(event);
  }

  async broadcast(event) {
    // Run through plugin hooks
    const processed = await pluginManager.emit('agent_event', event);
    
    this.agentStates.set(processed.agentId, processed);
    this.eventHistory.push(processed);
    if (this.eventHistory.length > 100) this.eventHistory.shift();

    if (processed.type === 'task_change' && processed.task) {
      this.taskHistory.push(processed.task);
    }

    const message = JSON.stringify({ type: 'event', data: processed });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  }

  start() {
    this.wss.on('connection', (ws) => {
      const client = { ws };
      this.clients.add(client);
      console.log(`Client connected (${this.clients.size} total)`);

      ws.send(JSON.stringify({
        type: 'init',
        data: { agents: Array.from(this.agentStates.values()), history: this.eventHistory },
      }));

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'register') client.agentId = msg.agentId;
          if (msg.type === 'event') this.pushEvent(msg.data);
        } catch { /* Ignore */ }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        console.log(`Client disconnected (${this.clients.size} total)`);
      });
    });

    console.log(`WebSocket server running`);
  }

  stop() {
    this.parser?.stop();
    this.wss.close();
  }
}

// ============================================
// Start Server
// ============================================

const logFile = process.argv[2];
const agentServer = new AgentServer(httpServer, Number(PORT));

if (logFile) {
  agentServer.watchLogFile(logFile);
} else {
  console.log('No log file specified. Use REST API or WebSocket to push events.');
}

agentServer.start();

httpServer.listen(PORT, () => {
  console.log(`Pixel Agents Server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => { agentServer.stop(); httpServer.close(); process.exit(0); });
process.on('SIGTERM', () => { agentServer.stop(); httpServer.close(); process.exit(0); });
