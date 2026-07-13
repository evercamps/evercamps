export interface MiddlewareEntry {
  id: string;
  after?: string[];  // ids this middleware must follow
  before?: string[]; // ids this middleware must precede
}

export interface RouteDefinition {
  routeId: string | string[] | null;
  region: 'api' | 'admin' | 'frontStore' | 'global';
  // HTTP metadata — for api routes, replaces route.json
  path?: string;          // e.g. '/addCartAddress'  (/api prefix added by runtime)
  methods?: string[];     // e.g. ['POST']
  access?: 'public' | 'private';  // default: 'private'
  middleware: MiddlewareEntry[];
}