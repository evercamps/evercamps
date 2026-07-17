import {
  commit,
  insertOnUpdate,
  rollback
} from '@evershop/postgres-query-builder';
import type { Request, Response, NextFunction } from 'express';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { INVALID_PAYLOAD, INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { getCoreModules } from '../../../../bin/lib/loadModules.js';
import { refreshSetting } from '../../services/setting.js';

interface ExtensionConfig {
  name: string;
  enabled: boolean;
}

export default async (request: Request, response: Response, next: NextFunction) => {
  const { name, enabled } = request.body ?? {};

  if (typeof name !== 'string' || typeof enabled !== 'boolean') {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: '"name" (string) and "enabled" (boolean) are required.'
      }
    });
    return;
  }

  const coreModules = getCoreModules() as { name: string }[];
  if (coreModules.some((module) => module.name === name)) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: `"${name}" is a core module and cannot be toggled.`
      }
    });
    return;
  }

  const declaredExtensions = getConfig(
    'system.extensions',
    []
  ) as ExtensionConfig[];
  if (!declaredExtensions.some((extension) => extension.name === name)) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: `"${name}" is not a registered plugin.`
      }
    });
    return;
  }

  const connection = await getConnection();
  try {
    await insertOnUpdate('setting', ['name'])
      .given({
        name: `plugin_enabled.${name}`,
        value: enabled ? '1' : '0',
        is_json: 0
      })
      .execute(connection, false);
    await commit(connection);
    await refreshSetting();
    response.status(OK);
    response.json({
      data: { name, enabled }
    });
  } catch (error: any) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
