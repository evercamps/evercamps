import bodyParser from 'body-parser';
import type { Request, Response, NextFunction } from 'express';

export default (request: Request, response: Response, next: NextFunction) => {
  bodyParser.urlencoded({ extended: true })(request, response, next);
};
