export interface MiddlewareEntry {
  id: string;
  after?: string[];  // ids this middleware must follow
  before?: string[]; // ids this middleware must precede
}

export interface RouteDefinition {
  routeId: string | string[] | null;           // string[] replaces the + directory convention
  region: 'api' | 'admin' | 'frontStore' | 'global';
  middleware: MiddlewareEntry[];
}