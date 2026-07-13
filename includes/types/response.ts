import { Response as ExpressResponse } from 'express';

export interface EvercampsResponse extends ExpressResponse {
  debugMiddlewares: { id: string; time: number }[];
   $body: Record<string, unknown>;
}
