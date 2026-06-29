#!/usr/bin/env tsx
/**
 * Generates a routes.ts manifest per module from existing bracket-named middleware files.
 *
 * Dry-run (prints to stdout):
 *   tsx scripts/generateRouteManifests.ts
 *
 * Write files:
 *   tsx scripts/generateRouteManifests.ts --write
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import Topo from '@hapi/topo';

const MODULES_PATH = resolve('packages/evercamps/src/modules');
const WRITE = process.argv.includes('--write');

// ── Types ─────────────────────────────────────────────────────────────────────

interface MiddlewareEntry {
  id: string;
  after?: string[];
  before?: string[];
}

type Region = 'api' | 'admin' | 'frontStore' | 'global';

interface RouteDefinition {
  routeId: string | string[] | null;
  region: Region;
  path?: string;
  methods?: string[];
  access?: string;
  middleware: MiddlewareEntry[];
}

// ── Filename parsing ───────────────────────────────────────────────────────────
// Replicates the regex logic in lib/middleware/parseFromFile.js

function parseFilename(name: string): MiddlewareEntry | null {
  // Skip non-middleware files: capitalized names (React components) and non-.js
  if (!/\.js$/.test(name) || /^[A-Z]/.test(name)) return null;

  // [after]id[before].js
  if (/^(\[)[a-zA-Z1-9,]+(\])[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\])\.js$/.test(name)) {
    const parts = name.split(/[\[\]]+/);
    return {
      id: parts[2],
      after: parts[1].split(',').filter(Boolean),
      before: parts[3].split(',').filter(Boolean),
    };
  }
  // [after]id.js
  if (/^(\[)[a-zA-Z1-9.,]+(\])[a-zA-Z1-9]+\.js$/.test(name)) {
    const parts = name.split(/[\[\]]+/);
    return {
      id: parts[2].replace(/\.js$/, ''),
      after: parts[1].split(',').filter(Boolean),
    };
  }
  // id[before].js
  if (/^[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\])\.js$/.test(name)) {
    const parts = name.split(/[\[\]]+/);
    return {
      id: parts[0],
      before: parts[1].split(',').filter(Boolean),
    };
  }
  // plain id.js
  return { id: name.replace(/\.js$/, '') };
}

// ── Implicit defaults ──────────────────────────────────────────────────────────
// Replicates parseFromFile.js lines 50-58. Making these explicit in the manifest
// removes the hidden injection from the runtime.

function applyDefaults(entry: MiddlewareEntry, region: Region): MiddlewareEntry {
  if (region === 'api') {
    if (entry.id === 'context' || entry.id === 'apiErrorHandler') return entry;
    return {
      ...entry,
      before: entry.before ?? ['apiResponse'],
      after: entry.after ?? ['escapeHtml'],
    };
  } else {
    if (entry.id === 'context' || entry.id === 'errorHandler') return entry;
    return {
      ...entry,
      before: entry.before ?? ['buildQuery'],
      after: entry.after ?? ['auth'],
    };
  }
}

// ── Topological sort within a route ───────────────────────────────────────────
// Handles intra-route deps (e.g. addItemToCart after detectCurrentCart).
// Entries with only external deps (context, auth, escapeHtml) have no local
// constraint; seeding the sorter alphabetically breaks those ties consistently.

function topoSort(entries: MiddlewareEntry[]): MiddlewareEntry[] {
  const localIds = new Set(entries.map((e) => e.id));
  const byId = new Map(entries.map((e) => [e.id, e]));
  const sorter = new Topo.Sorter<string>();

  for (const entry of [...entries].sort((a, b) => a.id.localeCompare(b.id))) {
    sorter.add(entry.id, {
      before: (entry.before ?? []).filter((id) => localIds.has(id)),
      after: (entry.after ?? []).filter((id) => localIds.has(id)),
      group: entry.id,
    });
  }

  return (sorter.nodes as string[]).map((id) => byId.get(id)!);
}

// ── Directory scanning ─────────────────────────────────────────────────────────

function middlewareFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);
}

function subdirsOf(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}


// ── Collect routes for one module ──────────────────────────────────────────────

function collectRoutes(modulePath: string): RouteDefinition[] {
  const routes: RouteDefinition[] = [];

  // pages/global/ → region: 'global', routeId: null
  const globalDir = resolve(modulePath, 'pages', 'global');
  if (existsSync(globalDir)) {
    const entries = middlewareFilesIn(globalDir)
      .map(parseFilename)
      .filter((e): e is MiddlewareEntry => e !== null)
      .map((e) => applyDefaults(e, 'global'));
    if (entries.length > 0) {
      routes.push({ routeId: null, region: 'global', middleware: topoSort(entries) });
    }
  }

  // pages/admin/ and pages/frontStore/
  for (const scope of ['admin', 'frontStore'] as const) {
    const scopeDir = resolve(modulePath, 'pages', scope);
    if (!existsSync(scopeDir)) continue;

    for (const routeDir of subdirsOf(scopeDir)) {
      const dirPath = resolve(scopeDir, routeDir);

      // 'all' directory → scope-wide middleware (routeId: null within scope)
      const routeId: string | string[] | null =
        routeDir === 'all'
          ? null
          : routeDir.includes('+')
          ? routeDir.split('+').filter(Boolean)
          : routeDir;

      const entries = middlewareFilesIn(dirPath)
        .map(parseFilename)
        .filter((e): e is MiddlewareEntry => e !== null)
        .map((e) => applyDefaults(e, scope));

      if (entries.length > 0) {
        routes.push({ routeId, region: scope, middleware: topoSort(entries) });
      }
    }
  }

  // api/<routeId>/ — 'global' dir maps to routeId: null (app-wide API middleware)
  const apiDir = resolve(modulePath, 'api');
  if (existsSync(apiDir)) {
    for (const routeDir of subdirsOf(apiDir)) {
      const dirPath = resolve(apiDir, routeDir);
      const routeId = routeDir === 'global' ? null : routeDir;
      const entries = middlewareFilesIn(dirPath)
        .map(parseFilename)
        .filter((e): e is MiddlewareEntry => e !== null)
        .map((e) => applyDefaults(e, 'api'));

      if (entries.length > 0) {
        const routeDef: RouteDefinition = { routeId, region: 'api', middleware: topoSort(entries) };

        if (routeId !== null) {
          const routeJsonPath = resolve(dirPath, 'route.json');
          if (existsSync(routeJsonPath)) {
            const routeJson = JSON.parse(readFileSync(routeJsonPath, 'utf8'));
            if (routeJson.path) routeDef.path = routeJson.path;
            if (routeJson.methods?.length) routeDef.methods = routeJson.methods.map((m: string) => m.toUpperCase());
            if (routeJson.access && routeJson.access !== 'private') routeDef.access = routeJson.access;
          }
        }

        routes.push(routeDef);
      }
    }
  }

  return routes;
}

// ── Code generation ────────────────────────────────────────────────────────────

function renderEntry(entry: MiddlewareEntry): string {
  const parts: string[] = [`id: '${entry.id}'`];
  if (entry.after?.length) parts.push(`after: [${entry.after.map((s) => `'${s}'`).join(', ')}]`);
  if (entry.before?.length) parts.push(`before: [${entry.before.map((s) => `'${s}'`).join(', ')}]`);
  return `      { ${parts.join(', ')} }`;
}

function renderRouteId(routeId: string | string[] | null): string {
  if (routeId === null) return 'null';
  if (Array.isArray(routeId)) return `[${routeId.map((r) => `'${r}'`).join(', ')}]`;
  return `'${routeId}'`;
}

function generateManifest(routes: RouteDefinition[]): string {
  if (routes.length === 0) return '';

  const blocks = routes.map((route) => {
    const entries = route.middleware.map(renderEntry).join(',\n');
    let block =
      `  {\n` +
      `    routeId: ${renderRouteId(route.routeId)},\n` +
      `    region: '${route.region}',\n`;
    if (route.path) block += `    path: '${route.path}',\n`;
    if (route.methods?.length) block += `    methods: [${route.methods.map((m) => `'${m}'`).join(', ')}],\n`;
    if (route.access) block += `    access: '${route.access}',\n`;
    block += `    middleware: [\n${entries},\n    ],\n  }`;
    return block;
  });

  return (
    `import type { RouteDefinition } from '../../lib/middleware/types.js';\n\n` +
    `export const routes: RouteDefinition[] = [\n` +
    blocks.join(',\n\n') +
    `\n];\n`
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const modules = subdirsOf(MODULES_PATH);

for (const mod of modules) {
  const modulePath = resolve(MODULES_PATH, mod);
  const routes = collectRoutes(modulePath);

  if (routes.length === 0) continue;

  const content = generateManifest(routes);
  const outPath = resolve(modulePath, 'api', 'routes.ts');

  if (WRITE) {
    writeFileSync(outPath, content, 'utf8');
    console.log(`wrote ${outPath}`);
  } else {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`// ${mod}/routes.ts`);
    console.log('─'.repeat(60));
    console.log(content);
  }
}
