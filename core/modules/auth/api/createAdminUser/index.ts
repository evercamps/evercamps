import { insert, select } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { hashPassword } from '../../../../lib/util/passwordHelper.js';
import { EvercampsRequest } from '../../../../types/request.js';
import { EvercampsResponse } from '../../../../types/response.js';

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  const fullName = String(request.body.full_name).trim();
  const email = String(request.body.email).trim().toLowerCase();
  const { password } = request.body;

  try {
    const existing = await select()
      .from('admin_user')
      .where('email', 'ILIKE', email.replace(/%/g, '\%'))
      .load(pool);
    if (existing) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'An admin user with this email already exists'
        }
      });
      return;
    }

    const user = await insert('admin_user')
      .given({
        full_name: fullName,
        email,
        password: hashPassword(password)
      })
      .execute(pool);

    response.status(OK);
    response.$body = {
      data: {
        uuid: user.uuid,
        email: user.email,
        fullName: user.full_name
      }
    };
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : String(e)
      }
    });
  }
};
