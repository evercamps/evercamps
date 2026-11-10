import { select } from '@evershop/postgres-query-builder';
import type { Response, NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvercampsRequest } from '../../../../types/request.js';
import mergeParticipants from '../../services/participant/mergeParticipants.js';

export default async (request: EvercampsRequest, response: Response, next: NextFunction) => {
  try {
    const { survivorUuid, duplicateUuid, fields, registrationOverrides } = request.body ?? {};

    if (!survivorUuid || !duplicateUuid) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'survivorUuid and duplicateUuid are required'
        }
      });
      return;
    }

    if (survivorUuid === duplicateUuid) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'survivorUuid and duplicateUuid must be different'
        }
      });
      return;
    }

    const [survivor, duplicate] = await Promise.all([
      select().from('participant').where('uuid', '=', survivorUuid).load(pool),
      select().from('participant').where('uuid', '=', duplicateUuid).load(pool)
    ]);

    if (!survivor || !duplicate) {
      response.status(NOT_FOUND);
      response.json({
        error: {
          status: NOT_FOUND,
          message: !survivor ? 'Survivor participant not found' : 'Duplicate participant not found'
        }
      });
      return;
    }

    const result = await mergeParticipants(
      { survivorUuid, duplicateUuid, fields, registrationOverrides },
      { routeId: request.currentRoute.id }
    );
    response.status(OK);
    response.json({
      data: result
    });
  } catch (e: any) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
