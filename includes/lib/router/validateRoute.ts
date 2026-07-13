import { getRoutes } from './Router.js';

export const validateRoute = (
  id: string,
  method: string | string[],
  path: string
): { id: string; method: string | string[]; path: string } => {
  const routes = getRoutes();
  if (routes.find((r) => r.id === id) !== undefined) {
    throw new Error(`Route with ID ${String(id)} already exists`);
  }
  return {
    id: String(id),
    method,
    path,
  };
};
