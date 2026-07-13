import { PathLike, readdirSync, rmSync, statSync } from 'fs';
import path from 'path';
import { Application } from 'express';
import { error } from '../../../lib/log/logger.js';
import { compileSwc } from './compileSwc.js';
import { applyEffects, detectEffect, Effect } from './effect.js';
import { getSrcPaths } from './getSrcPaths.js';
import { isDist } from './isDist.js';
import { isSrc } from './isSrc.js';
import { restartProcess } from './processors/restart.js';

function getDistPathForSrcFile(srcFilePath: string): string {
  const srcRoot = getSrcPaths()
    .map((p) => p.toString())
    .find((root) => srcFilePath.startsWith(root + path.sep));
  const distRoot = path.resolve(srcRoot as string, '..', 'dist');
  return path
    .join(distRoot, path.relative(srcRoot as string, srcFilePath))
    .replace(/\.tsx?$/, '.js')
    .replace(/\.jsx$/, '.js');
}

export type Event = {
  path: PathLike;
  type: 'create' | 'update' | 'delete';
  jsPath?: PathLike;
  effect?: Effect;
};

export async function watchHandler(events: Event[], app: Application) {
  if (
    events.length === 2 &&
    events.some((e) => e.type === 'delete') &&
    events.some((e) => e.type === 'create')
  ) {
    // Likely a rename
    // Sort the event make sure the delete comes first
    events.sort((a, b) => (a.type === 'delete' ? -1 : 1));
    // Travel the create event and if this is a folder, we need to add create event for every sub-file
    for (const event of events) {
      if (event.type === 'create') {
        // Check if the path is a directory
        try {
          const stats = statSync(event.path);
          if (stats.isDirectory()) {
            // If it's a directory, we need to add create events for every file in the directory
            const files = readdirSync(event.path);
            for (const file of files) {
              const filePath = path.resolve(event.path as string, file);
              events.push({
                path: filePath,
                type: 'create'
              });
            }
          }
        } catch (e) {
          error(`Error reading directory ${event.path}:`);
          error(e);
        }
      }
    }
  }

  // Handle the watch event
  for (const event of events) {
    event.effect = detectEffect(event);
    if (event.effect === 'restart') {
      restartProcess();
      break; // Exit the loop if a restart is required, no need to process further
    }
    if (isDist(event.path)) {
      continue;
    }
    if (isSrc(event.path)) {
      const distPath = getDistPathForSrcFile(event.path.toString());

      event.jsPath = distPath; // Set the compiled JS path
      if (event.type === 'delete') {
        // Delete whatever is necessary in the dist folder
        rmSync(distPath as string, { recursive: true, force: true });
      } else {
        // Run swc to compile the changed file into its dist counterpart
        await compileSwc(event.path, distPath);
      }
    }
  }
  applyEffects(events, app);
}
