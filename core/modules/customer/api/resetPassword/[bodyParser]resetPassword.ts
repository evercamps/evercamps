import crypto from 'crypto';
import { insert, select } from '@evershop/postgres-query-builder';
import type { NextFunction, Request, Response } from 'express';

import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import { EvercampsResponse } from '../../../../types/response.js';
import { EvercampsRequest } from '../../../../types/request.js';

interface Customer {
  customer_id: number;
  email: string;
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  const { email } = request.body;

  try {
    // Generate a random token using crypto module
    const token = crypto.randomBytes(64).toString('hex');

    // Hash the token
    const hash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Check if email exists
    const existingCustomer = (await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool)) as Customer | null;

    if (existingCustomer) {
      // Insert token into reset_password_token table
      await insert('reset_password_token')
        .given({
          customer_id: existingCustomer.customer_id,
          token: hash
        })
        .execute(pool);
    }

    response.status(OK);

    response.$body = {
      token,
      email
    };

    // Email sending is handled by extensions
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