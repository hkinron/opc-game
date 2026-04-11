export enum TileType {
  Floor = 0, Wall = 1, Desk = 2, Plant = 3,
  Couch = 4, Whiteboard = 5, Bookshelf = 6, Printer = 7, Coffee = 8, Kanban = 9,
  Window = 10, Clock = 11, Poster = 12, Carpet = 13, Lamp = 14,
  WaterCooler = 15, Fridge = 16, TrashCan = 17, Door = 18,
  MeetingTable = 19, Microwave = 20, SnackBar = 21,
  Elevator = 22, ReceptionDesk = 23,
  Restroom = 24, Signpost = 25,
  PackageLocker = 26,
}

export enum AgentState {
  Idle = 'idle', Walking = 'walking', Typing = 'typing',
  Reading = 'reading', Waiting = 'waiting', Error = 'error',
  FetchingTask = 'fetching_task',
  摸鱼中 = '摸鱼中',
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
