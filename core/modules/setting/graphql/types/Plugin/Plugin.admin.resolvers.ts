import { select } from '@evershop/postgres-query-builder';
import { getEnabledExtensions } from '../../../../../bin/extension/index.js';
import { getCoreModules } from '../../../../../bin/lib/loadModules.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';

interface SettingRow {
  name: string;
  value: string;
}

interface ExtensionConfig {
  name: string;
  resolve: string;
  enabled: boolean;
  priority: number;
}

const OVERRIDE_PREFIX = 'plugin_enabled.';

export default {
  Query: {
    plugins: async (
      root: unknown,
      args: unknown,
      { pool }: { pool: any }
    ) => {
      const settingRows = (await select()
        .from('setting')
        .execute(pool)) as SettingRow[];
      const overrides: Record<string, boolean> = {};
      settingRows.forEach((row) => {
        if (row.name.startsWith(OVERRIDE_PREFIX)) {
          overrides[row.name.slice(OVERRIDE_PREFIX.length)] =
            row.value === '1' || row.value === 'true';
        }
      });

      const runningNames = new Set(getEnabledExtensions().map((e) => e.name));

      const corePlugins = getCoreModules().map((module: { name: string; resolve: string }) => ({
        name: module.name,
        source: 'core',
        resolve: module.resolve,
        priority: null,
        declaredEnabled: true,
        effectiveEnabled: true,
        runningEnabled: true,
        restartRequired: false,
        toggleable: false
      }));

      const declaredExtensions = getConfig(
        'system.extensions',
        []
      ) as ExtensionConfig[];
      const extensionPlugins = declaredExtensions.map((extension) => {
        const declaredEnabled = extension.enabled === true;
        const hasOverride = Object.prototype.hasOwnProperty.call(
          overrides,
          extension.name
        );
        const effectiveEnabled = hasOverride
          ? overrides[extension.name]
          : declaredEnabled;
        const runningEnabled = runningNames.has(extension.name);
        return {
          name: extension.name,
          source: 'plugin',
          resolve: extension.resolve,
          priority: extension.priority,
          declaredEnabled,
          effectiveEnabled,
          runningEnabled,
          restartRequired: effectiveEnabled !== runningEnabled,
          toggleable: true
        };
      });

      return [...corePlugins, ...extensionPlugins];
    }
  }
};
