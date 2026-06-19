```typescript
// src/lib/middleware/types.ts
export interface MiddlewareEntry {
  id: string;
  after?: string[];  // ids this middleware must follow
  before?: string[]; // ids this middleware must precede
}

export interface RouteDefinition {
  routeId: string | string[];           // string[] replaces the + directory convention
  region: 'api' | 'admin' | 'frontStore' | 'global';
  middleware: MiddlewareEntry[];
}
```

```typescript
// src/modules/checkout/routes.ts
import type { RouteDefinition } from '../../lib/middleware/types.js';

export const routes: RouteDefinition[] = [
  // Simple API route
  {
    routeId: 'addCartAddress',
    region: 'api',
    middleware: [
      { id: 'context' },
      { id: 'bodyParser',  after: ['context'] },
      { id: 'auth',        after: ['bodyParser'] },
      { id: 'saveAddress', after: ['auth'] },
    ],
  },

  // API route with a deeper per-route chain
  {
    routeId: 'addMineCartItem',
    region: 'api',
    middleware: [
      { id: 'context' },
      { id: 'bodyParser',         after: ['context'] },
      { id: 'auth',               after: ['bodyParser'] },
      { id: 'getCurrentCustomer', after: ['auth'] },
      { id: 'detectCurrentCart',  after: ['getCurrentCustomer'] },
      { id: 'addItemToCart',      after: ['detectCurrentCart'] },
    ],
  },

  // Shared admin page middleware — string[] routeId replaces the + directory
  {
    routeId: ['attributeEdit', 'attributeNew'],
    region: 'admin',
    middleware: [
      { id: 'filters', after: ['index'] },
    ],
  },
];
```
