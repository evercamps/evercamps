import type { NextFunction, Request, Response } from 'express';

// Small wrapper for this plugin's JSON API handlers: { data } on success,
// { error: { status, message } } on failure.
export function apiHandler(
  work: (request: Request) => Promise<unknown>,
  errorStatus = 400
) {
  return async (request: Request, response: Response, _next: NextFunction) => {
    try {
      const data = await work(request);
      response.status(200);
      response.json({ data: data ?? { success: true } });
    } catch (e) {
      response.status(errorStatus);
      response.json({
        error: { status: errorStatus, message: e instanceof Error ? e.message : String(e) }
      });
    }
  };
}

export function requireYear(value: unknown): number {
  const year = parseInt(String(value ?? ''), 10);
  if (!(year >= 2000 && year <= 2100)) {
    throw new Error('A valid year is required');
  }
  return year;
}
