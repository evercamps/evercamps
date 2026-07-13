import {
  commit,
  insertOnUpdate,
  rollback
} from '@evershop/postgres-query-builder';
import type { Request, Response, NextFunction } from 'express';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { refreshSetting } from '../../services/setting.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  const { body } = request;
  const connection = await getConnection();
  try {
    const promises: Promise<any>[] = [];
    Object.keys(body).forEach((key) => {
      const value = body[key];
      if (typeof value === 'object') {
        promises.push(
          insertOnUpdate('setting', ['name'])
            .given({
              name: key,
              value: JSON.stringify(value),
              is_json: 1
            })
            .execute(connection, false)
        );
      } else {
        promises.push(
          insertOnUpdate('setting', ['name'])
            .given({
              name: key,
              value,
              is_json: 0
            })
            .execute(connection, false)
        );
      }
    });
    await Promise.all(promises);
    await commit(connection);
    await refreshSetting();
    response.status(OK);
    response.json({
      data: {}
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
