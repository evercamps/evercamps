// A plugin under content/plugins/* sits outside the root TypeScript project
// (core/ + includes/) and can't import their .ts sources directly; it reaches
// the already-compiled root dist/ instead. Centralized here so the rest of
// the plugin does a plain relative import of this module (same pattern as
// woocommerce-import/src/core.ts).
export { pool, getConnection } from '../../../../dist/lib/postgres/connection.js';
export { addProcessor } from '../../../../dist/lib/util/registry.js';
export { hookAfter, hookBefore } from '../../../../dist/lib/util/hookable.js';
export { getSetting } from '../../../../dist/modules/setting/services/setting.js';
export { buildUrl } from '../../../../dist/lib/router/buildUrl.js';
export { setContextValue } from '../../../../dist/modules/graphql/services/contextHelper.js';
export { debug, error } from '../../../../dist/lib/log/logger.js';
