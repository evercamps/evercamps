import { insert } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { translate } from '../../../../lib/locale/translate/translate.js';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import {
  HONEYPOT_FIELD,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MINUTES,
  hashIp
} from '../../services/contactSettings.js';

const TOO_MANY_REQUESTS = 429;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Stores a contact form message. A filled-in honeypot gets the normal success
 * response, but nothing is stored or sent, so bots don't learn they were caught.
 */
export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const body = request.body || {};
    if (clean(body[HONEYPOT_FIELD]) !== '') {
      response.status(OK);
      response.$body = { data: {} };
      next();
      return;
    }

    const name = clean(body.name);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const message = clean(body.message);
    if (!name || !email || !message) {
      response.status(400);
      response.json({
        error: {
          status: 400,
          message: translate('Please fill in your name, email and message.')
        }
      });
      return;
    }

    const ipHash = hashIp(request.ip);
    const recent = await pool.query(
      `SELECT COUNT(*)::int AS total FROM "contact_message"
       WHERE "ip_hash" = $1 AND "created_at" > NOW() - make_interval(mins => $2)`,
      [ipHash, RATE_LIMIT_WINDOW_MINUTES]
    );
    if ((recent.rows[0]?.total || 0) >= RATE_LIMIT_MAX) {
      response.status(TOO_MANY_REQUESTS);
      response.json({
        error: {
          status: TOO_MANY_REQUESTS,
          message: translate(
            'You have sent several messages in a short time. Please try again later.'
          )
        }
      });
      return;
    }

    const saved = await insert('contact_message')
      .given({
        name,
        email,
        phone: phone || null,
        message,
        ip_hash: ipHash
      })
      .execute(pool);

    response.locals.contactMessage = saved;
    response.status(OK);
    response.$body = { data: {} };
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: translate('Your message could not be sent. Please try again later.')
      }
    });
  }
};
