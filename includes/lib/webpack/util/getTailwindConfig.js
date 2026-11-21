import fs from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { getEnabledTheme } from '../../../../dist/lib/util/getEnabledTheme.js';
import { mergeTailwindConfig } from './mergeTailwindConfig.js';

export async function getTailwindConfig(route) {
  const defaultTailwindConfig = route.isAdmin
    ? await import(
        '../../../../dist/modules/cms/services/tailwind.admin.config.js'
      )
    : await import(
        '../../../../dist/modules/cms/services/tailwind.frontStore.config.js'
      );

  let tailwindConfig = {};
  if (!route.isAdmin) {
    // Get the current theme
    const theme = getEnabledTheme();
    if (
      theme &&
      fs.existsSync(join(theme.path, 'dist', 'tailwind.config.js'))
    ) {
      tailwindConfig = await import(
        pathToFileURL(join(theme.path, 'dist', 'tailwind.config.js'))
      );
    }
  }
  // The theme's config extends the default one instead of replacing its keys
  return mergeTailwindConfig(
    defaultTailwindConfig.default,
    tailwindConfig.default
  );
}
