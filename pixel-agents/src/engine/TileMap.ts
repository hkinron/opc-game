import { TileType, TileConfig } from '../types';

export const TILE_CONFIG: Record<TileType, TileConfig> = {
  [TileType.Floor]:       { name: 'Floor',       color: '#4a4a6a', walkable: true },
  [TileType.Wall]:        { name: 'Wall',        color: '#2a2a3e', borderColor: '#3a3a5e', walkable: false },
  [TileType.Desk]:        { name: 'Desk',        color: '#8b6914', borderColor: '#a07820', walkable: false },
  [TileType.Plant]:       { name: 'Plant',       color: '#2d5a27', walkable: false },
  [TileType.Couch]:       { name: 'Couch',       color: '#8b3a3a', walkable: false },
  [TileType.Whiteboard]:  { name: 'Whiteboard',  color: '#e8e8f0', walkable: false },
  [TileType.Bookshelf]:   { name: 'Bookshelf',   color: '#5c3a1e', walkable: false },
  [TileType.Printer]:     { name: 'Printer',     color: '#666677', walkable: false },
  [TileType.Coffee]:      { name: 'Coffee',      color: '#a0724a', walkable: false },
  [TileType.Kanban]:      { name: 'Kanban',      color: '#3a3a5e', borderColor: '#5a5a8e', walkable: false },
  [TileType.Window]:      { name: 'Window',      color: '#1a3a5e', borderColor: '#5a9abf', walkable: false },
  [TileType.Clock]:       { name: 'Clock',       color: '#1a1a2e', borderColor: '#e0e0e0', walkable: false },
  [TileType.Poster]:      { name: 'Poster',      color: '#c0392b', walkable: false },
  [TileType.Carpet]:      { name: 'Carpet',      color: '#3a3a5a', walkable: true },
  [TileType.Lamp]:        { name: 'Lamp',        color: '#2a2a3e', borderColor: '#fbbf24', walkable: false },
  [TileType.WaterCooler]: { name: 'WaterCooler', color: '#2980b9', borderColor: '#85c1e9', walkable: false },
  [TileType.Fridge]:      { name: 'Fridge',      color: '#7f8c8d', borderColor: '#bdc3c7', walkable: false },
  [TileType.TrashCan]:    { name: 'TrashCan',    color: '#2c3e50', walkable: false },
  [TileType.Door]:        { name: 'Door',        color: '#3a2a1e', borderColor: '#6a5040', walkable: true },
  [TileType.MeetingTable]:{ name: 'MeetingTable',color: '#6b4423', borderColor: '#8b5a2b', walkable: false },
  [TileType.Microwave]:   { name: 'Microwave',   color: '#b0b0b0', borderColor: '#e0e0e0', walkable: false },
  [TileType.SnackBar]:    { name: 'SnackBar',    color: '#8b6914', borderColor: '#c0942a', walkable: false },
  [TileType.Elevator]:    { name: 'Elevator',    color: '#5a5a6e', borderColor: '#8888aa', walkable: true },
  [TileType.ReceptionDesk]: { name: 'ReceptionDesk', color: '#6b3a2a', borderColor: '#8b5a3b', walkable: false },
  [TileType.Restroom]:      { name: 'Restroom',      color: '#4a7a8a', borderColor: '#7ab8c8', walkable: false },
  [TileType.Signpost]:      { name: 'Signpost',      color: '#c0942a', borderColor: '#f0d060', walkable: false },
  [TileType.PackageLocker]: { name: 'PackageLocker', color: '#e67e22', borderColor: '#f39c12', walkable: false },
};

export const KANBAN_BOARD = { x: 4, y: 1, width: 4 };

const FURNITURE_MAP: Record<string, TileType> = {
  plant: TileType.Plant, couch: TileType.Couch, whiteboard: TileType.Whiteboard,
  bookshelf: TileType.Bookshelf, printer: TileType.Printer, coffee: TileType.Coffee,
  window: TileType.Window, clock: TileType.Clock, poster: TileType.Poster,
  carpet: TileType.Carpet, lamp: TileType.Lamp, watercooler: TileType.WaterCooler,
  fridge: TileType.Fridge, trash: TileType.TrashCan, door: TileType.Door,
  meetingtable: TileType.MeetingTable, microwave: TileType.Microwave, snackbar: TileType.SnackBar,
  elevator: TileType.Elevator, receptiondesk: TileType.ReceptionDesk,
  restroom: TileType.Restroom, signpost: TileType.Signpost,
  packagelocker: TileType.PackageLocker,
};

export class TileMap {
  tiles: TileType[][];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number, furniture?: { type: string; x: number; y: number }[]) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.generateLayout(furniture);
  }

  generateLayout(furniture?: { type: string; x: number; y: number }[]): void {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < this.width; x++) {
        if (y === 0 || y === this.height - 1 || x === 0 || x === this.width - 1) {
          row.push(TileType.Wall);
        } else {
          row.push(TileType.Floor);
        }
      }
      this.tiles.push(row);
    }

    if (furniture) {
      for (const item of furniture) {
        const tileType = FURNITURE_MAP[item.type];
        if (tileType !== undefined) this.setIf(item.x, item.y, tileType);
      }
    } else {
      this.setIf(4, 5, TileType.Plant); this.setIf(7, 5, TileType.Coffee);
      this.setIf(10, 5, TileType.Plant); this.setIf(1, 5, TileType.Couch);
      this.setIf(2, 5, TileType.Couch); this.setIf(1, 1, TileType.Whiteboard);
      this.setIf(2, 1, TileType.Whiteboard); this.setIf(10, 1, TileType.Bookshelf);
      this.setIf(11, 1, TileType.Bookshelf); this.setIf(10, 9, TileType.Printer);
      // 会议室区域 (右上角)
      this.setIf(9, 1, TileType.MeetingTable); this.setIf(10, 1, TileType.MeetingTable);
      this.setIf(11, 1, TileType.MeetingTable); this.setIf(9, 2, TileType.MeetingTable);
      this.setIf(10, 2, TileType.MeetingTable); this.setIf(11, 2, TileType.MeetingTable);
      // 茶水间区域 (右下角)
      this.setIf(10, 8, TileType.Microwave); this.setIf(11, 8, TileType.SnackBar);
      this.setIf(10, 9, TileType.Fridge); this.setIf(11, 9, TileType.TrashCan);
      this.setIf(10, 10, TileType.Coffee);
      this.setIf(9, 5, TileType.Plant); this.setIf(9, 7, TileType.Carpet);
    }
  }

  setIf(x: number, y: number, type: TileType): void {
    if (this.inBounds(x, y)) this.tiles[y][x] = type;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return TILE_CONFIG[this.tiles[y][x]].walkable;
  }
}
