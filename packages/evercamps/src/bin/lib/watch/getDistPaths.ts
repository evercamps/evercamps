import { PathLike } from 'fs';

export function getDistPaths(): PathLike[] {
  return ['dist', 'packages/evercamps/dist', 'packages/agegate/dist'];
}
