import crypto from 'crypto';
import { select, del } from '@evershop/postgres-query-builder';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { NextFunction } from 'express';

import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import updatePassword from '../../services/customer/updatePassword.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

interface ResetPasswordBody {
  token: string;
  password: string;
}

interface ResetPasswordToken {
  customer_id: number;
  reset_password_token_id: number;
}

interface ResetPasswordRequest extends EvercampsRequest {
  body: ResetPasswordBody;
}

export default async (
  request: ResetPasswordRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  const { body } = request;

  try {
    const { token, password } = body;

    const hash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const resetTokenLifetime = getConfig(
      'resetPasswordTokenLifetime',
      48 * 60 * 60 * 1000
    );

    dayjs.extend(utc);
    dayjs.extend(timezone);

    const timezoneConfig = getConfig(
      'shop.timezone',
      'UTC'
    );

    const now = dayjs
      .tz(
        new Date(Date.now() - resetTokenLifetime),
        timezoneConfig
      )
      .format('YYYY-MM-DD HH:mm:ss');

    const existingToken = (await select()
      .from('reset_password_token')
      .where('token', '=', hash)
      .and('created_at', '>=', now)
      .load(pool)) as ResetPasswordToken | null;

    if (!existingToken) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Token is invalid or expired'
        }
      });
      return;
    }

    await updatePassword(
      existingToken.customer_id,
      password,
      {
        routeId: request.currentRoute.id
      }
    );

    await del('reset_password_token')
      .where(
        'reset_password_token_id',
        '=',
        existingToken.reset_password_token_id
      )
      .execute(pool);

    response.status(OK);
    response.$body = {};

    next();
  } catch (e) {
    error(e);

    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message:
          e instanceof Error ? e.message : String(e)
      }
    });
  }
};