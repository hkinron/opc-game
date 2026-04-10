import { TileMap } from './TileMap';
import { PathNode } from '../types';

export function findPath(map: TileMap, sx: number, sy: number, ex: number, ey: number): PathNode[] | null {
  if (!map.isWalkable(ex, ey)) return null;
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; path: PathNode[] }> = [];
  queue.push({ x: sx, y: sy, path: [{ x: sx, y: sy }] });
  visited.add(`${sx},${sy}`);
  const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  while (queue.length > 0) {
    const { x, y, path } = queue.shift()!;
    if (x === ex && y === ey) return path;
    for (const { dx, dy } of dirs) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!visited.has(key) && map.isWalkable(nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return null;
}
