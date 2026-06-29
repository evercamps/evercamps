import { addRoute } from './Router.js';

export function registerAdminRoute(
  id: string,
  method: string | string[],
  path: string,
  name: string,
  isApi = false,
  folder = ''
): void {
  addRoute({
    id: String(id),
    method,
    path: path === '/' ? '/admin' : `/admin${path}`,
    name,
    isAdmin: true,
    isApi,
    folder,
    access: 'private',
  });
}
