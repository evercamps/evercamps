# Plugin management from the admin UI

## Context

EverCamps (a fork of EverShop — Node/TS/Express/PostgreSQL/GraphQL, not actually WordPress despite the terminology) already has a working plugin-loading architecture: bootstrap lifecycle, per-module migrations, route scanning, GraphQL schema stitching, and webpack aliasing all key off one array, `system.extensions`, in `config/default.json`. Today the only way to add or toggle a plugin is to hand-edit that JSON file and restart. That's fine for a developer but not something you'd hand to a site admin.

The goal: let an admin activate/deactivate plugins from a UI instead of editing config, and set up a path toward two bigger goals later — installing a new plugin from the admin UI (upload/git), and eventually installing a plugin as a published npm package. This plan covers Phase 1 (activate/deactivate — fully detailed, buildable now) and sketches Phases 2–3 as a roadmap.

Key decisions already made (with you):
- **State storage**: plugin enabled/disabled state is stored as a DB override in the existing generic `setting` key/value table (same pattern `woocommerce-import` already uses for its own settings), not by having the web process rewrite `config/default.json`. `config/default.json` stays the place a plugin is *registered*; the DB only overrides its `enabled` flag.
- **Reload behavior**: no live-reload in Phase 1. Toggling writes the DB override immediately; the admin UI clearly shows when a plugin's effective state differs from what's actually running in this process ("restart required"). No changes to bootstrap/migration/routing/GraphQL/webpack pipelines themselves.

## Why this shape (verified against the actual code)

- `includes/bin/extension/index.ts` — `getEnabledExtensions()` memoizes `loadExtensions()`'s result in a **module-level singleton** (`let extensions: Extension[] | undefined`), computed once and reused for the rest of the process. `loadExtensions()` reads `getConfig('system.extensions', [])`, throws on a name collision with a core module, skips `enabled !== true` entries, and requires a prebuilt `dist/` if `resolve` contains `node_modules` or in production, else requires `src/` in dev.
- That memo is first touched very early and from several places — `includes/bin/lib/app.ts:27` (`createApp()`, itself the first line of `startUp.ts`'s `start()`), and independently by `includes/bin/dev/init.ts` (before `compileTs()` decides what to swc-compile) and `includes/bin/build/index.js` (top-level, before anything else) for the dev and build code paths respectively. Whatever the memo resolves to on first touch is what bootstrap, migrations, route scanning, GraphQL schema stitching, and webpack all consistently see — which is exactly why "restart required" (not live reload) is the right Phase 1 scope.
- **Ordering hazard**: on a brand-new install, extension loading happens (via `createApp()`) *before* `migrate()` ever runs (`startUp.ts:23-41`), and the `setting` table itself is created by `core/modules/setting/migration/Version-1.0.0.ts` — which only runs inside that later `migrate()` call. So a DB-override lookup querying the `setting` table must tolerate "table doesn't exist yet" on first boot without crashing.
- **No GraphQL mutations exist anywhere in this codebase today** (verified: zero `type Mutation` in the whole tree). Every write action is a plain REST-ish `POST` under an `api/<name>/route.json` folder, called from the React admin page via axios/fetch, followed by a reload — e.g. `core/modules/setting/api/saveSetting/saveSetting.ts`. The toggle endpoint follows this same convention rather than introducing the first mutation.
- **`.admin.graphql` / `.admin.resolvers.ts` is a real, working convention** for admin-only schema, confirmed in `core/modules/graphql/services/buildTypes.js:19` and `buildResolvers.js` (`ignoredExtensions: isAdmin ? [] : ['.admin.graphql']`) — files with that suffix are stitched into `/admin/graphql` only, never the storefront `/graphql`. Good fit for plugin data, which is admin-only by nature.
- `process.env.ALLOW_CONFIG_MUTATIONS` exists (set `true`/`false` in various entry points) but is **never actually read anywhere** in the codebase (grepped `includes/` and `core/` — no consumer). It's vestigial, not a real "config mutation window" mechanism — worth knowing so Phase 2 doesn't lean on it as if it were load-bearing.

## Phase 1 — Admin activate/deactivate (detailed)

### 1. Extension loader: merge in a DB override, safely

**`includes/bin/extension/index.ts`** (modify)
- Change `loadExtensions()` to accept `overrides: Record<string, boolean> = {}`, and where it currently gates on `extension.enabled !== true`, gate on the override value if present for that name, else fall back to `extension.enabled`.
- Add `export async function initExtensions(): Promise<Extension[]>` — if the memo isn't warm yet, fetch overrides via a new helper (below) and call `loadExtensions(overrides)` to populate it.
- `getEnabledExtensions()` is unchanged in signature/behavior; if somehow called before `initExtensions()` ran, its existing fallback just calls `loadExtensions({})` (equivalent to today's no-arg call).

**`includes/bin/extension/pluginOverrides.ts`** (new)
- `getPluginEnabledOverrides(): Promise<Record<string, boolean>>` — queries `setting` directly (`select().from('setting')` via `@evershop/postgres-query-builder` and `pool` from `includes/lib/postgres/connection.js`, not the `core/modules/setting` service — keeps `includes/` free of a dependency on a specific core module, matching current layering), filters rows named `plugin_enabled.<name>`, maps `value === '1'`.
- Wrapped in a broad `try/catch` that treats *any* failure (missing table on fresh install, DB unreachable) as "no overrides" and logs a warning — this is the concrete fix for the ordering hazard above.

**Wire `initExtensions()` in at the three real first-touch points**, each as close to the top as possible, before the memo can be warmed by anything else:
- `includes/bin/lib/startUp.ts` — `await initExtensions();` as the first line of `start()`, before `createApp()`.
- `includes/bin/dev/init.ts` — before `await compileTs()`.
- `includes/bin/build/index.js` — before its top-level `getEnabledExtensions()`-consuming line.

No changes needed anywhere else (`app.ts`, `createBaseConfig.js`, `buildTypes.js`, `buildResolvers.js`, `getSrcPaths.ts`) — they all keep calling the plain sync `getEnabledExtensions()`, which is correct because the memo is already warmed by the time any of them run.

### 2. Setting-table key scheme

- Key: `plugin_enabled.<extension name>` (e.g. `plugin_enabled.woocommerce-import`), `is_json = 0`, `value` = `'1'`/`'0'` string — matches how `saveSetting.ts` already stores scalar values.
- No row = "no override, config's `enabled` is authoritative." The toggle endpoint always writes an explicit row (never deletes), matching the existing `insertOnUpdate` idiom used everywhere else.
- Core modules (hardcoded in `includes/bin/lib/loadModules.js`) are never toggleable — they load unconditionally with no `enabled` gate at all, so an override for a core-module name would be silently ineffective. The toggle endpoint rejects core-module names server-side; the UI renders them as non-toggleable.

### 3. GraphQL read side — extend the `setting` module, not a new core module

Rationale for extending `setting` rather than adding `core/modules/plugin`: the storage mechanism already chosen *is* the `setting` table, so this fits the existing pattern (`StoreSetting`, `WooCommerceSetting`) exactly; it avoids touching the sensitive hardcoded `coreModules` array for zero benefit; and it avoids a bootstrap/migration lifecycle for a feature that needs neither. If Phase 2 later adds real install actions (uploads, filesystem writes), that's a natural point to split plugin-management into its own module — not a Phase 1 concern.

**`core/modules/setting/graphql/types/Plugin/Plugin.admin.graphql`** (new) — admin-only via the `.admin.graphql` convention:
```graphql
type Plugin {
  name: String!
  source: String!            # "core" | "plugin"
  resolve: String
  priority: Int
  declaredEnabled: Boolean!  # what config/default.json says
  effectiveEnabled: Boolean! # DB override if present, else declaredEnabled
  runningEnabled: Boolean!   # what's actually loaded in this running process
  restartRequired: Boolean!  # effectiveEnabled !== runningEnabled
  toggleable: Boolean!       # false for source == "core"
}
extend type Query {
  plugins: [Plugin!]!
}
```

**`core/modules/setting/graphql/types/Plugin/Plugin.admin.resolvers.ts`** (new) — `Query.plugins`:
1. One row per `getCoreModules()` entry: `source: 'core'`, all enabled flags `true`, `toggleable: false`.
2. One row per `getConfig('system.extensions', [])` entry (the raw list, **not** `getEnabledExtensions()` — that silently drops disabled entries, and this view must show disabled plugins too): `source: 'plugin'`, `toggleable: true`.
3. Fetch overrides the same way `getPluginEnabledOverrides()` does (a local direct query — mirrors how `Setting.resolvers.ts` already does its own direct query rather than going through the `getSetting()` cache).
4. `runningEnabled` = `getEnabledExtensions().some(e => e.name === plugin.name)`.
5. `effectiveEnabled` = override if present else `declaredEnabled`; `restartRequired` = `effectiveEnabled !== runningEnabled`.

### 4. REST write side — toggle endpoint

Mirrors `core/modules/setting/api/saveSetting/` exactly:

- **`core/modules/setting/api/updatePluginStatus/route.json`** (new) — `{ "methods": ["POST"], "path": "/plugins/status", "access": "private" }`.
- **`core/modules/setting/api/updatePluginStatus/[context]bodyParser[auth].ts`** (new) — same JSON body-parser wiring as `saveSetting`'s sibling middleware file.
- **`core/modules/setting/api/updatePluginStatus/updatePluginStatus.ts`** (new) — handler:
  1. Read `{ name, enabled }` from body.
  2. 400 if `name` matches a core module name.
  3. 400 if `name` isn't in `getConfig('system.extensions', [])` (Phase 1 has no discovery — can't toggle something unregistered).
  4. `insertOnUpdate('setting', ['name']).given({ name: 'plugin_enabled.' + name, value: enabled ? '1' : '0', is_json: 0 })`, commit, call `refreshSetting()` for cache hygiene, respond `{ data: { name, enabled } }` — same transaction/commit/rollback shape as `saveSetting.ts`.

### 5. Admin page

- **`core/modules/setting/pages/admin/pluginManagement/route.json`** (new) — `{ "methods": ["GET"], "path": "/plugin-management" }`.
- **`core/modules/setting/pages/admin/pluginManagement/index.ts`** (new) — sets page title via `setContextValue`, mirrors `wooCommerceSettings/index.ts`.
- **`core/modules/setting/pages/admin/pluginManagement/PluginManagement.tsx`** (new) — `SettingMenu` + `Card` layout matching other setting pages; table columns Name / Source / Status (effective) / Running / restart-required badge / toggle action (disabled for `toggleable: false` rows). Toggle handler posts to the status endpoint, then reloads (same pattern as existing action buttons like `CaptureButton.tsx`) so the SSR `query` re-runs and reflects new state immediately. `export const layout = { areaId: 'content', sortOrder: 10 }`.
- **`core/modules/setting/pages/admin/all/PluginSettingMenu.tsx`** (new) — `areaId: 'settingPageMenu'` nav card linking to the page, same shape as `WooCommerceSettingMenu.tsx`/`StoreSettingMenu.tsx`.

### Risks / notes to carry into the UI copy

- **No down-migrations exist in this framework** — disabling a plugin never drops its tables (verified via `migrate.js`'s forward-only, per-module version tracking). Re-enabling doesn't re-run already-applied migrations. Safe and reversible by construction; surface one line of UI copy: "disabling doesn't delete any data the plugin has stored."
- **No dependency graph between plugins** — if a plugin ever hard-imports another plugin's internals (bypassing hooks), disabling the depended-on one breaks the dependent one at bootstrap. Not an issue with the two plugins that exist today (`national-number-field`, `woocommerce-import` are independent), but worth a short caution line in the UI.
- Toggling a plugin not present in `config/default.json` is rejected server-side, not just hidden client-side.

## Phase 2 — Install a plugin from the admin UI (roadmap)

Let an admin install a new plugin (zip upload or git URL) that lands in `content/plugins/<name>` — already an npm-workspace glob, already the shape both existing plugins follow. Flow: upload/clone → `npm install` for that workspace member → run its existing `compile` script (swc) → write a new entry into `config/default.json`'s `system.extensions` (the one genuinely new piece of infra needed: a safe read-modify-write of that JSON file from a running process — nothing in the repo does this today, including the vestigial `ALLOW_CONFIG_MUTATIONS` flag, which isn't actually consulted anywhere despite being set in several entry points). Once registered, it shows up in the Phase 1 `plugins` query/toggle UI automatically. Same "restart required" UX applies — no new reload machinery. Biggest open risk: this executes arbitrary code (unzip, `npm install`, the plugin's own build script) with the server's privileges — needs a real trust/review story before shipping, even admin-gated.

## Phase 3 — npm-package plugin installation (roadmap)

Install a *published* npm package as a plugin, extending the `node_modules` branch `includes/bin/extension/index.ts` already anticipates (`resolve.includes('node_modules')` → requires prebuilt `dist/`, skips dev swc-compile). There's an existing but unimplemented design for this, `core/.docs/plugin.md` — its discovery functions (`discoverNpmExtensions()`: scan `node_modules`, look for an `evercamps.plugin === true` package.json marker; `mergeExtensionCandidates()`: config always wins over discovery on name collision) are reusable, but its overall framing is stale — it assumed EverCamps was still a publishable framework package installed into a separate consumer project (`packages/evercamps`, `create-evercamps-app`), which no longer exists after the repo collapsed into a single app (`includes/`+`core/` at the repo root). Phase 3 should target installing into **this app's own** `node_modules`, either via `npm install <pkg>` triggered server-side (same code-execution trust concerns as Phase 2, arguably higher since it pulls from the public registry) or, as a lower-risk starting point, a documented CLI step (`evercamps plugin:install <package>`) an operator runs themselves. Discovered-but-unconfigured npm plugins should default to `enabled: false` (higher trust bar than filesystem/git-installed code an admin explicitly reviewed in Phase 2). This composes cleanly with Phase 1's `overrides` merge and Phase 1's `source` column just grows an `"npm"` value.

## Verification (Phase 1)

1. `npm run dev`, open `/plugin-management`: confirm core modules listed as non-toggleable, `national-number-field` and `woocommerce-import` listed as toggleable, no restart-required badges initially.
2. Toggle `woocommerce-import` off. Confirm `POST /api/plugins/status` returns 200; `SELECT * FROM setting WHERE name = 'plugin_enabled.woocommerce-import'` shows `value = '0'`.
3. After reload, confirm UI shows `effectiveEnabled: false`, `runningEnabled: true`, restart-required badge.
4. Restart the process. Reload the page: `effectiveEnabled`/`runningEnabled` both `false`, no badge; confirm its routes/GraphQL types are actually gone (e.g. its settings route 404s, `WooCommerceSetting` absent from `/admin/graphql` schema).
5. Re-enable from the UI, restart, confirm it's fully back and its migrations did **not** re-run (check the `migration` table row is unchanged).
6. `curl -X POST /api/plugins/status -d '{"name":"catalog","enabled":false}'` as an authenticated admin → expect 400; confirm `catalog` still loads (server-side guardrail, not just a disabled button).
7. Fresh-DB smoke test: point at an empty database, run first boot, confirm it does not crash before migrations run (proves `getPluginEnabledOverrides()`'s catch-all handles the missing-`setting`-table case) — expect one benign warning in logs on that first boot only.

### Critical files
- `includes/bin/extension/index.ts` — add `overrides` param, add `initExtensions()`
- `includes/bin/extension/pluginOverrides.ts` (new)
- `includes/bin/lib/startUp.ts`, `includes/bin/dev/init.ts`, `includes/bin/build/index.js` — call `initExtensions()` first
- `core/modules/setting/graphql/types/Plugin/Plugin.admin.graphql` + `Plugin.admin.resolvers.ts` (new)
- `core/modules/setting/api/updatePluginStatus/*` (new)
- `core/modules/setting/pages/admin/pluginManagement/*`, `pages/admin/all/PluginSettingMenu.tsx` (new)
