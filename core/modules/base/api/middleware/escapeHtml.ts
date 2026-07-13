import type { Request, Response, NextFunction } from 'express';
import escapePayload from '../../services/escapePayload.js';

export default (request: Request, response: Response, next: NextFunction) => {
  // return next();
  if (request.method === 'GET') {
    next();
  } else {
    // Escape the characters <, > from the payload
    escapePayload(request.body);
    next();
  }
};
