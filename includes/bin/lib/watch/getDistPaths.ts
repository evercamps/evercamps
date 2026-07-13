import { PathLike } from 'fs';

export function getDistPaths(): PathLike[] {
  return ['dist', 'packages/agegate/dist'];
}
