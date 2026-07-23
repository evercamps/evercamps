import bodyParser from 'body-parser';
import type { Response, NextFunction } from 'express';
import type { EvercampsRequest } from '../../../../types/request.js';

export default (
  request: EvercampsRequest,
  response: Response,
  next: NextFunction
) => {
  bodyParser.json({ inflate: false })(request, response, () => {
    bodyParser.urlencoded({ extended: true })(request, response, next);
  });
};