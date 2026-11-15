# WordPress-Style Plugin Auto-Discovery for Evercamps

## Context

Evercamps (forked from evershop.io) already has a full plugin-loading architecture: a
bootstrap lifecycle, hooks (`hookBefore`/`hookAfter`), a value-processor registry,
a widget manager, cron jobs, route/component override-by-filename, and an extension
resolver (`packages/evercamps/src/bin/extension/index.ts`) that already handles both
filesystem-dropped and npm-installed plugin code (it branches on whether a path
contains `node_modules` to decide whether a prebuilt `dist/` or a dev-mode `src/` is
required). None of that needs to be rebuilt.

The actual gap, confirmed by reading `loadExtensions()`: **discovery is 100% manual.**
Today a human must hand-edit `config/default.json`'s `system.extensions` array with an
explicit `{ name, resolve, enabled, priority }` entry for every single plugin — there is
no scanning of a filesystem `extensions/` folder, and no scanning of `node_modules` for
installed plugin packages. That's the WordPress gap: dropping a folder into
`wp-content/plugins/` or running `npm install <plugin>` should be enough on its own.

This plan adds an auto-discovery layer that feeds into the *existing* loader
unchanged, plus small CLI commands to manage enable/disable state without hand-editing
JSON.

## Folder structure (two tiers)

`CONSTANTS.ROOTPATH` (`packages/evercamps/src/lib/helpers.ts`) resolves differently
depending on deployment mode: inside this monorepo it walks 4 levels up from
`packages/evercamps/src/lib` to the repo root; in a real `create-evercamps-app`
deployment (evercamps installed as `node_modules/@evercamps/evercamps`) it's
`process.cwd()` — the *consumer's own project root*, which has no `packages/evercamps`
at all. Anything meant for site owners to author must therefore live outside
`packages/evercamps` entirely, or it's invisible in every real deployment and gets
wiped on every `npm install` to boot. This mirrors WordPress's `wp-content/plugins` vs
`wp-includes` split, and matches conventions already committed in this repo: root
`package.json` already declares `"workspaces": ["packages/*", "extensions/*"]`, and
`CONSTANTS.THEMEPATH` already resolves to `<root>/themes`.

- **`<root>/extensions/*`** — site-specific / third-party plugins. The only valid
  location for anything a site owner authors or installs; resolved relative to
  `CONSTANTS.ROOTPATH`, already an npm workspace glob, matches the
  `create-evercamps-app` sample scaffold (`extensions/sample`). Discovery scans this
  folder (see `discoverFilesystemExtensions` below).
- **`packages/evercamps/plugins/*`** (new) — first-party, framework-maintained but
  *optional* integrations. Today `mollie`, `paypal`, `stripe`, and `cod` are hardcoded
  unconditionally into `coreModules` in `bin/lib/loadModules.js` — every site loads all
  four payment/shipping integrations whether it uses them or not. This plan migrates
  those four off the hardcoded core-module list and onto the same extension mechanism,
  loaded via `discoverBundledPlugins()` (opt-in through `system.extensions` like any
  other plugin). This dogfoods the plugin API for the framework's own integrations and
  gives third-party plugin authors a real, in-repo reference implementation to copy —
  which was the actual goal here (making it *easier to write* plugins), not just
  discovery mechanics.
  - `packages/evercamps/src/bin/lib/loadModules.js`: remove `mollie`, `paypal`,
    `stripe`, `cod` from the hardcoded `coreModules` array.
  - New `discoverBundledPlugins(rootPath = CONSTANTS.LIBPATH)` in
    `discoverExtensions.ts`: scans `packages/evercamps/plugins/*` the same way as
    `discoverFilesystemExtensions`, but resolves paths relative to
    `CONSTANTS.LIBPATH`/`packages/evercamps` (not `ROOTPATH`) since these ship inside
    the framework package itself, tags candidates `source: 'bundled'`, default
    `enabled: false` (opt-in — a site shouldn't get Stripe wired in by default just
    because the framework ships the integration).
  - Existing `mollie/`, `paypal/`, `stripe/`, `cod/` module folders move from
    `packages/evercamps/src/modules/` to `packages/evercamps/plugins/` (each gains its
    own `package.json` + `dist`/`src` split, matching the `Extension` contract instead
    of the plain core-module contract).

**Assumed defaults** (no response was given when these were asked; proceeding on best
judgment — flag if you want something different before I start):
- npm plugin marker: a package's own `package.json` has `"evercamps": { "plugin": true, "priority"?: number }`.
- State storage: no new state file — discovered plugins merge into the same
  `system.extensions` resolution; a `config/default.json` entry with the same `name`
  overrides the discovered defaults (config wins, dedup by name).
- CLI: add `evercamps plugin:list` / `plugin:enable <name>` / `plugin:disable <name>`.

## Implementation

### 1. New discovery module — `packages/evercamps/src/bin/extension/discoverExtensions.ts`

Exports four functions:

```ts
export function discoverFilesystemExtensions(rootPath = CONSTANTS.ROOTPATH): Extension[]
export function discoverNpmExtensions(rootPath = CONSTANTS.ROOTPATH): Extension[]
export function discoverBundledPlugins(libPath = CONSTANTS.LIBPATH): Extension[]
export function mergeExtensionCandidates(discovered: Extension[], configured: Extension[]): Extension[]
```

**`discoverFilesystemExtensions`**: if `<root>/extensions` doesn't exist, return `[]`.
Otherwise, for each subdirectory of `extensions/` that contains a `package.json`,
build a candidate `{ name: <folderName>, resolve: 'extensions/<folderName>', enabled: true, priority: 100, source: 'filesystem' }`.
Use the folder name (not `package.json.name`) as the identifier — matches how `name`
is already an independent slug in the config-driven convention today. Malformed
`package.json` → warn and skip, don't throw (a broken neighbor folder shouldn't crash
boot).

**`discoverNpmExtensions`**: scan two levels of `<root>/node_modules` (top-level dirs,
plus one level into `@scope/*` dirs) — matches how npm/yarn hoist dependencies, no
recursive walk needed. For each package whose `package.json` has
`evercamps.plugin === true`, build a candidate `{ name: pkg.name, resolve: 'node_modules/' + pkg.name, enabled: true, priority: pkg.evercamps.priority ?? 100, source: 'npm' }`.
Every other installed package is skipped silently (this runs over every dependency,
so it must be silent for non-plugins). The `resolve` string must literally contain
`"node_modules"` — that's what makes the existing loader require a prebuilt `dist/`
instead of trying to swc-compile a `src/` folder, and it's already correct.

**`discoverBundledPlugins`**: if `<libPath>/plugins` (i.e. `packages/evercamps/plugins`)
doesn't exist, return `[]`. Otherwise, for each subdirectory with a `package.json`,
build a candidate `{ name: <folderName>, resolve: path.relative(CONSTANTS.ROOTPATH, path.resolve(libPath, 'plugins', folderName)), enabled: false, priority: 100, source: 'bundled' }`.
`resolve` is computed relative to `ROOTPATH` (not `libPath`) because the existing
loader always joins `extension.resolve` onto `CONSTANTS.ROOTPATH` — bundled plugins
need a `ROOTPATH`-relative path even though they're discovered by walking `LIBPATH`.
Default `enabled: false`, unlike filesystem/npm discovery — bundled plugins (mollie,
paypal, stripe, cod) ship with the framework but a site must opt in explicitly, same
as today's manual `config/default.json` entries required an explicit `enabled: true`.

**`mergeExtensionCandidates`**: dedup by `name`. Two *discovered* candidates sharing a
name (e.g. a filesystem folder and an npm package both named `foo`) is a hard error —
mirrors the existing throw-on-duplicate behavior in `loadExtensions()`. A config entry
sharing a name with a discovered candidate is not an error — it fully replaces the
discovered entry (whole-entry replacement, not a field merge, consistent with today's
contract that a config entry supplies all required fields itself).

### 2. Wire discovery into the existing loader — `packages/evercamps/src/bin/extension/index.ts`

`loadExtensions()` currently does `const list = getConfig('system.extensions', []) as Extension[];`.
Change it to build `list` from the merge instead:

```ts
const configured = (getConfig('system.extensions', []) as Extension[]).map(e => ({ ...e, source: 'config' as const }));
const discovered = [
  ...discoverFilesystemExtensions(),
  ...discoverNpmExtensions(),
  ...discoverBundledPlugins()
];
const list = mergeExtensionCandidates(discovered, configured);
```

Everything after that line (duplicate-vs-core-module check, enabled/resolve-exists
checks, dev/prod `src`/`dist` resolution, priority sort) is untouched — it already
does exactly the right thing for discovered entries once they're in `list`.
`getEnabledExtensions()` needs no changes; it already just memoizes `loadExtensions()`.

### 3. Extend the `Extension` type — `packages/evercamps/src/types/extension.ts`

Add an optional field so `plugin:list` can show where each entry came from:

```ts
export type ExtensionSource = 'core' | 'config' | 'filesystem' | 'npm' | 'bundled';
export type Extension = {
  name: string;
  resolve: string;
  srcPath?: string;
  path: string;
  enabled: boolean;
  priority: number;
  source?: ExtensionSource;
};
```

Optional (not required) so no existing `Extension`-literal call site breaks.

### 4. CLI commands — new folder `packages/evercamps/src/bin/plugin/`

Mirrors the existing single-purpose folder convention (`bin/extension/`, `bin/user/`).

- **`configWriter.ts`** — the one genuinely new piece of infra. Nothing in the
  codebase currently does a read-modify-write of `config/default.json` (the only
  precedent, `createEverCampsApp.js::createConfigFile()`, does a wholesale overwrite
  of a freshly-built object, not a merge). Implement `upsertExtensionOverride(name, patch)`:
  read `config/default.json` (treat missing/empty file as `{}`), ensure
  `cfg.system.extensions` exists, find-or-push an entry by `name`, `JSON.stringify(cfg, null, 2)` back.
  When creating a brand-new override entry (plugin has no existing config entry),
  the caller must supply `resolve` (sourced from the discovery result) so the written
  entry is valid standalone.
- **`list.ts`** — reads core modules + merged discovery/config candidates directly
  (not via `getEnabledExtensions()`, which silently drops disabled/invalid entries —
  `plugin:list` must show disabled ones too). Prints a simple padded-column table:
  `NAME | SOURCE | ENABLED | PRIORITY | RESOLVE`. No new dependency for table
  formatting.
- **`enable.ts` / `disable.ts`** — read the plugin name from the CLI positional arg,
  run discovery to find a default `resolve` if no config entry exists yet, call
  `upsertExtensionOverride(name, { enabled: true|false })`, print a message noting the
  change takes effect on the next `dev`/`build`/`start` (the in-process memo in
  `bin/extension/index.ts` doesn't need touching — enable/disable and the app process
  are always separate CLI invocations).

### 5. Dispatcher — `packages/evercamps/src/bin/evercamps.js`

Add three branches to the existing `if/else if` chain (same pattern as `user:create`):

```js
} else if (command === 'plugin:list') {
  await import('./plugin/list.js');
} else if (command === 'plugin:enable') {
  await import('./plugin/enable.js');
} else if (command === 'plugin:disable') {
  await import('./plugin/disable.js');
}
```

### 6. Migrate mollie/paypal/stripe/cod to `packages/evercamps/plugins/`

- `git mv packages/evercamps/src/modules/{mollie,paypal,stripe,cod} packages/evercamps/plugins/`.
- Each gets a new `package.json` (`{ "name": "<name>", "main": "index.js", "type": "module" }`,
  matching the sample extension's shape) since the `Extension` contract requires the
  discovery step to detect a `package.json`, and production mode requires a `dist/`
  sibling to `src/`.
- Remove `mollie`, `paypal`, `stripe`, `cod` entries from the hardcoded `coreModules`
  array in `packages/evercamps/src/bin/lib/loadModules.js`.
- Each of these four modules already has its own `bootstrap.ts`/`api`/`graphql`/
  `pages`/`services` following the same shape `extensions/sample` uses — confirm no
  code assumed a `core module` (unconditionally loaded, no `enabled` gate) rather than
  an `Extension` (gated by `enabled`, discoverable, independently versioned). Spot-check
  cross-module imports: nothing in `checkout`/`oms`/`setting` should import directly
  from `modules/mollie` etc. — if something does, it needs to go through the existing
  hook/event mechanism instead, since a disabled plugin must not be a hard dependency
  of always-on core.

### 7. Not in scope for this change

- `packages/create-evercamps-app` scaffolding still hardcodes a `system.extensions`
  entry for its sample extension and is generally stale/evershop-branded — leaving
  that untouched. Filesystem discovery will pick up the scaffolded sample extension
  automatically regardless, since it already has a `package.json`. A follow-up could
  remove the now-redundant hardcoded config entry, but bundling that in risks
  conflating two concerns.
- pnpm's isolated `node_modules/.pnpm` layout isn't specially handled by the two-level
  npm scan — acceptable gap for v1, matches standard npm/yarn hoisting only.
- `config/local.json` overrides of `system.extensions` aren't specially merged by
  `plugin:enable`/`disable` (they always write to `default.json`) — matches your
  explicit instruction to write to `default.json`.
- Other core modules (`auth`, `base`, `catalog`, `checkout`, `camp`, `cms`, `customer`,
  `graphql`, `oms`, `promotion`, `setting`, `tax`) stay as unconditional core modules —
  only the four independently-toggleable integrations move to `plugins/`. Nothing
  about foundational modules changes.

## Verification

**Manual:**
1. Create `extensions/my-fs-plugin/package.json` + `src/bootstrap.ts` (no config
   entry). Run `evercamps plugin:list` → expect `my-fs-plugin`, `source: filesystem`,
   `enabled: true`, `priority: 100`. Run `evercamps dev` → confirm its bootstrap runs.
2. Create a throwaway npm package with `"evercamps": { "plugin": true, "priority": 50 }`
   in its `package.json`, install it into `node_modules/`. Run `evercamps plugin:list`
   → expect it listed with `source: npm`, `priority: 50`.
3. Run `evercamps plugin:disable my-fs-plugin` → inspect `config/default.json` for the
   new override entry, confirm `shop` key untouched. Re-run `plugin:list` → shows
   disabled. Run `evercamps dev` → confirm it no longer loads. Run
   `evercamps plugin:enable my-fs-plugin` → confirm it flips back in place (not
   duplicated).
4. Create `extensions/catalog/` (colliding with the core `catalog` module) → confirm
   `evercamps plugin:list`/`dev` throws the existing "extension name must be unique"
   error unchanged.
5. After migration, run `evercamps plugin:list` → confirm `mollie`, `paypal`, `stripe`,
   `cod` appear with `source: bundled`, `enabled: false` by default. Run
   `evercamps plugin:enable mollie` → confirm `config/default.json` gets an override
   entry, `evercamps dev` boots with mollie active and the other three still off.
   Run a full checkout smoke test with mollie enabled to confirm nothing broke in the
   move (payment method selection, webhook route registration).

**Automated (new test files, nothing existing to update — confirmed no
`bin/extension/tests/` folder exists today):**
- `packages/evercamps/src/bin/extension/tests/unit/discoverExtensions.test.ts` —
  covers filesystem/npm/bundled discovery (missing root, missing `package.json`,
  malformed JSON, marker detection, scoped packages, priority read-through,
  bundled-defaults-to-disabled) and `mergeExtensionCandidates` (config overrides
  discovery, discovered-vs-discovered throws, pass-through cases). Use
  `fs.mkdtempSync` temp dirs and the `rootPath`/`libPath` parameters rather than
  mocking `fs` module-wide.
- `packages/evercamps/src/bin/plugin/tests/unit/configWriter.test.ts` — covers
  creating `system.extensions` from an empty/missing config, updating in place
  without duplicating, and preserving unrelated top-level keys.

Both match the existing `jest.config.js` `testMatch` glob with no config changes
needed.

### Critical files
- `packages/evercamps/src/bin/extension/index.ts` — wire in discovery + merge
- `packages/evercamps/src/bin/extension/discoverExtensions.ts` (new)
- `packages/evercamps/src/types/extension.ts` — add optional `source` field
- `packages/evercamps/src/bin/plugin/{list,enable,disable,configWriter}.ts` (new)
- `packages/evercamps/src/bin/evercamps.js` — add `plugin:*` dispatch branches
- `packages/evercamps/src/bin/lib/loadModules.js` — drop mollie/paypal/stripe/cod from
  hardcoded `coreModules`
- `packages/evercamps/plugins/{mollie,paypal,stripe,cod}/` — moved from
  `src/modules/`, each gains its own `package.json`
