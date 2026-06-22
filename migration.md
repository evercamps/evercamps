# Plugin System Migration

## Overview

Evercamps already ships an **extension system** (`bin/extension/index.ts`) that loads external packages using the same bootstrap, middleware, and routing pipeline as core modules. This document describes how to evolve that into a full WordPress-like plugin system — discoverable, activatable from the admin UI, and open to third-party distribution.

The migration is broken into seven phases, each independently shippable. Phases 1–4 are the foundation. Phases 5–7 are progressive enhancements.

**Nothing in `registry.ts`, `hookable.ts`, `startUp.js`, or existing module bootstraps changes.** The hook system already works — this migration makes it discoverable and gives it an admin UI.

---

## What already exists

| Capability | Location |
|---|---|
| Filter hooks (data transform, like `apply_filters`) | `lib/util/registry.ts` — `addProcessor`, `getValue` |
| Action hooks (before/after, like `add_action`) | `lib/util/hookable.ts` — `hookBefore`, `hookAfter`, `hookable()` |
| Extension loader | `bin/extension/index.ts` — `getEnabledExtensions()` |
| npm package support | `loadExtensions()` already handles `node_modules` paths |
| Per-module DB migrations | `bin/lib/bootstrap/migrate.js` |
| Widget registry | `lib/widget/widgetManager.ts` |
| Bootstrap lifecycle | `bin/lib/bootstrap/bootstrap.ts` |
| Lock-after-startup | `lockRegistry()` + `lockHooks()` |

The current gap: plugins must be manually listed in `system.extensions` config, `enabled` lives in a file (no admin UI toggle), and there is no metadata standard for plugin authors.

---

## Plugin anatomy

A plugin is an npm package (or a local directory in `plugins/`) with the following structure:

```
evercamps-plugin-my-feature/
  package.json          ← required: declares metadata + evercamps key
  src/
    bootstrap.ts        ← registers processors, hooks, payment methods, etc.
    routes.ts           ← route manifest (middleware chains per route)
    api/                ← API endpoint handlers
    pages/
      admin/            ← admin UI pages
      frontStore/       ← storefront pages
    migration/          ← versioned DB migrations (Version-X.Y.Z.js)
```

### `package.json` metadata standard

```json
{
  "name": "evercamps-plugin-my-feature",
  "version": "1.0.0",
  "keywords": ["evercamps-plugin"],
  "evercamps": {
    "displayName": "My Feature",
    "author": "Acme Corp",
    "description": "Adds my feature to evercamps.",
    "minVersion": "2.0.0",
    "dependencies": {
      "evercamps-plugin-checkout": ">=1.0.0"
    }
  }
}
```

The `"keywords": ["evercamps-plugin"]` field is how auto-discovery finds the package. The `evercamps` key carries display metadata and dependency declarations.

### `bootstrap.ts` contract

```typescript
import type { BootstrapContext } from '@evercamps/evercamps';

export default function bootstrap(context: BootstrapContext): void {
  // Register filter processors
  addProcessor('cartFields', (fields) => [...fields, myField]);

  // Register action hooks
  hookAfter('changePaymentStatus', async (result, orderId, status) => {
    if (status === 'cancelled') await cancelCharge(orderId);
  });
}
```

All hook registration must happen inside `bootstrap.ts`. The registry and hooks are locked after bootstrap completes — no middleware can register processors at request time.

---

## Hook reference

### Filter hooks — transform data

Use `addProcessor` to intercept and modify named values. Use `getValue` (or `getValueSync`) to read them.

```typescript
import { addProcessor, getValue } from '@evercamps/evercamps/lib/util/registry.js';

// In bootstrap.ts — add a field to every cart
addProcessor('cartFields', (fields) => {
  return [...fields, { id: 'giftMessage', label: 'Gift message' }];
}, /* priority */ 10);

// At call site — retrieve the processed value
const fields = await getValue('cartFields', baseFields, { cartId });
```

**Available filter hooks** (non-exhaustive):

| Name | Type | Description |
|---|---|---|
| `cartFields` | `CartField[]` | Fields resolved per cart |
| `cartItemFields` | `CartItemField[]` | Fields resolved per cart item |
| `configurationSchema` | `Schema` | JSON Schema for admin configuration |
| `cartItemProductLoaderFunction` | `Function` | Loader used to fetch a product by id for a cart item |
| `paymentMethods` | `PaymentMethod[]` | Registered payment methods |
| `orderStatuses` | `StatusMap` | Order payment status labels |

### Action hooks — side effects before/after named functions

Use `hookBefore` / `hookAfter` to run code around named functions wrapped with `hookable()`.

```typescript
import { hookAfter, hookBefore } from '@evercamps/evercamps/lib/util/hookable.js';

// Run after an order's payment status changes
hookAfter('changePaymentStatus', async (result, orderId, newStatus) => {
  if (newStatus === 'cancelled') await notifyWarehouse(orderId);
});

// Run before placing an order — can throw to abort
hookBefore('placeOrder', async (cartId) => {
  const valid = await validateInventory(cartId);
  if (!valid) throw new Error('Inventory check failed');
});
```

**Available action hooks** (non-exhaustive):

| Name | Position | Arguments |
|---|---|---|
| `changePaymentStatus` | before/after | `orderId: string, newStatus: string` |
| `placeOrder` | before/after | `cartId: string` |
| `createCustomer` | before/after | `customerData: object` |
| `login` | before/after | `email: string` |

---

## Phase 1 — Plugin metadata standard

**Goal:** Establish the `package.json` + `evercamps` key contract described above. No code changes.

**What to do:**
- Adopt the metadata format for any new plugin you write.
- Optionally add `plugin.json` validation to `loadExtensions()` (warns on missing fields).

**Verify:** Write a minimal plugin package with the metadata and manually add it to `system.extensions`. Confirm it boots.

---

## Phase 2 — Auto-discovery (npm + local `plugins/`)

**Goal:** Eliminate manual `system.extensions` config entries. Any npm-installed package with `"keywords": ["evercamps-plugin"]` or any directory in `plugins/` is discovered automatically.

**File to modify:** `packages/evercamps/src/bin/extension/index.ts`

Add two discovery functions before the manual-config merge in `loadExtensions()`:

```typescript
// Scan node_modules for packages with the evercamps-plugin keyword
function discoverNpmPlugins(): Extension[] {
  const nodeModulesPath = resolve(CONSTANTS.ROOTPATH, 'node_modules');
  const discovered: Extension[] = [];

  if (!existsSync(nodeModulesPath)) return discovered;

  for (const entry of readdirSync(nodeModulesPath, { withFileTypes: true })) {
    const pkgPath = resolve(nodeModulesPath, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.keywords?.includes('evercamps-plugin')) continue;

    const meta = pkg.evercamps ?? {};
    discovered.push({
      name: pkg.name,
      resolve: resolve(nodeModulesPath, entry.name),
      enabled: false,      // starts disabled; DB state (Phase 3) wins
      priority: meta.priority ?? 10,
    });
  }
  return discovered;
}

// Scan the local plugins/ directory
function discoverLocalPlugins(): Extension[] {
  const pluginsPath = resolve(CONSTANTS.ROOTPATH, 'plugins');
  if (!existsSync(pluginsPath)) return [];

  return readdirSync(pluginsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const pkgPath = resolve(pluginsPath, d.name, 'package.json');
      const pkg = existsSync(pkgPath)
        ? JSON.parse(readFileSync(pkgPath, 'utf8'))
        : { name: d.name, evercamps: {} };
      const meta = pkg.evercamps ?? {};
      return {
        name: pkg.name ?? d.name,
        resolve: resolve(pluginsPath, d.name),
        enabled: false,
        priority: meta.priority ?? 10,
      };
    });
}
```

In `loadExtensions()`, merge discovered plugins with the manual list. Manual entries override auto-discovered ones (so existing `system.extensions` config keeps working unchanged):

```typescript
const manualList = getConfig('system.extensions', []) as Extension[];
const discovered = [...discoverNpmPlugins(), ...discoverLocalPlugins()];

// Manual entries win — they can override enabled/priority for auto-discovered plugins
const merged = [
  ...discovered.filter((d) => !manualList.find((m) => m.name === d.name)),
  ...manualList,
];
```

**Verify:**
1. `npm install evercamps-plugin-example` (a test package with the keyword)
2. Start the server — confirm the plugin is discovered and its bootstrap runs

---

## Phase 3 — Database-persisted plugin state

**Goal:** Replace the config-file `enabled` flag with a DB record so the admin UI can toggle plugins without touching files.

### 3a — DB migration

Add to `packages/evercamps/src/modules/base/migration/Version-1.0.2.js` (or next unused version):

```javascript
export default async function migrate(connection) {
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS plugin (
      plugin_id  serial PRIMARY KEY,
      name       varchar NOT NULL UNIQUE,
      version    varchar NOT NULL DEFAULT '0.0.0',
      enabled    boolean NOT NULL DEFAULT false,
      installed_at timestamptz NOT NULL DEFAULT now(),
      settings   jsonb NOT NULL DEFAULT '{}'
    )
  `);
}
```

### 3b — Merge DB state into extension loader

In `loadExtensions()`, after building the merged list from Phase 2, query the `plugin` table and override `enabled`:

```typescript
import { pool } from '../../lib/postgres/connection.js';

async function loadExtensionsWithDbState(): Promise<Extension[]> {
  const extensions = loadExtensions(); // existing sync logic
  const rows = await pool.query('SELECT name, enabled FROM plugin');
  const dbState = new Map(rows.rows.map((r) => [r.name, r.enabled]));

  return extensions.map((ext) => ({
    ...ext,
    enabled: dbState.has(ext.name) ? dbState.get(ext.name)! : ext.enabled,
  }));
}
```

Note: `loadExtensions` is currently synchronous and called at app startup before the DB is ready. The startup order in `startUp.js` needs to move extension loading after the DB connection is established. This is the only startup-sequence change in this phase.

### 3c — Admin API routes

New module `packages/evercamps/src/modules/plugin/` with these API endpoints:

```
GET    /admin/api/plugins           → list all discovered plugins + DB state
POST   /admin/api/plugins/:name/activate
POST   /admin/api/plugins/:name/deactivate
PUT    /admin/api/plugins/:name/settings
```

Each activate/deactivate upserts into the `plugin` table and triggers a server restart (or a graceful reload if hot-reload is implemented).

**Verify:**
1. Install a plugin, call `POST /admin/api/plugins/evercamps-plugin-example/activate`
2. Restart server — confirm plugin is now loaded
3. Call deactivate — confirm it is skipped on next start

---

## Phase 4 — Unified hook API

**Goal:** Give plugin authors a single import path instead of two separate systems.

**New file:** `packages/evercamps/src/lib/util/hooks.ts`

```typescript
// Filters — transform data
export {
  addProcessor as addFilter,
  addFinalProcessor as addFinalFilter,
  getValue as applyFilters,
  getValueSync as applyFiltersSync,
} from './registry.js';

// Actions — side effects
export {
  hookBefore as addActionBefore,
  hookAfter as addActionAfter,
  hookable,
} from './hookable.js';
```

Plugin authors import from one place:

```typescript
import { addFilter, addActionAfter } from '@evercamps/evercamps/lib/util/hooks.js';
```

No existing code changes — this is an additive re-export.

**New file:** `packages/evercamps/src/lib/util/hookTypes.ts` — TypeScript signatures for all known hooks so plugin authors get autocomplete:

```typescript
export interface FilterHooks {
  cartFields: import('../modules/checkout/services/cart/types.js').CartField[];
  cartItemFields: import('../modules/checkout/services/cart/types.js').CartItemField[];
  configurationSchema: Record<string, any>;
  // ... extend as new hooks are added
}

export interface ActionHooks {
  changePaymentStatus: [orderId: string, newStatus: string];
  placeOrder: [cartId: string];
  createCustomer: [customerData: Record<string, any>];
  // ...
}
```

---

## Phase 5 — Admin plugin management UI

**Goal:** A `pluginGrid` admin page that lists discovered plugins with activate/deactivate controls.

**New module:** `packages/evercamps/src/modules/plugin/pages/admin/pluginGrid/`

Follows the existing admin page pattern:
- `route.json` — `{ "path": "/plugins", "methods": ["GET"] }`
- `index.js` — page entry point
- `PluginGrid.jsx` — React component table with name, version, author, description, status toggle
- `Grid.jsx`, `Heading.jsx` — sub-components following the existing admin grid pattern (see `catalog/pages/admin/attributeGrid/` for reference)

The page fetches from `GET /admin/api/plugins` (Phase 3) and calls activate/deactivate on toggle.

---

## Phase 6 — Plugin scaffolding CLI (optional)

**Goal:** `npx evercamps create-plugin <name>` generates a ready-to-develop plugin skeleton.

Add a `create-plugin` command to `packages/evercamps/src/bin/evercamps.js`. The generator outputs:

```
evercamps-plugin-<name>/
  package.json            # name, keywords: ['evercamps-plugin'], evercamps key
  tsconfig.json
  src/
    bootstrap.ts          # empty default export
    routes.ts             # empty routes array
```

---

## Phase 7 — Extract optional core modules to plugins (long-term)

These core modules are self-contained optional features — good candidates to become standalone npm packages:

| Module | New package name | Depends on |
|---|---|---|
| `stripe` | `@evercamps/plugin-stripe` | checkout |
| `mollie` | `@evercamps/plugin-mollie` | checkout |
| `paypal` | `@evercamps/plugin-paypal` | checkout |
| `cod` | `@evercamps/plugin-cod` | checkout |
| `promotion` | `@evercamps/plugin-promotions` | catalog, checkout |
| `cms` | `@evercamps/plugin-cms` | base |

**Core stays:** `base`, `catalog`, `checkout`, `customer`, `auth`, `graphql`, `setting`, `tax`, `oms`, `camp`

**Extraction steps per module:**
1. Copy `src/modules/<name>/` into a new repo / package
2. Add `package.json` with the metadata standard from Phase 1
3. Add `"keywords": ["evercamps-plugin"]`
4. Update imports from `../../lib/` → `@evercamps/evercamps/lib/`
5. Publish to npm
6. In the core repo: remove the module from `getCoreModules()`, add it to `system.extensions` as the default-enabled entry (so existing installs keep working after `npm install`)

---

## Quick-start: writing your first plugin

```bash
mkdir plugins/my-feature
cd plugins/my-feature
npm init -y
```

Edit `package.json`:
```json
{
  "name": "evercamps-plugin-my-feature",
  "keywords": ["evercamps-plugin"],
  "evercamps": {
    "displayName": "My Feature",
    "author": "You"
  }
}
```

Create `src/bootstrap.ts`:
```typescript
import { addProcessor } from '@evercamps/evercamps/lib/util/registry.js';

export default function bootstrap() {
  addProcessor('cartFields', (fields) => {
    return [...fields, { id: 'myField', label: 'My custom field' }];
  });
}
```

After Phase 2 is implemented, the server will auto-discover this plugin. Activate it via the API or admin UI (Phase 3/5), restart, and your processor runs.
