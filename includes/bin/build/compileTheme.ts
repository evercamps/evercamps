import { existsSync } from 'fs';
import path from 'path';
import { CONSTANTS } from '../../lib/helpers.js';
import { info } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { compileSwc } from '../lib/watch/compileSwc.js';

/**
 * Compiles the active theme's `src` into its `dist` folder before a
 * production build, so a theme repository only has to contain source.
 *
 * A theme without `src` is left alone (it may ship a prebuilt `dist`);
 * `getEnabledTheme` reports a missing theme or a missing `dist`.
 */
export async function compileTheme(): Promise<void> {
  const themeName = getConfig('system.theme') as string | undefined;
  if (!themeName) {
    return;
  }
  const themePath = path.resolve(CONSTANTS.THEMEPATH, themeName);
  const srcPath = path.resolve(themePath, 'src');
  if (!existsSync(srcPath)) {
    return;
  }
  info(`Compiling theme '${themeName}'`);
  await compileSwc(srcPath, path.resolve(themePath, 'dist'), { clean: true });
}
