import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import type { EvercampsResponse } from '../../../../types/response.js';
import { AttributeGroupError } from './attributeGroupService.js';

/** 400 for requests the attribute group rules refuse, 500 for anything else. */
export function sendAttributeGroupError(response: EvercampsResponse, e: unknown): void {
  const status = e instanceof AttributeGroupError ? INVALID_PAYLOAD : INTERNAL_SERVER_ERROR;
  response.status(status);
  response.json({
    error: {
      status,
      message: e instanceof Error ? e.message : String(e)
    }
  });
}
