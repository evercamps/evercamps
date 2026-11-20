// Runs jest with the environment it needs, on any shell (PowerShell, cmd,
// bash): `npm test` and `npm run test:db`. Extra arguments go to jest, e.g.
// `npm test -- core/modules/email` or `npm run test:db -- variantRules`.
//
// --db: run only the database tests (core/modules/*/tests/db) and turn them
// on. They use the Postgres from .env.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const db = args[0] === '--db';
if (db) args.shift();

const env = {
  ...process.env,
  ALLOW_CONFIG_MUTATIONS: 'true',
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--experimental-vm-modules'].filter(Boolean).join(' ')
};
if (db) {
  env.RUN_DB_TESTS = '1';
  // Positional jest arguments are path regexes; this one selects tests/db.
  args.unshift('tests[\\\\/]db');
}

const result = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', ...args], {
  stdio: 'inherit',
  env
});
process.exit(result.status ?? 1);
