import { error } from '../../../../lib/log/logger.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import type { ENext } from '../../../../types/middleware.js';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { getEmailSettings } from '../../services/emailSettings.js';
import { sendEmail } from '../../services/sendEmail.js';
import { getTransport } from '../../services/transports.js';

export default async (request: EvercampsRequest, response: EvercampsResponse, next: ENext) => {
  try {
    const { email } = request.body as { email: string };
    const settings = await getEmailSettings();
    const transport = getTransport(settings.transport);
    const result = await sendEmail({
      template: 'email_test',
      to: email,
      data: { transport: transport?.name ?? settings.transport }
    });
    response.status(OK);
    response.json({
      data: {
        status: result.status,
        error: result.error ?? null,
        logUrl: result.logUuid ? buildUrl('emailLogView', { id: result.logUuid }) : null
      }
    });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message }
    });
  }
};
