import { getConnection, PoolClient, select, update } from '@evershop/postgres-query-builder';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import type { AdminUserRow } from '../../types/index.js';

export default async function handler(request: Request, response: Response, next: NextFunction) {
  const { userId } = request.params;
  if (!userId) return response.status(400).json({ error: 'Missing userId' });

  const current: AdminUserRow | null = await select()
    .from('admin_user')
    .where('uuid', '=', userId)
    .load(pool);

  if (!current) return response.status(404).json({ error: 'User not found' });

  const newDeadline = current.twofa_deadline
    ? new Date(current.twofa_deadline)
    : new Date();
  newDeadline.setDate(newDeadline.getDate() + 14);

  try {
    const connection: PoolClient = await getConnection(pool);
    await update('admin_user')
      .given({ twofa_deadline: newDeadline.toISOString() })
      .where('uuid', '=', userId)
      .execute(connection);

    return response.json({ success: true, deadline: newDeadline.toISOString() });
  } catch (err) {
    console.error(err);
    return response.status(500).json({ error: 'Failed to extend 2FA' });
  }
}
