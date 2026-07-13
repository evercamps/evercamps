import { select } from '@evershop/postgres-query-builder';
import type { SettingRow } from '../../../types/index.js';

export default {
  Query: {
    setting: async (root: unknown, _: unknown, { pool }: { pool: any }) => {
      const setting = await select().from('setting').execute(pool);
      return setting;
    }
  },
  Setting: {
    storeName: (setting: SettingRow[]) => {
      const storeName = setting.find((s) => s.name === 'storeName');
      if (storeName) {
        return storeName.value;
      } else {
        return 'EverCamps Store';
      }
    }
  }
};
