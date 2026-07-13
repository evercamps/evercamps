# WordPress-style repo restructuring: `lib/` + `core/` + `content/`

## Context

The user wants to reorganize evercamps (a fork of evershop.io) into a WordPress-like
shape: `lib/` (framework code, not touched directly by site authors, but imported from
`content`), `core/` (framework internals, never touched or imported directly), and
`content/` (site-specific: `theme/`, `translations/`, `plugin/`, `media/`). The
`packages/create-evercamps-app` scaffolding CLI would be deleted from this repo and
rebuilt as a separate project.

**Assessment, directly:** this is feasible, TypeScript has no problem with it (it's
purely a directory-layout and path-resolution change, no language-level obstacle), and
it converges on something the codebase is already halfway toward — not a fresh idea
grafted on. Confirmed by research:

- The `lib`/`core` split already exists *conceptually* inside `packages/evercamps/src/`:
  `src/lib` is framework runtime plumbing, `src/modules` is exactly 16 hardcoded,
  never-overridden domain modules. The proposed rename mostly formalizes a boundary
  that's already there.
- Extension/plugin loading already works the way WordPress plugins do: site-authored
  code lives outside the framework package, declared in config, loaded via
  `CONSTANTS.ROOTPATH`-relative resolution (`packages/evercamps/src/bin/extension/index.ts`).
  `plugin.md` (already in this repo) sketches an auto-discovery layer on top of exactly
  this mechanism.
- `create-evercamps-app` is already confirmed broken (`index.js` requires a file that
  was renamed away in the evershop→evercamps fork — `MODULE_NOT_FOUND`), stale/evershop-
  branded throughout, standalone (no workspace-protocol dependency on `packages/evercamps`),
  and not referenced by CI or any root script. Deleting it is zero-risk on its own.
- Moving `media/`, `translations/`, and the (currently unused) theme mechanism is
  near-mechanical: all media paths funnel through one `CONSTANTS.MEDIAPATH`, theme
  paths through `CONSTANTS.THEMEPATH`, translations through one hardcoded path in a
  single loader file. Only ~80 data files total move.

**The one consequential tradeoff, decided by the user:** hoisting `lib/`+`core/` all
the way to the true repo root (rather than just renaming folders inside
`packages/evercamps`) dissolves `packages/evercamps` as an npm-publishable dependency
boundary. This repo currently supports two runtime modes via a branch in `CONSTANTS.ROOTPATH`
(`packages/evercamps/src/lib/helpers.ts`): running inside `node_modules/@evercamps/evercamps`
(a real site depending on a published package) vs. running inside this monorepo. After
the hoist, only the "monorepo" identity remains — this repo becomes the framework *and*
a site simultaneously, the same way the actual WordPress core repo contains
`wp-admin`/`wp-includes` alongside a site's `wp-content`. "Updating the framework" stops
being `npm update` and becomes "sync `lib/`+`core/` from upstream." The user has chosen
this deliberately, understanding the tradeoff — it's the more literal WordPress model,
and it's confirmed safe today because nothing else consumes `@evercamps/evercamps`'s
npm `exports` map (grepped: the one real extension in this repo, `national-number-field`,
imports nothing through it).

**Bottom line on "will this make development easier":** yes, for the actual goal
(clear rule of "what am I allowed to edit"), at the cost of a large one-time mechanical
migration (~1255 files' worth of import-path fixes in the `core/` hoist) and giving up
semver-based framework updates. The migration is best done as several small, always-
bootable PRs rather than one rewrite — sequenced below cheapest-first.

## Target layout

```
/lib/                     <- packages/evercamps/src/lib + src/bin + src/types + components/common
/core/                    <- packages/evercamps/src/modules (16 domain modules) + components/admin + components/frontStore
/content/
  theme/                  <- new (mechanism exists, currently unused)
  translations/           <- was /translations
  plugin/                 <- was /extensions
  media/                  <- was /media
/config/                  <- unchanged location; contents edited
```

- `bin/` (CLI dispatcher, dev/build/start/install/user/extension loader) moves under
  `lib/bin/` — it's framework tooling with zero site-domain knowledge, same category as
  `lib/webpack` or `lib/router`. No case for its own top-level folder once it can't be
  independently published.
- `types/` -> `lib/types/` (shared contracts used by both `lib` and `core`).
- `components/common/` (Badge, Area, form/grid/list/modal primitives) -> `lib/components/common/`
  (consumed by themes/plugins, so it's framework API surface). `components/admin/` and
  `components/frontStore/` -> `core/components/{admin,frontStore}/` (default UI for this
  specific commerce domain, overridable the same way modules' `pages/` are today).
- The `plugin.md` bundled-optional-integrations concept (mollie/paypal/stripe/cod as
  toggleable, not hardcoded) maps to `core/plugins/*`, not `content/plugin/*` — they're
  framework-maintained, not site-authored. Can land in the same hoist or be deferred;
  either way they start as regular `core/` modules like the other twelve.
- Config/naming renamed end-to-end, not just the folder: `system.extensions` ->
  `system.plugins` in `config/default.json`, resolve paths `"extensions/x"` ->
  `"content/plugin/x"`, root `workspaces` glob `"extensions/*"` -> `"content/plugin/*"`.

## CONSTANTS rewrite (`lib/helpers.ts`, formerly `packages/evercamps/src/lib/helpers.ts`)

The node_modules-vs-monorepo branch collapses (no more "installed as a dependency" mode
for local dev):

```ts
const rootPath = path.resolve(__dirname, '..', '..'); // lib/helpers.ts -> lib/ -> repo root

export const CONSTANTS = Object.freeze({
  ROOTPATH: rootPath,
  LIBPATH: path.resolve(rootPath, 'lib'),
  COREPATH: path.resolve(rootPath, 'core'),             // renamed from MODULESPATH
  CONTENTPATH: path.resolve(rootPath, 'content'),
  THEMEPATH: path.resolve(rootPath, 'content', 'theme'),
  TRANSLATIONPATH: path.resolve(rootPath, 'content', 'translations'), // promoted into CONSTANTS
  PLUGINPATH: path.resolve(rootPath, 'content', 'plugin'),
  MEDIAPATH: path.resolve(rootPath, 'content', 'media'),
  PUBLICPATH: path.resolve(rootPath, 'public'),
  NODEMODULEPATH: path.resolve(rootPath, 'node_modules'),
  CACHEPATH: path.resolve(rootPath, 'evercamps'),
  BUILDPATH: path.resolve(rootPath, 'evercamps', 'build'),
  ADMIN_COLLECTION_SIZE: getConfig('admin_collection_size', 20)
});
```

Consumers needing updates: `lib/util/getEnabledTheme.ts` (THEMEPATH), `lib/webpack/loaders/loadTranslationFromCsv.ts:13-17`
(hardcoded `path.resolve(CONSTANTS.ROOTPATH, 'translations', language)` -> `path.resolve(CONSTANTS.TRANSLATIONPATH, language)`),
`lib/middlewares/static.js` + `core/cms/services/*` + `core/catalog/subscribers/product_image_added/generateLocalImages.js`
(MEDIAPATH, audit each for sibling hardcoded `'media'` segments), `lib/bin/extension/index.ts`
(rename to plugin terminology; its one `ROOTPATH`-joined resolve call), `lib/bin/install/index.js:218`
(hardcoded `mkdir(...,'media')`), `lib/bin/lib/loadModules.js` (`coreModules[]` resolution
must switch from `__dirname`-relative walking to `CONSTANTS.COREPATH`, since `core` is now
a sibling of `lib`, not nested under the old `bin`).

## package.json / build config changes

- Root `workspaces`: `["packages/*", "extensions/*"]` -> `["content/plugin/*"]`.
- Root scripts (`dev`/`start`/`build`/`setup`): `node ./packages/evercamps/dist/bin/*` ->
  `node ./dist/lib/bin/*` (confirm whether `dev` compiles on the fly or requires a prior
  `compile` step before repointing).
- `compile`/`compile:tsc`: currently `cd packages/evercamps && swc ./src/ -d dist/ ...`.
  New: single root `tsconfig.json` widened to `"include": ["lib", "core"]`, one
  `outDir: "dist"` — simpler than splitting into two compiled packages now that neither
  is independently published.
- `packages/evercamps/package.json` dependencies (express, react, webpack, and per-module
  deps like `@mollie/api-client`, `stripe`) merge into root `dependencies`. Watch for
  version collisions — both currently pin `@swc/core`, `@swc/cli`, `typescript`,
  `@parcel/watcher`, `execa`, `copyfiles`.
- **Confirmed via direct read:** `jest.config.js` today has `testMatch: ["**/src/**/tests/**/unit/**/*.test.[jt]s"]`,
  `modulePathIgnorePatterns: ["<rootDir>/packages/evercamps/dist/"]`, and a
  `moduleNameMapper` pointing at `@evershop/postgres-query-builder` under
  `packages/postgres-query-builder` — **that package doesn't exist in this repo**
  (only `evercamps` and `create-evercamps-app` live under `packages/`), a pre-existing
  stale leftover from the evershop fork, worth deleting in the same pass rather than
  carrying forward. `testMatch` -> two-entry array covering `lib/` and `core/` (verify
  jest's glob engine before relying on brace-expansion shorthand); `modulePathIgnorePatterns`
  -> `["<rootDir>/dist/"]`.
- **Confirmed via direct read:** root `tsconfig.json` has `rootDir: "./packages/evercamps"`,
  `include: ["./packages/evercamps/src"]`, and a path alias
  `"@components/*": ["./packages/evercamps/src/components/*"]` — this alias needs to
  split into `@components/common/*` / `@components/admin/*` / `@components/frontStore/*`
  once components move to both `lib/` and `core/` (grep call-site count first to judge
  whether keeping the alias is worth it vs. relative imports).
- **Confirmed via direct read:** `packages/evercamps/package.json`'s `exports` map
  (`./lib/helpers`, `./components/common`, `./catalog/services`, etc.) is the framework's
  public npm-consumer API surface — it's safe to drop when the package boundary
  dissolves, confirmed by grep that the one real extension (`national-number-field`)
  imports nothing through it.

## Config schema changes

- `config/default.json`: `system.extensions` -> `system.plugins`; each entry's `resolve`
  `"extensions/<name>"` -> `"content/plugin/<name>"`.
- `.gitignore`: `/extensions/*` block + explicit un-ignore lines -> `/content/plugin/*` +
  matching un-ignores; `/themes` -> `/content/theme`; `/media` -> `/content/media`;
  drop the two `create-evercamps-app`-referencing un-ignore lines entirely.

## Migration sequencing (each phase a separate PR, app stays bootable throughout)

1. **Delete `packages/create-evercamps-app`.** Zero risk, already confirmed broken and
   unreferenced. Leave a short breadcrumb (README or docs note, not code) of what the
   future standalone CLI needs to scaffold: a `content/{theme,translations,plugin,media}`
   skeleton, plus either a vendored copy of `lib/`+`core/` or a reference to wherever
   they eventually get published from.
2. **Content folder moves** (near-mechanical): `git mv extensions content/plugin`,
   `git mv translations content/translations`, `git mv media content/media`,
   `mkdir content/theme` (+ `.gitkeep`). Update `CONSTANTS` additions, `loadTranslationFromCsv.ts`,
   `config/default.json` key/path rename, `.gitignore`, root `workspaces` glob.
   `packages/evercamps` still exists at this point — only its `ROOTPATH`-relative
   resolution now points at new content paths. **Verify:** `npm run dev` boots, the
   existing `national-number-field` extension loads, a translation renders.
3. **Hoist `lib/` + `core/` to repo root** (the expensive phase — split into sub-commits):
   a. `git mv packages/evercamps/src/lib lib`, `git mv packages/evercamps/src/types lib/types`,
      `git mv packages/evercamps/src/bin lib/bin`. Rewrite `CONSTANTS`. Fix every import
      crossing the old `src/lib`↔`src/modules`↔`src/bin`↔`src/components` boundary —
      highest-volume step, do it with a scripted codemod/regex pass per known import
      prefix, gate correctness with `tsc --noEmit`, not manual editing.
   b. `git mv packages/evercamps/src/modules core`. Fix `lib/bin/lib/loadModules.js`'s
      `coreModules` resolution to use `CONSTANTS.COREPATH`.
   c. Split components: `common/` -> `lib/components/common`, `admin/`+`frontStore/` ->
      `core/components/{admin,frontStore}`. Fix the `@components/*` tsconfig alias and
      every call site using it.
   d. (Optional, can defer) fold `mollie`/`paypal`/`stripe`/`cod` into `core/plugins/*`
      per `plugin.md`'s bundled-plugin concept.
   e. Root `package.json`: merge dependencies, rewrite scripts, delete
      `packages/evercamps/package.json` + its `tsconfig.json`/`.swcrc` (or move `.swcrc`
      to root). Delete now-empty `packages/`.
   f. Fix `jest.config.js` (`testMatch`, `modulePathIgnorePatterns`, drop the stale
      `postgres-query-builder` mapper entries).
   **Verify after 3(a)-(f):** `tsc --noEmit` clean, `npm test` green, `npm run dev` boots
   and serves both an admin page and a storefront page, `npm run build && npm run start`
   works end-to-end.
4. **Optional follow-up PR:** implement `plugin.md`'s auto-discovery layer against the
   new `content/plugin`/`core/plugins` naming — that doc already anticipates most of the
   renames needed (`discoverFilesystemExtensions` -> scan `CONSTANTS.PLUGINPATH`,
   `discoverBundledPlugins` -> scan `CONSTANTS.COREPATH/plugins`, its `system.extensions`
   references -> `system.plugins`).

## Risk callouts

- Cross-module imports touching ~1255 files in `core/` is the single highest-risk step —
  relative-path depth changes once `lib`/`core` are root-level siblings instead of both
  nested under the old `src/`. Use a scripted pass + `tsc --noEmit`, not hand-editing.
- `lib/webpack/{loaders,plugins,dev,prod}` likely has its own `__dirname`-relative
  assumptions beyond `CONSTANTS` — audit each file individually.
- `bin/lib/loadModules.js`'s hardcoded `coreModules` array is touched by both the path-
  resolution hoist and any future mollie/paypal/stripe/cod-to-plugin migration — keep
  those as separate commits.
- Verify jest's glob engine actually supports the brace-expansion shorthand before
  relying on it for `testMatch`; use an explicit two-entry array if not.

## Verification

After phase 2: `npm run dev`, confirm the app boots, `national-number-field` extension
still loads, a translation string renders correctly, an existing media asset still serves.

After phase 3: `tsc --noEmit` (or `npm run compile:tsc`) clean; `npm test` (jest) green;
`npm run dev` boots and both an admin page and a storefront page render; `npm run build`
followed by `npm run start` works end-to-end in production mode; `npm run lint` clean.

### Critical files
- `packages/evercamps/src/lib/helpers.ts` — `CONSTANTS` rewrite, crux of the migration
- `packages/evercamps/src/bin/lib/loadModules.js` — hardcoded `coreModules` array
- `packages/evercamps/src/bin/extension/index.ts` — `system.extensions`->`system.plugins`
- `packages/evercamps/src/lib/webpack/loaders/loadTranslationFromCsv.ts` — hardcoded translations path
- `package.json` (root) and `packages/evercamps/package.json` — workspaces, scripts, dependency merge
- `config/default.json` — key rename + resolve path rewrites
- `jest.config.js`, `tsconfig.json` — glob/path updates, drop stale `postgres-query-builder` mapper
- `.gitignore` — pattern rewrites for `content/plugin`, `content/theme`, `content/media`
