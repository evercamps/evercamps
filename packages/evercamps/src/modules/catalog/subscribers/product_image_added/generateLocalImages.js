import { error, debug } from '../../../../lib/log/logger.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import createLocalImages from '../../services/product/createLocalImages.js';

export default async function generateLocalImages(data) {
  debug(`into generateLocalImages`);
  if (getConfig('system.file_storage') === 'local') {
    debug(`into local file storage: get config ${JSON.stringify(getConfig('system.file_storage'))}`);
    try {
      await createLocalImages(data);
    } catch (e) {
      error(e);
    }
  }
}
