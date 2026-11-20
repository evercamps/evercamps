import { commit, rollback, startTransaction } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { getConnection } from './connection.js';

/**
 * Runs `work` on one connection inside a transaction: committed when it
 * resolves, rolled back (and the error rethrown) when it throws.
 */
export async function inTransaction<T>(work: (connection: PoolClient) => Promise<T>): Promise<T> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const result = await work(connection);
    await commit(connection);
    return result;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
