import { sortRoutes } from './sortRoutes.js';

export interface Route {
  id: string;
  method: string[];
  path: string;
  name: string;
  isAdmin: boolean;
  isApi: boolean;
  folder: string;
  payloadSchema?: object | null;
  access: string;
}

class Router {
  private routes: Route[] = [];

  getFrontStoreRoutes(): Route[] {
    return this.routes.filter((r) => r.isAdmin === false);
  }

  getAdminRoutes(): Route[] {
    return this.routes.filter((r) => r.isAdmin === true);
  }

  getRoutes(): Route[] {
    return sortRoutes(this.routes);
  }

  addRoute(route: Route): void {
    const r = this.routes.find((rt) => rt.id === route.id);
    if (r !== undefined) {
      Object.assign(r, route);
    } else {
      this.routes.push(route);
    }
  }

  hasRoute(id: string): boolean {
    return this.routes.some((r) => r.id === id);
  }

  deleteRoute(id: string): void {
    this.routes = this.routes.filter((r) => r.id !== id);
  }

  empty(): void {
    this.routes = [];
  }
}

const router = new Router();
export const addRoute = (route: Route): void => router.addRoute(route);
export const getFrontStoreRoutes = (): Route[] => router.getFrontStoreRoutes();
export const getAdminRoutes = (): Route[] => router.getAdminRoutes();
export const getRoutes = (): Route[] => router.getRoutes();
export const hasRoute = (id: string): boolean => router.hasRoute(id);
export const deleteRoute = (id: string): void => router.deleteRoute(id);
export const getRoute = (id: string): Route | undefined => router.getRoutes().find((r) => r.id === id);
export const empty = (): void => router.empty();
