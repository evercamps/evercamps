# TypeScript Migration

## Overview

The project is approximately **25% converted** to TypeScript. The tooling is fully in place — `tsconfig.json` has `allowJs: true` so JS and TS files can coexist indefinitely, and SWC handles both transparently. No config changes are needed; each file can be converted and committed independently.

| | Files |
|---|---|
| **Done** (`.ts` / `.tsx`) | ~346 |
| **Remaining** (`.js` / `.jsx`) | ~1,060 |

---

## What's already done

These areas are fully converted and serve as the **reference pattern** for new conversions:

| Area | Files |
|---|---|
| `modules/auth/` | 30 |
| `modules/camp/` | 53 |
| `modules/cod/` | 9 |
| `modules/mollie/` | 18 |
| `modules/setting/` | 19 |
| `modules/tax/` | 26 |
| `lib/locale/` | 5 |

When in doubt about how to convert a file, look at the equivalent file in `modules/tax/` (API handlers, GraphQL resolvers, services) or `modules/camp/` (React components, admin pages).

---

## What remains

### Partially converted (mix of TS and JS)

| Area | JS/JSX remaining | TS/TSX done |
|---|---|---|
| `modules/catalog/` | 183 | 20 |
| `modules/cms/` | 113 | 7 |
| `modules/checkout/` | 108 | 31 |
| `modules/customer/` | 60 | 12 |
| `modules/oms/` | 45 | 7 |
| `modules/promotion/` | 45 | 2 |
| `bin/` | 30 | 31 |
| `lib/util/` | 10 | 13 |

### Not yet started

| Area | JS/JSX remaining | Notes |
|---|---|---|
| `components/admin/` | 89 | All `.jsx` |
| `components/common/` | 80 | All `.jsx` |
| `components/frontStore/` | 59 | All `.jsx` |
| `lib/middleware/` | 13 core + 62 tests | Express middleware engine |
| `lib/webpack/` | 36 | Loaders, plugins, build configs |
| `modules/base/` | 24 | — |
| `modules/promotion/` | 45 | — |
| `modules/graphql/` | 15 | — |
| `modules/stripe/` | 16 | — |
| `modules/paypal/` | 20 | — |
| `lib/componee/` | 2 core + 23 tests | Component discovery |
| `lib/middlewares/` | 5 | Express wrappers |
| `lib/event/` | 3 | Async event system |

---

## Conversion patterns

The four file types you'll encounter, with before/after.

### 1. API route handler

These live in `modules/*/api/**/` and are the most common file type. Add Express types and annotate the thrown error.

**Before** (`createProduct[finish].js`):
```javascript
import createProduct from '../../services/product/createProduct.js';

export default async (request, response) => {
  const result = await createProduct(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
```

**After** (`createProduct[finish].ts`):
```typescript
import type { Request, Response, NextFunction } from 'express';
import createProduct from '../../services/product/createProduct.js';

export default async (request: Request, response: Response, next: NextFunction) => {
  const result = await createProduct(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
```

For handlers that write their own response (not just calling a service), follow `modules/tax/api/createTaxRate/createTaxRate.ts` as the reference — it shows the full pattern with `getConnection`, `startTransaction`, try/catch, and `e: any` on the caught error.

### 2. Context middleware (`[context]*.js`)

These are trivial — just add the three Express type params.

**Before** (`[context]bodyParser[auth].js`):
```javascript
import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.json({ inflate: false })(request, response, next);
};
```

**After** (`[context]bodyParser[auth].ts`):
```typescript
import type { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';

export default (request: Request, response: Response, next: NextFunction) => {
  bodyParser.json({ inflate: false })(request, response, next);
};
```

### 3. GraphQL resolver

Export is a plain object — just rename the file.

**Before** (`TaxSetting.resolvers.js`):
```javascript
import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    priceIncludingTax: () => getConfig('pricing.tax.price_including_tax', false)
  }
};
```

**After** (`TaxSetting.resolvers.ts`):
```typescript
import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    priceIncludingTax: (): boolean => getConfig('pricing.tax.price_including_tax', false)
  }
};
```

### 4. React component (`.jsx` → `.tsx`)

Replace implicit prop types with an interface. Use `React.ChangeEvent`, `React.KeyboardEvent`, etc. for event handlers. See `modules/camp/pages/admin/participantGrid/Grid.tsx` for a full real-world example.

**Before** (`Grid.jsx`):
```jsx
export default function ProductGrid({ products }) {
  const [selectedRows, setSelectedRows] = useState([]);
  // ...
}
```

**After** (`Grid.tsx`):
```tsx
interface Product {
  productId: number;
  uuid: string;
  name: string;
  editUrl: string;
  deleteApi: string;
}

interface ProductGridProps {
  products: {
    items: Product[];
    total: number;
    currentFilters: GraphQLFilter[];
  };
}

export default function ProductGrid({ products: { items, total, currentFilters } }: ProductGridProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // ...
}
```

Import `GraphQLFilter` from `../../../../types` (already defined in the camp module — move it to a shared location if not already done).

---

## Phase 1 — Core lib infrastructure

**Goal:** Convert the files that every other module imports. Getting these typed first means downstream files get real types without stubs or `any`.

**Scope (~41 files):**
- `lib/middleware/` — 13 core files (Handler.js, index.js, buildMiddlewareFunction.js, etc.)
- `lib/router/` — 8 files (Router.js, scanForRoutes.js, validateRoute.js, etc.)
- `lib/event/` — 3 files (event-manager.js, callSubscibers.js, loadSubscribers.js)
- `lib/componee/` — 2 files (getComponentsByRoute.js, scanForComponents.js)
- `lib/middlewares/` — 5 files (Express wrappers: bodyJson.js, publicStatic.js, themePublicStatic.js, etc.)
- `lib/util/` — remaining 10 files (assign.js, merge.js, buildFilterFromUrl.js, etc.)

**Complexity:** Low–Medium. These are utility functions and Express middleware. The main work is defining the `Route`, `Middleware`, and `Extension` interfaces that the rest of the codebase depends on.

**Verify:** Run `npm run compile:tsc` — the error count should drop significantly as downstream files stop needing `// @ts-ignore` workarounds.

---

## Phase 2 — `bin/` and small isolated modules

**Goal:** Convert the CLI and startup files (which have TS peers as pattern) and the small payment modules, which are self-contained.

**Scope (~105 files):**
- `bin/` — 30 files (evercamps.js, startUp.js, app.js, build/*, dev/*, install/*, user/*)
- `modules/base/` — 24 files
- `modules/graphql/` — 15 files
- `modules/stripe/` — 16 files
- `modules/paypal/` — 20 files

**Complexity:** Low–Medium. `bin/` already has 31 TS neighbors to use as pattern. Payment modules (`stripe`, `paypal`) are isolated — they don't export types used by other modules.

**Verify:** Start the dev server (`npm run dev`) and confirm no new runtime errors.

---

## Phase 3 — Medium modules

**Goal:** Convert the medium-complexity modules that have partial TS starts.

**Scope (~150 files):**
- `modules/customer/` — 60 files (12 already TS)
- `modules/oms/` — 45 files (7 already TS)
- `modules/promotion/` — 45 files (2 already TS)

**Complexity:** Medium. Each module contains API handlers, services, GraphQL resolvers, and React components. Work through them in that order (services → API → pages) so types flow outward.

**Suggested PR order:** One PR per module (`customer`, `oms`, `promotion`) to keep diffs reviewable.

**Verify:** Run `npm run compile:tsc` after each module. Fix type errors before moving to the next.

---

## Phase 4 — Large modules

**Goal:** Convert the three largest modules. These contain the most business logic and the most React UI.

**Scope (~404 files):**
- `modules/catalog/` — 183 files (20 already TS) — products, categories, attributes, variants, collections
- `modules/cms/` — 113 files (7 already TS) — pages, widgets, file management
- `modules/checkout/` — 108 files (31 already TS) — cart, payment, shipping

**Complexity:** Medium–High. `catalog/` has the deepest service layer. `checkout/` has the most external integrations. Convert in sub-module batches (e.g., all of `catalog/api/` first, then `catalog/pages/admin/`, etc.) rather than tackling a full module in one PR.

**Suggested PR order per module:**
1. `services/` and `graphql/` (types flow from here)
2. `api/` (uses service types)
3. `pages/admin/` (React components)
4. `pages/frontStore/` (React components)

---

## Phase 5 — Webpack (parallel-safe)

**Goal:** Convert the build tooling. This is high complexity but fully isolated — webpack files don't import from modules, so it can be done in parallel with Phases 2–4.

**Scope (36 files):**
- `lib/webpack/createBaseConfig.js`
- `lib/webpack/dev/createConfigClient.js`
- `lib/webpack/prod/createConfigClient.js`, `createConfigServer.js`
- `lib/webpack/loaders/` — 7 files (AreaLoader, TailwindLoader, LayoutLoader, etc.)
- `lib/webpack/plugins/` — 3 files (Tailwindcss, GraphqlPlugin, FileListPlugin)
- `lib/webpack/util/` — 4 files
- `lib/webpack/resolveAlias.js`, utility files

**Complexity:** High. The loaders use the Webpack loader API (`this.async()`, `this.resourcePath`, `this.addDependency`) and PostCSS async pipeline. Install `@types/webpack` before starting. `loadTranslationFromCsv.ts` (already converted) is a good reference for the loader pattern.

**Note:** Tests in `lib/webpack/tests/` can be converted alongside the files they test.

---

## Phase 6 — React components

**Goal:** Convert all shared and page-level React components from `.jsx` to `.tsx`.

**Scope (~228 files):**
- `components/admin/` — 89 files (catalog grid/edit, OMS, promotion, CMS, customer)
- `components/common/` — 80 files (form fields, grid, modals, pagination, context)
- `components/frontStore/` — 59 files (catalog, checkout, customer, widgets)

**Complexity:** Medium. The pattern is highly repetitive once you've converted a few. Most files just need:
1. An interface for props
2. `useState<T>` type parameters
3. Typed event handlers (`React.ChangeEvent<HTMLInputElement>`, etc.)

Convert `components/common/` first — those are imported by both admin and frontStore components, so you'll avoid cascading `any` imports. Then work through `components/admin/` and `components/frontStore/` in parallel.

**Note:** `components/common/form/validator.js` and `components/common/react/getComponents.js` use dynamic `require()` — these will need `import()` conversion as part of the TypeScript migration.

---

## Tooling notes

No configuration changes are needed. Everything is already set up:

- **`tsconfig.json`** — `allowJs: true`, `checkJs: false`. JS files are ignored by the type checker; only TS files are checked. Flip `checkJs: true` as a stretch goal once all files are converted.
- **`noImplicitAny: true`** — Every TS file must have explicit types. Do not use `any` to silence errors; type the value properly or use `unknown` with a type guard.
- **`strictNullChecks: true`** — Be explicit about `null` and `undefined`. Use optional chaining (`?.`) and nullish coalescing (`??`) rather than loose falsy checks.
- **SWC (`.swcrc`)** — Already configured for TypeScript and TSX. No changes needed.
- **File rename** — Just rename `.js` → `.ts` (or `.jsx` → `.tsx`) and fix type errors. SWC and Webpack pick up the new extension automatically.
