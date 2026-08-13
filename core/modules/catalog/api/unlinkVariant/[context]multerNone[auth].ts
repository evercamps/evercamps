import multer from 'multer';
import type { EvercampsRequest } from '../../../../types/request.js';
import type { EvercampsResponse } from '../../../../types/response.js';

const upload = multer();

export default function uploadMiddleware(
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: () => void
): void {
  upload.none()(request, response, next);
}