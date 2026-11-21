import { error, info } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { refreshSetting } from '../../setting/services/setting.js';
import { getRetentionDays } from '../services/contactSettings.js';

/** Daily: delete contact messages older than the retention period */
export default async function purgeContactMessages(): Promise<void> {
  try {
    await refreshSetting();
    const days = await getRetentionDays();
    const deleted = await pool.query(
      `DELETE FROM "contact_message" WHERE "created_at" < NOW() - make_interval(days => $1)`,
      [days]
    );
    if ((deleted.rowCount || 0) > 0) {
      info(`Contact message purge: ${deleted.rowCount} messages deleted`);
    }
  } catch (e) {
    error(e);
  }
}
