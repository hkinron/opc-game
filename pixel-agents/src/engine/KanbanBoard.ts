// ============================================
// Pixel Agents - Kanban Task Board
// ============================================

export interface Task {
  id: string;
  title: string;
  description: string;
  column: 'todo' | 'in_progress' | 'review' | 'done';
  assignee: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export const TASK_COLORS: Record<Task['column'], string> = {
  todo: '#4a90d9',
  in_progress: '#d9a94a',
  review: '#a94ad9',
  done: '#4ad97a',
};

export const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#ef4444',
};

export const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
};

export class KanbanBoard {
  tasks: Task[] = [];
  visible = false;
  private container: HTMLElement | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'kanban-board';
    this.container.style.cssText = `
      position: fixed;
      right: 0;
      top: 44px;
      bottom: 34px;
      width: 320px;
      background: #16213e;
      border-left: 2px solid #0f3460;
      z-index: 50;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(this.container);
    this.hide();
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  show(): void {
    this.visible = true;
    if (this.container) this.container.style.transform = 'translateX(0)';
  }

  hide(): void {
    this.visible = false;
    if (this.container) this.container.style.transform = 'translateX(100%)';
  }

  addTask(title: string, description: string, priority: Task['priority'] = 'medium'): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const task: Task = {
      id, title, description,
      column: 'todo',
      assignee: null,
      priority,
      createdAt: Date.now(),
    };
    this.tasks.push(task);
    this.render();
    return id;
  }

  moveTask(taskId: string, column: Task['column']): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.column = column;
      if (column === 'done') task.assignee = null;
      this.render();
    }
  }

  assignTask(taskId: string, agentName: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && !task.assignee) {
      task.assignee = agentName;
      task.column = 'in_progress';
      this.render();
    }
  }

  getAvailableTask(agentName?: string): Task | null {
    return this.tasks.find(t => t.column === 'todo' && !t.assignee) || null;
  }

  getAgentTask(agentName: string): Task | null {
    return this.tasks.find(t => t.assignee === agentName && t.column !== 'done') || null;
  }

  getTasksByColumn(column: Task['column']): Task[] {
    return this.tasks.filter(t => t.column === column);
  }

  getStats(): { todo: number; inProgress: number; review: number; done: number } {
    return {
      todo: this.tasks.filter(t => t.column === 'todo').length,
      inProgress: this.tasks.filter(t => t.column === 'in_progress').length,
      review: this.tasks.filter(t => t.column === 'review').length,
      done: this.tasks.filter(t => t.column === 'done').length,
    };
  }

  render(): void {
    if (!this.container) return;

    const columns: Task['column'][] = ['todo', 'in_progress', 'review', 'done'];
    const columnLabels: Record<Task['column'], string> = {
      todo: '📋 To Do',
      in_progress: '🔨 In Progress',
      review: '🔍 Review',
      done: '✅ Done',
    };

    this.container.innerHTML = `
      <div style="padding: 12px; border-bottom: 1px solid #0f3460; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="color: #e94560; margin: 0; font-size: 14px;">📋 Kanban Board</h3>
        <button id="kanban-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 8px;">
        ${columns.map(col => `
          <div style="margin-bottom: 12px;">
            <div style="color: ${TASK_COLORS[col]}; font-size: 12px; font-weight: bold; margin-bottom: 6px; padding: 0 4px;">
              ${columnLabels[col]} (${this.getTasksByColumn(col).length})
            </div>
            ${this.getTasksByColumn(col).map(task => this.renderTaskCard(task)).join('')}
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('kanban-close')?.addEventListener('click', () => this.hide());
  }

  private renderTaskCard(task: Task): string {
    return `
      <div class="task-card" data-task-id="${task.id}" style="
        background: #0f3460;
        border-left: 3px solid ${TASK_COLORS[task.column]};
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 6px;
        cursor: pointer;
        transition: background 0.2s;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <span style="color: #e0e0e0; font-size: 12px; font-weight: bold;">${task.title}</span>
          <span style="font-size: 10px;">${PRIORITY_LABELS[task.priority]}</span>
        </div>
        ${task.description ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">${task.description}</div>` : ''}
        ${task.assignee ? `<div style="color: #4a90d9; font-size: 10px; margin-top: 4px;">👤 ${task.assignee}</div>` : '<div style="color: #666; font-size: 10px; margin-top: 4px;">Unassigned</div>'}
      </div>
    `;
  }
}
