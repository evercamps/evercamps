import { addRoute } from './Router.js';

export function registerFrontStoreRoute(
  id: string,
  method: string[],
  path: string,
  name: string,
  isApi = false,
  folder = '',
  payloadSchema: object | null = null,
  access = 'private'
): void {
  addRoute({
    id: String(id),
    method,
    path,
    name,
    isAdmin: false,
    isApi,
    folder,
    payloadSchema,
    access,
  });
}
