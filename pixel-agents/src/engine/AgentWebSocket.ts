// WebSocket client for receiving real agent events

export interface AgentEvent {
  agentId: string;
  type: 'state_change' | 'file_write' | 'file_read' | 'command' | 'error' | 'waiting' | 'task_change';
  state?: 'idle' | 'walking' | 'typing' | 'reading' | 'waiting' | 'error';
  file?: string;
  command?: string;
  message?: string;
  timestamp: number;
  // Task-related fields
  taskId?: string;
  taskState?: 'todo' | 'doing' | 'done';
  assignee?: string | null;
}

export type EventHandler = (event: AgentEvent) => void;

export class AgentWebSocket {
  private ws: WebSocket | null = null;
  private handlers: EventHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private connected = false;

  constructor(url: string = 'ws://localhost:8787') {
    this.url = url;
  }

  on(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('[AgentWS] Connected');
        // Register as a viewer
        this.ws?.send(JSON.stringify({ type: 'register', agentId: 'viewer' }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init') {
            // Initial state sync - send to handlers
            for (const h of this.handlers) h({ agentId: 'system', type: 'state_change', timestamp: Date.now() });
          }
          if (msg.type === 'event' && msg.data) {
            for (const h of this.handlers) h(msg.data as AgentEvent);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('[AgentWS] Disconnected, reconnecting...');
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };
    } catch {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  send(data: any): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendEvent(event: AgentEvent): void {
    this.send({ type: 'event', data: event });
  }
}
