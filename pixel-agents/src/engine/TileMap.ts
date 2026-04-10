import { TileType, TileConfig } from '../types';

export const TILE_CONFIG: Record<TileType, TileConfig> = {
  [TileType.Floor]:      { name: 'Floor',      color: '#4a4a6a', walkable: true },
  [TileType.Wall]:       { name: 'Wall',       color: '#2a2a3e', borderColor: '#3a3a5e', walkable: false },
  [TileType.Desk]:       { name: 'Desk',       color: '#8b6914', borderColor: '#a07820', walkable: false },
  [TileType.Plant]:      { name: 'Plant',      color: '#2d5a27', walkable: false },
  [TileType.Couch]:      { name: 'Couch',      color: '#8b3a3a', walkable: false },
  [TileType.Whiteboard]: { name: 'Whiteboard', color: '#e8e8f0', walkable: false },
  [TileType.Bookshelf]:  { name: 'Bookshelf',  color: '#5c3a1e', walkable: false },
  [TileType.Printer]:    { name: 'Printer',    color: '#666677', walkable: false },
  [TileType.Coffee]:     { name: 'Coffee',     color: '#a0724a', walkable: false },
  [TileType.Kanban]:     { name: 'Kanban',     color: '#3a3a5e', borderColor: '#5a5a8e', walkable: false },
};

export const KANBAN_BOARD = { x: 4, y: 1, width: 4 };

const FURNITURE_MAP: Record<string, TileType> = {
  plant: TileType.Plant, couch: TileType.Couch, whiteboard: TileType.Whiteboard,
  bookshelf: TileType.Bookshelf, printer: TileType.Printer, coffee: TileType.Coffee,
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
