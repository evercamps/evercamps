# Theme System Migration

## Overview

Evercamps already ships a **theme system** (`lib/util/getEnabledTheme.ts`) that loads a theme directory, resolves its components via Webpack aliases, merges its Tailwind config, and serves its static assets — all before the first request. This document describes how to evolve that into a full WordPress-like theme system: discoverable, switchable from the admin UI, and open to third-party distribution.

The migration is broken into seven phases, each independently shippable. Phases 1–4 are the foundation. Phases 5–7 are progressive enhancements.

**Nothing in `getEnabledTheme.ts`, `themePublicStatic.js`, `createBaseConfig.js`, or the existing Tailwind pipeline changes.** The theme resolution already works — this migration makes it discoverable and gives it an admin UI.

---

## What already exists

| Capability | Location |
|---|---|
| Theme loader with src/dist validation | `lib/util/getEnabledTheme.ts` |
| Theme public static file middleware | `lib/middlewares/themePublicStatic.js` |
| `@components` webpack alias (theme overrides core) | `lib/webpack/createBaseConfig.js` |
| Tailwind config merging (theme overrides defaults) | `lib/webpack/util/getTailwindConfig.js` + `TailwindLoader.js` |
| `system.theme` config key | read via `getConfig('system.theme')` |
| ThemeConfig GraphQL type (logo, headTags, copyright) | `modules/cms/graphql/types/ThemeConfig/` |
| themeConfig schema registration | `modules/cms/bootstrap.ts` |
| Area/sortOrder component layout system | `lib/webpack/loaders/AreaLoader.js` |
| `THEMEPATH` constant (`{ROOTPATH}/themes`) | `lib/helpers.ts` |
| Sample theme skeleton | `packages/create-evercamps-app/sample/themes/sample/` |

The current gap: themes must be manually set in `system.theme` config, there is no admin UI to browse or switch themes, and there is no metadata standard for theme authors.

---

## Theme anatomy

A theme is a directory inside `themes/` (or an npm package) with the following structure:

```
evercamps-theme-my-theme/
  package.json          ← required: declares metadata + evercamps key
  tsconfig.json         ← compiles src/ → dist/
  src/
    pages/
      frontStore/       ← storefront page components
        all/            ← components rendered on every storefront page
        homepage/       ← components rendered only on the homepage
      admin/
        all/            ← components rendered on every admin page
    components/         ← component overrides (resolved via @components alias)
  dist/                 ← compiled output (src/ → dist/)
    pages/
    components/
    tailwind.config.js  ← optional: merged over default Tailwind config
  public/               ← static assets (images, fonts, icons)
    logo.png
    favicon.ico
```

### `package.json` metadata standard

```json
{
  "name": "evercamps-theme-my-theme",
  "version": "1.0.0",
  "keywords": ["evercamps-theme"],
  "evercamps": {
    "displayName": "My Theme",
    "author": "Acme Corp",
    "description": "A clean storefront theme for evercamps.",
    "screenshot": "public/screenshot.png",
    "minVersion": "2.0.0",
    "supports": ["frontStore", "admin"]
  }
}
```

The `"keywords": ["evercamps-theme"]` field is how auto-discovery finds the package. The `evercamps` key carries display metadata shown in the admin theme gallery.

### Component layout contract

Each component declares its placement via a named `layout` export:

```typescript
// src/pages/frontStore/all/MyHeader.tsx
export const layout = {
  areaId: 'head',       // named area in the page layout
  sortOrder: 10         // lower numbers render first within the area
};

export default function MyHeader() {
  return <header>...</header>;
}
```

`AreaLoader.js` picks up the `layout` export at build time, groups components by `areaId`, and sorts by `sortOrder`. The export is stripped from the final bundle by `LayoutLoader.js`.

### Overriding core components

Place a same-named file in `src/components/` to override a core component. Webpack's `@components` alias resolves theme files first:

```
src/components/
  common/
    Button.tsx   ← overrides packages/evercamps/src/components/common/Button.tsx
  admin/
    Header.tsx   ← overrides the core admin header
```

After compiling to `dist/components/`, Webpack picks up the theme version automatically — no config change needed.

---

## Phase 1 — Theme metadata standard

**Goal:** Establish the `package.json` + `evercamps` key contract described above. No code changes.

**What to do:**
- Adopt the metadata format for any new theme you write.
- Add `"keywords": ["evercamps-theme"]` and the `evercamps` key to the sample theme at `packages/create-evercamps-app/sample/themes/sample/package.json`.
- Optionally add metadata validation to `getEnabledTheme.ts` (warn on missing fields; do not fail).

**Verify:** Create a minimal theme directory under `themes/`, set `system.theme` in config to its name, start the server, and confirm the theme loads.

---

## Phase 2 — Auto-discovery

**Goal:** Enumerate all themes in `themes/` automatically so an admin UI (Phase 4) can list them without manual config. `system.theme` still controls which theme is active — discovery only provides the list.

**New file:** `packages/evercamps/src/lib/util/discoverThemes.ts`

```typescript
import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../helpers.js';

export interface ThemeMeta {
  name: string;
  path: string;
  displayName: string;
  author: string;
  description: string;
  screenshot: string | null;
  version: string;
  minVersion: string | null;
  supports: string[];
}

export function discoverThemes(): ThemeMeta[] {
  const themesPath = CONSTANTS.THEMEPATH;
  if (!existsSync(themesPath)) return [];

  const themes: ThemeMeta[] = [];

  for (const entry of readdirSync(themesPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const themePath = resolve(themesPath, entry.name);
    const pkgPath = resolve(themePath, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.keywords?.includes('evercamps-theme')) continue;

    const meta = pkg.evercamps ?? {};
    themes.push({
      name: entry.name,
      path: themePath,
      displayName: meta.displayName ?? entry.name,
      author: meta.author ?? '',
      description: meta.description ?? '',
      screenshot: meta.screenshot ? resolve(themePath, meta.screenshot) : null,
      version: pkg.version ?? '0.0.0',
      minVersion: meta.minVersion ?? null,
      supports: meta.supports ?? ['frontStore'],
    });
  }

  return themes;
}
```

**Verify:**
1. Place two theme directories under `themes/`, each with a `package.json` that has `"keywords": ["evercamps-theme"]`
2. Call `discoverThemes()` in a test script — confirm both appear in the returned array

---

## Phase 3 — Database-persisted theme activation

**Goal:** Replace the `system.theme` config-file entry with a DB record so the admin UI can switch themes without touching files.

### 3a — DB migration

Add to `packages/evercamps/src/modules/base/migration/Version-1.0.3.js` (or next unused version):

```javascript
export default async function migrate(connection) {
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS theme (
      theme_id     serial PRIMARY KEY,
      name         varchar NOT NULL UNIQUE,
      version      varchar NOT NULL DEFAULT '0.0.0',
      active       boolean NOT NULL DEFAULT false,
      installed_at timestamptz NOT NULL DEFAULT now(),
      settings     jsonb NOT NULL DEFAULT '{}'
    )
  `);
}
```

Only one row should have `active = true` at a time. Enforce this at the application layer (toggle old active to false before setting new active).

### 3b — Read active theme from DB at startup

In `getEnabledTheme.ts`, after the existing config-file read, check the DB for an active theme record and let it win:

```typescript
import { pool } from '../postgres/connection.js';

export async function getActiveThemeFromDb(): Promise<string | null> {
  const result = await pool.query(
    'SELECT name FROM theme WHERE active = true LIMIT 1'
  );
  return result.rows[0]?.name ?? null;
}
```

Update the startup sequence in `startUp.js` to call `getActiveThemeFromDb()` after the DB connection is established, and use its value as an override to `system.theme`. This is the only startup-sequence change in this phase.

### 3c — Admin API routes

New module `packages/evercamps/src/modules/theme/` with these API endpoints:

```
GET    /admin/api/themes                → list all discovered themes + DB state
POST   /admin/api/themes/:name/activate → set active = true, restart build
```

The activate endpoint:
1. Sets the previous active theme's `active` to `false`
2. Upserts the new theme into the `theme` table with `active = true`
3. Triggers a Webpack rebuild (or graceful server reload if hot-reload is implemented)

**Verify:**
1. `POST /admin/api/themes/my-theme/activate`
2. Restart server — confirm `getEnabledTheme()` returns the newly activated theme
3. `GET /admin/api/themes` — confirm `active: true` on the correct row

---

## Phase 4 — Admin theme management UI

**Goal:** A `themeGrid` admin page that shows all discovered themes as cards with an activate button.

**New module:** `packages/evercamps/src/modules/theme/pages/admin/themeGrid/`

Follows the existing admin page pattern (see `modules/catalog/pages/admin/attributeGrid/` for reference):

- `route.json` — `{ "path": "/themes", "methods": ["GET"] }`
- `index.js` — page entry point
- `ThemeGrid.jsx` — React component, card grid layout

Each card shows:
- Screenshot image (`public/screenshot.png` from the theme, served via `themePublicStatic` or a dedicated static route)
- Display name, author, description, version
- "Active" badge or "Activate" button
- Calls `POST /admin/api/themes/:name/activate` (Phase 3) on click

---

## Phase 5 — Child themes

**Goal:** A theme can extend another theme. Only overridden components and styles need to be in the child — everything else falls through to the parent.

### 5a — Metadata

Declare a parent in `package.json`:

```json
{
  "name": "evercamps-theme-my-child",
  "evercamps": {
    "displayName": "My Child Theme",
    "parent": "my-parent-theme"
  }
}
```

### 5b — Component resolution cascade

In `packages/evercamps/src/lib/webpack/createBaseConfig.js`, extend the `@components` alias array to include the parent's `dist/components` directory between the child and extensions:

```javascript
const theme = getEnabledTheme();

if (theme) {
  alias['@components'] = [resolve(theme.path, 'dist/components')];

  // Child theme support — fall through to parent before extensions
  const parentName = theme.meta?.parent;
  if (parentName) {
    const parentPath = resolve(CONSTANTS.THEMEPATH, parentName);
    alias['@components'].push(resolve(parentPath, 'dist/components'));
  }
}

// Extensions and core follow as before
```

### 5c — Tailwind cascade

In `packages/evercamps/src/lib/webpack/util/getTailwindConfig.js`, load parent's `tailwind.config.js` as the base when a child theme is active, then merge child over parent:

```javascript
const theme = getEnabledTheme();
let tailwindConfig = defaultTailwindConfig;

if (theme?.meta?.parent) {
  const parentConfigPath = join(CONSTANTS.THEMEPATH, theme.meta.parent, 'dist', 'tailwind.config.js');
  if (existsSync(parentConfigPath)) {
    tailwindConfig = Object.assign(tailwindConfig, await import(parentConfigPath));
  }
}

if (theme) {
  const childConfigPath = join(theme.path, 'dist', 'tailwind.config.js');
  if (existsSync(childConfigPath)) {
    tailwindConfig = Object.assign(tailwindConfig, await import(childConfigPath));
  }
}
```

**Verify:**
1. Create a child theme that overrides one component and one Tailwind color
2. Activate the child theme — confirm the override is applied and the parent's remaining components render correctly

---

## Phase 6 — Theme options / settings panel

**Goal:** A theme can declare its own configuration schema. Site admins set these options through a per-theme settings page in the admin, without touching files.

### 6a — Schema registration in theme bootstrap

Add an optional `src/bootstrap.ts` to the theme:

```typescript
import { addProcessor } from '@evercamps/evercamps/lib/util/registry.js';

export default function bootstrap(): void {
  addProcessor('configurationSchema', (schema) => ({
    ...schema,
    properties: {
      ...schema.properties,
      themeConfig: {
        ...schema.properties.themeConfig,
        properties: {
          ...schema.properties.themeConfig.properties,
          heroBackgroundColor: {
            type: 'string',
            title: 'Hero background color',
            default: '#3a3a3a',
          },
          showTestimonials: {
            type: 'boolean',
            title: 'Show testimonials section',
            default: true,
          },
        },
      },
    },
  }));
}
```

The existing `configurationSchema` filter hook in `modules/cms/bootstrap.ts` already drives the admin configuration form — theme options appear there automatically.

### 6b — Persist settings to DB

The `theme.settings` jsonb column added in Phase 3 stores theme-specific overrides. Extend the activate/update API to accept and persist `settings`:

```
PUT /admin/api/themes/:name/settings   → update theme.settings in DB
```

At runtime, merge `theme.settings` from DB into the config (similar to how module config overrides work).

### 6c — Settings page route (optional)

New page `modules/theme/pages/admin/themeSettings/` with:
- `route.json` — `{ "path": "/themes/:name/settings", "methods": ["GET"] }`
- Renders the theme's config schema as a form (reuse the existing configuration form pattern from `modules/setting/`)

---

## Phase 7 — Theme CLI scaffolding (optional)

**Goal:** `npx evercamps create-theme <name>` generates a ready-to-develop theme skeleton.

Add a `create-theme` command to `packages/evercamps/src/bin/evercamps.js`. The generator outputs:

```
evercamps-theme-<name>/
  package.json           ← name, keywords: ['evercamps-theme'], evercamps key
  tsconfig.json          ← mirrors sample/themes/sample/tsconfig.json
  src/
    pages/
      frontStore/
        all/             ← global storefront components
      admin/
        all/             ← global admin components
    components/          ← component overrides
  public/
    screenshot.png       ← placeholder (800×600)
```

---

## Quick-start: creating your first theme

```bash
mkdir themes/my-theme
cd themes/my-theme
npm init -y
```

Edit `package.json`:

```json
{
  "name": "evercamps-theme-my-theme",
  "keywords": ["evercamps-theme"],
  "evercamps": {
    "displayName": "My Theme",
    "author": "You",
    "supports": ["frontStore"]
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ES2020",
    "moduleResolution": "node",
    "jsx": "react",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

Create `src/pages/frontStore/all/SiteBanner.tsx`:

```typescript
export const layout = {
  areaId: 'head',
  sortOrder: 5,
};

export default function SiteBanner() {
  return <div className="site-banner">Welcome to my store</div>;
}
```

Activate the theme via config (or admin UI after Phase 3):

```json
// config/local.json
{
  "system": {
    "theme": "my-theme"
  }
}
```

Compile the theme:

```bash
cd themes/my-theme
npx tsc
```

Start the dev server — `SiteBanner` appears in the `head` area on every storefront page.
