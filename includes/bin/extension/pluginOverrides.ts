import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../lib/postgres/connection.js';
import { warning } from '../../lib/log/logger.js';

const OVERRIDE_PREFIX = 'plugin_enabled.';

/**
 * Reads plugin enabled/disabled overrides from the `setting` table.
 * Must tolerate the table not existing yet (fresh install, migrations
 * haven't run) or the DB being unreachable at build time - any failure
 * here just means "no overrides", never a boot/build crash.
 */
export async function getPluginEnabledOverrides(): Promise<
  Record<string, boolean>
> {
  try {
    const rows = (await select().from('setting').execute(pool)) as {
      name: string;
      value: string;
    }[];
    const overrides: Record<string, boolean> = {};
    rows.forEach((row) => {
      if (row.name.startsWith(OVERRIDE_PREFIX)) {
        const name = row.name.slice(OVERRIDE_PREFIX.length);
        overrides[name] = row.value === '1' || row.value === 'true';
      }
    });
    return overrides;
  } catch (e) {
    warning(
      `Could not load plugin enabled-state overrides, falling back to config: ${e}`
    );
    return {};
  }
}
