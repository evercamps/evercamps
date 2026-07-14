import type { Request, Response, NextFunction } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from '../../core.js';
import { runImport } from '../../lib/runImport.js';

// The 3rd (unused) `next` param is required: buildMiddlewareFunction.ts only
// skips its automatic post-handler next() call when the handler's declared
// arity is 3. Without it, the framework auto-advances to the `apiResponse`
// middleware after this resolves, which unconditionally calls
// response.json() again -> ERR_HTTP_HEADERS_SENT. Matches the same
// (next-declared-but-never-called) pattern core uses in deleteProduct.js.
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const batch = await runImport();
    response.status(OK);
    response.json({ data: batch });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: (e as Error).message
      }
    });
  }
};
