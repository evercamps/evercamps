# Route Naming Convention Migration Steps

## Current State

### Done
- `RouteDefinition` and `MiddlewareEntry` types in `lib/middleware/types.ts`
- `scripts/generateRouteManifests.ts` generation script
- `routes.ts` files at `src/modules/[module]/routes.ts` for 10 modules:
  base, catalog, checkout, cms, customer, graphql, oms, paypal, promotion, stripe

### Still Using Old System
- Modules without routes.ts: **auth, camp, cod, mollie, setting, tax**
- All 172 `route.json` files still present (HTTP path/method metadata)
- Bracket-named middleware files still exist throughout
- Runtime still uses `parseFromFile.js` / `scanForMiddlewareFunctions.js`

---

## Step 1 — Move routes.ts into the api folder

**Goal:** `src/modules/[module]/routes.ts` → `src/modules/[module]/api/routes.ts`

1. Update `scripts/generateRouteManifests.ts` line 243: change output path from
   `resolve(modulePath, 'routes.ts')` to `resolve(modulePath, 'api', 'routes.ts')`
2. Move the 10 existing routes.ts files into their `api/` subfolder
3. In each moved file update the import: `'../../lib/middleware/types.js'` → `'../../../lib/middleware/types.js'`

Co-locating the manifest with the route files it describes keeps the module root clean.

---

## Step 2 — Extend RouteDefinition to include HTTP metadata

**Goal:** Absorb `route.json` content into `routes.ts` so `route.json` can be deleted.

Extend `lib/middleware/types.ts`:

```typescript
export interface RouteDefinition {
  routeId: string | string[] | null;
  region: 'api' | 'admin' | 'frontStore' | 'global';
  // HTTP metadata — for api routes, replaces route.json
  path?: string;          // e.g. '/addCartAddress'  (/api prefix added by runtime)
  methods?: string[];     // e.g. ['POST']
  access?: 'public' | 'private';  // default: 'private'
  middleware: MiddlewareEntry[];
}
```

Also update `generateRouteManifests.ts` to read each `route.json` and include `path`, `methods`, and `access` in the generated output.

---

## Step 3 — Generate routes.ts for remaining modules

Modules that still need routes.ts: **auth, camp, cod, mollie, setting, tax**

```
tsx scripts/generateRouteManifests.ts --write
```

After generating, open each new file and manually add `path` and `methods` values from the
corresponding `route.json` files (until the generator is updated in Step 2 to do this automatically).

---

## Step 4 — Update the runtime to read from routes.ts

This is the core change. The current flow in `loadModuleRoutes.js`:
1. `scanForRoutes` reads `route.json` → registers route metadata
2. `scanForMiddlewareFunctions` reads bracket-named files → `parseFromFile` extracts ordering

Both need to be replaced by a manifest-driven loader.

### New loader (add to loadModuleRoutes.js)

```js
async function loadFromManifest(modulePath, routeDefs) {
  for (const routeDef of routeDefs) {
    // 1. Register route metadata (replaces scanForRoutes + route.json)
    if (routeDef.region === 'api' && routeDef.path && routeDef.routeId) {
      registerFrontStoreRoute(
        String(routeDef.routeId),
        routeDef.methods,
        '/api' + routeDef.path,
        String(routeDef.routeId),
        true,
        resolve(modulePath, 'api', String(routeDef.routeId)),
        null,
        routeDef.access ?? 'private'
      );
    }

    // 2. Register middleware with explicit ordering (replaces parseFromFile)
    const folder = routeFolder(modulePath, routeDef);
    for (const mw of routeDef.middleware) {
      const filePath = findMiddlewareFile(folder, mw.id); // finds mw.id.ts or mw.id.js
      addMiddleware({
        id: mw.id,
        middleware: buildMiddlewareFunction(mw.id, filePath),
        after: mw.after,
        before: mw.before,
        routeId: routeDef.routeId,
        region: routeDef.region,
        scope: routeDef.routeId ?? 'app',
      });
    }
  }
}
```

In `loadModuleRoutes.js`, add a check at the top of the api section:

```js
const manifestPath = resolve(modulePath, 'api', 'routes.ts');
if (existsSync(manifestPath)) {
  const { routes } = await import(pathToFileURL(manifestPath));
  await loadFromManifest(modulePath, routes);
} else {
  // existing scanForRoutes + scanForMiddlewareFunctions code (fallback during migration)
}
```

The fallback keeps unconverted modules working while the migration is in progress.

---

## Step 5 — Rename bracket-named files to plain names

Once a module's `routes.ts` is in place and the runtime uses the manifest, rename the files.
The ordering information is now in routes.ts — the filename just needs to match the `id`:

| Old name | New name |
|---|---|
| `[context]bodyParser[auth].ts` | `bodyParser.ts` |
| `[getCurrentUser]auth.ts` | `auth.ts` |
| `[getCurrentUser]demoAccountBlocking[auth].ts` | `demoAccountBlocking.ts` |
| `addCustomer[finish].ts` | `addCustomer.ts` |
| `finish[apiResponse].ts` | `finish.ts` |
| `[context]bodyParser[auth].ts` | `bodyParser.ts` |
| `[bodyParser]capture.ts` | `capture.ts` |
| `[context]borderParser[auth].ts` | `borderParser.ts` |
| `[placeOrder]addOrderPlacedEvent.ts` | `addOrderPlacedEvent.ts` |

Files already using plain names (`index.ts`, `bodyJson.ts`, etc.) need no rename.

Do this module by module and verify after each one.

---

## Step 6 — Delete route.json files

Once `routes.ts` includes `path`/`methods` and the runtime uses the manifest, delete `route.json`.
Do this module by module after confirming the routes work.

---

## Step 7 — Remove old scanning infrastructure

Once all modules are migrated and the fallback in `loadModuleRoutes.js` is unused:

- Delete `lib/middleware/parseFromFile.js`
- Delete `lib/middleware/scanForMiddlewareFunctions.js`
- Delete `lib/middleware/getRouteFromPath.js` (only called by parseFromFile)
- Remove the fallback branch in `loadModuleRoutes.js`
- Delete `lib/router/scanForRoutes.js` once all route.json files are gone

---

## Plugin / Extension Compatibility

### Current behavior
Extensions drop bracket-named files into a module's `api/<route>/` folder. `scanForMiddlewareFunctions`
auto-discovers them and `parseFromFile` extracts ordering from the filename — no central manifest needed.

### Risk with the new system
`routes.ts` is a static manifest. An extension can no longer inject middleware by dropping a file;
it would need to modify the host module's routes.ts, which a package-level extension cannot do.

### Solution A — Extensions bring their own routes.ts (covers most cases)
An extension that adds a **new** route (e.g. `mollieWebhook`) defines a complete `routes.ts` in
its own module directory. `loadModuleRoutes.js` already runs per module, so this works as-is.
No change needed for this case.

### Solution B — Programmatic injection API (for extending existing routes)
If an extension needs to inject middleware into an *existing* route (e.g. add a capture step to
`createOrder`), a small injection API is needed:

```ts
// extension's bootstrap.ts
import { extendRoute } from 'evercamps/lib/router';

extendRoute('createOrder', {
  id: 'mollieCapture',
  after: ['placeOrder'],
  before: ['apiResponse'],
  file: new URL('./api/createOrder/mollieCapture.js', import.meta.url),
});
```

`extendRoute` would call `buildMiddlewareFunction` and `addMiddleware` directly, bypassing the
manifest scan. This needs to be added to `Handler.js` / `loadModuleRoutes.js`.

### Current status
All existing modules in the repo are self-contained — no extension injects into another module's
routes. **Solution A covers all current cases.** Solution B is only needed if third-party extensions
must hook into core routes.

---

## Migration Checklist

### Generator & types
- [ ] Update generator output path to `api/routes.ts` (Step 1)
- [ ] Move 10 existing routes.ts to their `api/` subfolder and fix import paths (Step 1)
- [ ] Extend `RouteDefinition` type with `path`, `methods`, `access` (Step 2)
- [ ] Update generator to read and emit `route.json` metadata (Step 2)

### Missing modules
- [ ] Generate routes.ts for auth (Step 3)
- [ ] Generate routes.ts for camp (Step 3)
- [ ] Generate routes.ts for cod (Step 3)
- [ ] Generate routes.ts for mollie (Step 3)
- [ ] Generate routes.ts for setting (Step 3)
- [ ] Generate routes.ts for tax (Step 3)

### Runtime
- [ ] Write `loadFromManifest` function (Step 4)
- [ ] Update `loadModuleRoutes.js` to use manifest with old-system fallback (Step 4)

### Per-module migration (repeat for each module)
- [ ] Verify routes.ts is complete and correct
- [ ] Rename bracket-named files to plain names (Step 5)
- [ ] Delete route.json files (Step 6)
- [ ] Run tests

### Cleanup (after all modules done)
- [ ] Remove fallback branch in `loadModuleRoutes.js`
- [ ] Delete `parseFromFile.js`
- [ ] Delete `scanForMiddlewareFunctions.js`
- [ ] Delete `getRouteFromPath.js`
- [ ] Delete `scanForRoutes.js`
- [ ] Delete `scripts/generateRouteManifests.ts`
- [ ] Delete `manifest-shape.md`
