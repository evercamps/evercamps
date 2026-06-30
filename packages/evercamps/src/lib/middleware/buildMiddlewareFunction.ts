import { sep } from 'path';
import { pathToFileURL } from 'url';
import type { Request, Response, NextFunction } from 'express';
import { debug, error } from '../log/logger.js';
import isDevelopmentMode from '../util/isDevelopmentMode.js';
import isProductionMode from '../util/isProductionMode.js';
import { hasDelegate, setDelegate } from './delegate.js';
import eNext from './eNext.js';

export function buildMiddlewareFunction(id: string, path: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  const isRoutedLevel = !['all', 'global', 'middleware'].includes(
    path.split(sep).reverse()[1]
  );
  // Check if the middleware is an error handler.
  // TODO: fix me
  if (id === 'errorHandler' || id === 'apiErrorHandler') {
    return async (err: Error, request: Request, response: Response, next: NextFunction) => {
      const m = isDevelopmentMode()
        ? await import(`${pathToFileURL(path)}?t=${Date.now()}`)
        : await import(pathToFileURL(path).href);
      const func = m.default;
      if ((request as any).currentRoute) {
        await func(err, request, response, next);
      } else {
        await func(err, request, response, next);
      }
    };
  } else {
    return async (request: Request, response: Response, next: NextFunction) => {
      const startTime = process.hrtime();
      const debuging: { id: string; time?: number } = { id };
      (response as any).debugMiddlewares.push(debuging);
      // If there response status is 404. We skip routed middlewares
      if (response.statusCode === 404 && isRoutedLevel) {
        next();
      } else {
        try {
          const m = isDevelopmentMode()
            ? await import(`${pathToFileURL(path)}?t=${Date.now()}`)
            : await import(pathToFileURL(path).href);
          let func = m.default;
          if (!func) {
            if (isProductionMode()) {
              throw new Error(
                `Middleware ${id} is invalid. It should provide a function as default export.`
              );
            } else {
              func = () => {
                debug(
                  `Middleware ${id} is not implemented yet. Please implement it.`
                );
              };
            }
          }
          if (func.length === 3) {
            await func(request, response, (err: Error) => {
              const endTime = process.hrtime(startTime);
              debuging.time = endTime[1] / 1000000;
              eNext(request, response, next)(err);
            });
          } else {
            const returnValue = await func(request, response);
            if (!hasDelegate(id, request as any)) {
              setDelegate(id, returnValue, request as any);
            }
            const endTime = process.hrtime(startTime);
            debuging.time = endTime[1] / 1000000;
            eNext(request, response, next)();
          }
        } catch (e: any) {
          // Log the error
          e.message = `Exception in middleware ${id}: ${e.message}`;
          error(e);
          // Call error handler middleware if it is not called yet
          next(e);
        }
      }
    };
  }
}
